const { default: mongoose } = require("mongoose");
const ClinicAdmin = require("../models/clinicAdmin");
const Doctor = require("../models/doctor");
const Appointment = require("../models/appointments");
const Clinic = require("../models/clinic");
const { validDays } = require("../utils/constants");
const LabTest = require("../models/labTest");
const LabTestAppointment = require("../models/labTestAppointment");
const AdminCommission = require("../models/adminCommission");

exports.createClinicAdmin = async (req, res) => {
  try {
    let { fullName, email, password, address, phoneNumber } = req.body;
    if (!fullName || !email || !password) {
      return res.status(400).json({ message: "All fields are required." });
    }

    email = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: "Invalid email format." });
    }

    const existingUser = await ClinicAdmin.findOne({ email });
    if (existingUser) {
      return res
        .status(409)
        .json({ message: "User already exists with this email." });
    }

    const phoneRegex = /^\+[1-9]\d{0,3}\d{10}$/;
    phoneNumber = phoneNumber.trim();
    if (!phoneRegex.test(phoneNumber)) {
      return res.status(400).json({ message: "Invalid phone number format." });
    }

    const clinicAdmin = new ClinicAdmin({
      fullName,
      email,
      password,
      address,
      phoneNumber,
      clinicId: req.user.clinicId,
    });

    await clinicAdmin.save();
    const userObject = clinicAdmin.toObject();
    delete userObject.password;
    res.status(201).json({
      message: "Clinic admin created successfully",
      user: userObject,
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
};

exports.getAllClinicAdmins = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit);
    const skip = (page - 1) * limit;

    const totalUsers = await ClinicAdmin.countDocuments({
      clinicId: req.user.clinicId,
    });
    const totalPages = Math.ceil(totalUsers / limit);

    const clinicAdmins = await ClinicAdmin.find({
      clinicId: req.user.clinicId,
    })
      .select("-password")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    res.status(200).json({ users: clinicAdmins, totalPages: totalPages || 1 });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
};

exports.getClinicAdminById = async (req, res) => {
  try {
    const clinicAdmin = await ClinicAdmin.findOne({
      _id: req.params.userId,
      clinicId: req.user.clinicId,
    });

    if (!clinicAdmin) {
      return res.status(404).json({ message: "Clinic admin not found" });
    }

    const userObject = clinicAdmin.toObject();
    delete userObject.password;

    res.status(200).json({ user: userObject });
  } catch (error) {
    console.log(error);
    res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
};

exports.updateClinicAdmin = async (req, res) => {
  try {
    let { fullName, email, address, phoneNumber } = req.body;

    const user = await ClinicAdmin.findOne({
      _id: req.params.userId,
      clinicId: req.user.clinicId,
    });

    if (email) {
      email = email.trim().toLowerCase();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ message: "Invalid email format." });
      }
      if (email !== user.email) {
        const existingUser = await ClinicAdmin.findOne({ email });
        if (existingUser) {
          return res.status(400).json({ message: "Email already in use." });
        }
        user.email = email;
      }
    }

    if (phoneNumber) {
      phoneNumber = phoneNumber.trim();
      const phoneRegex = /^\+[1-9]\d{0,3}\d{10}$/;
      if (!phoneRegex.test(phoneNumber)) {
        return res
          .status(400)
          .json({ message: "Invalid phone number format." });
      }
      user.phoneNumber = phoneNumber;
    }
    if (fullName) {
      user.fullName = fullName;
    }
    if (address) {
      user.address = address;
    }
    await user.save();

    const userObject = user.toObject();
    delete userObject.password;

    res
      .status(200)
      .json({ message: "Clinic admin updated successfully", user: userObject });
  } catch (error) {
    console.log(error);
    res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
};

exports.updateClinicDetails = async (req, res) => {
  try {
    let {
      name,
      email,
      addressOne,
      addressTwo,
      city,
      state,
      pincode,
      phoneNumber,
      latitude,
      longitude,
    } = req.body;

    const clinic = await Clinic.findById(req.user.clinicId);
    if (!clinic) {
      return res.status(404).json({ message: "Clinic not found" });
    }

    if ((latitude && isNaN(latitude)) || (longitude && isNaN(longitude))) {
      return res
        .status(400)
        .json({ message: "latitude and latitude must be a number" });
    }

    if (email) {
      email = email.trim().toLowerCase();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ message: "Invalid email format." });
      }
      if (email !== clinic.email) {
        const existingClinic = await Clinic.findOne({ email });
        if (existingClinic) {
          return res.status(400).json({ message: "Email already in use." });
        }
        clinic.email = email;
      }
    }

    if (phoneNumber) {
      phoneNumber = phoneNumber.trim();
      const phoneRegex = /^\+[1-9]\d{0,3}\d{10}$/;
      if (!phoneRegex.test(phoneNumber)) {
        return res
          .status(400)
          .json({ message: "Invalid phone number format." });
      }
      clinic.phoneNumber = phoneNumber;
    }
    if (name) {
      clinic.name = name;
    }

    if (addressOne) {
      clinic.addressOne = addressOne;
    }

    if (addressTwo) {
      clinic.addressTwo = addressTwo;
    }

    if (city) {
      clinic.city = city;
    }

    if (state) {
      clinic.state = state;
    }

    if (pincode) {
      if (isNaN(pincode)) {
        return res.status(400).json({ message: "Pincode must be a number" });
      }
      pincode = parseInt(pincode);
      clinic.pincode = pincode;
    }

    if (latitude) {
      clinic.latitude = latitude;
    }
    if (longitude) {
      clinic.longitude = longitude;
    }

    await clinic.save();

    res
      .status(200)
      .json({ message: "Clinic details updated successfully", clinic });
  } catch (error) {
    console.log(error);
    res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
};
exports.deleteClinicAdmin = async (req, res) => {
  try {
    if (req.user._id === req.params.userId) {
      return res
        .status(400)
        .json({ message: "You cannot delete this account." });
    }

    const clinicAdmin = await ClinicAdmin.findOneAndDelete({
      _id: req.params.userId,
      clinicId: req.user.clinicId,
    });

    if (!clinicAdmin) {
      return res.status(404).json({ message: "Clinic admin not found" });
    }

    res.status(200).json({ message: "Clinic user deleted successfully" });
  } catch (error) {
    console.log(error);
    res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
};

exports.getClinicDetails = async (req, res) => {
  try {
    const clinicId = req.user.clinicId;
    const clinic = await Clinic.findById(clinicId);
    if (!clinic) {
      return res.status(404).json({ message: "Clinic not found" });
    }

    return res.status(200).json({ clinicDetails: clinic });
  } catch (error) {
    console.log(error);
    res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
};

exports.getDoctorByRegistrationNumber = async (req, res) => {
  try {
    const registrationNumber = req.params.registrationNumber;
    if (!registrationNumber) {
      return res
        .status(400)
        .json({ message: "Registration number is required" });
    }

    const doctor = await Doctor.findOne({
      registrationNumber: registrationNumber,
    });

    if (doctor && doctor.clinics.includes(req.user.clinicId)) {
      return res.status(200).json({ message: "Doctor is already registered." });
    }

    return res.status(200).json({ doctor: { ...doctor } });
  } catch (error) {
    console.log(error);
    res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
};

exports.createDoctor = async (req, res) => {
  try {
    let {
      fullName,
      email,
      specialization,
      qualification,
      experience,
      registrationNumber,
      fee,
      phoneNumber,
      appointmentsSchedule,
    } = req.body;

    const clinicId = req.user.clinicId;

    if (
      !fullName ||
      !email ||
      !specialization ||
      !registrationNumber ||
      isNaN(fee) ||
      !qualification ||
      isNaN(experience)
    ) {
      return res
        .status(400)
        .json({ message: "All required fields must be filled." });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim().toLowerCase())) {
      return res.status(400).json({ message: "Invalid email format." });
    }

    const phoneRegex = /^\+[1-9]\d{0,3}\d{10}$/;
    if (phoneNumber && !phoneRegex.test(phoneNumber.trim())) {
      return res.status(400).json({ message: "Invalid phone number format." });
    }

    if (appointmentsSchedule) {
      const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

      for (const schedule of appointmentsSchedule) {
        const { day, startTime, endTime, maxSlots } = schedule;
        if (!day || !startTime || !endTime || isNaN(maxSlots)) {
          return res.status(400).json({
            message:
              "Each schedule must include day, startTime, endTime and maxSlots.",
          });
        }
        if (!validDays.includes(day)) {
          return res.status(400).json({ message: `Invalid day: ${day}` });
        }
        if (!timeRegex.test(startTime) || !timeRegex.test(endTime)) {
          return res.status(400).json({
            message: `Time should be in 24-hour format (HH:MM) for ${day}`,
          });
        }
      }
    }

    let doctor = await Doctor.findOne({ registrationNumber });

    if (doctor && doctor.clinics.includes(clinicId)) {
      return res
        .status(400)
        .json({ message: "Doctor already exists in this clinic." });
    }

    if (doctor) {
      if (appointmentsSchedule) {
        const timeToMinutes = (time) => {
          const [hours, minutes] = time.split(":").map(Number);
          return hours * 60 + minutes;
        };

        for (const { day, startTime, endTime } of appointmentsSchedule) {
          const startMinutes = timeToMinutes(startTime);
          const endMinutes = timeToMinutes(endTime);

          for (const clinic of doctor.appointmentsSchedule) {
            if (clinic.clinicId.toString() !== clinicId.toString()) {
              const conflictingSchedule = clinic.schedule.find(
                (appointment) => {
                  if (appointment.day === day) {
                    const appointmentStart = timeToMinutes(
                      appointment.startTime
                    );
                    const appointmentEnd = timeToMinutes(appointment.endTime);
                    return (
                      (startMinutes >= appointmentStart &&
                        startMinutes < appointmentEnd) ||
                      (endMinutes > appointmentStart &&
                        endMinutes <= appointmentEnd) ||
                      (startMinutes <= appointmentStart &&
                        endMinutes >= appointmentEnd)
                    );
                  }
                  return false;
                }
              );

              if (conflictingSchedule) {
                return res.status(400).json({
                  message: `Time conflict: Doctor is already scheduled at another clinic on ${day} from ${conflictingSchedule.startTime} to ${conflictingSchedule.endTime}.`,
                });
              }
            }
          }
        }
      }
      fee = parseInt(fee);
      console.log(fee);
      doctor.fees.push({ clinicId, fee });

      if (!doctor.clinics.includes(clinicId)) {
        doctor.clinics.push(clinicId);
        if (appointmentsSchedule) {
          doctor.appointmentsSchedule.push({
            clinicId,
            schedule: appointmentsSchedule,
          });
        }
        await doctor.save();
      }

      return res.status(200).json({
        message: "Doctor added successfully.",
        doctor: doctor,
      });
    }

    doctor = new Doctor({
      fullName,
      email: email,
      specialization,
      experience: experience || 0,
      medicalDegree: qualification,
      registrationNumber,
      fees: [{ clinicId, fee }],
      phoneNumber,
      clinics: [clinicId],
      appointmentsSchedule: appointmentsSchedule
        ? [{ clinicId, schedule: appointmentsSchedule }]
        : [],
    });

    await doctor.save();
    res.status(201).json({ message: "Doctor created successfully", doctor });
  } catch (error) {
    console.log(error);
    res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
};

exports.getAllDoctorsByClinic = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit);
    const skip = (page - 1) * limit;

    const totalDoctors = await Doctor.countDocuments({
      clinics: req.user.clinicId,
    });
    const totalPages = Math.ceil(totalDoctors / limit);

    const doctors = await Doctor.find({ clinics: req.user.clinicId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select("-__v");

    res.status(200).json({ doctors, totalPages: totalPages || 1 });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
};

exports.getDoctorById = async (req, res) => {
  try {
    const doctor = await Doctor.findOne({
      _id: req.params.doctorId,
      clinics: req.user.clinicId,
    });

    if (!doctor) {
      return res.status(404).json({ message: "Doctor not found" });
    }

    // Filter the schedule to include only the current clinic's schedule
    const currentClinicSchedule = doctor.appointmentsSchedule.find(
      (schedule) =>
        schedule.clinicId.toString() === req.user.clinicId.toString()
    );

    const fee = doctor.fees.find(
      (fee) => fee.clinicId.toString() === req.user.clinicId.toString()
    );

    res.status(200).json({
      ...doctor.toObject(),
      appointmentsSchedule: currentClinicSchedule,
      fees: fee,
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
};

exports.updateDoctor = async (req, res) => {
  try {
    let {
      fullName,
      email,
      specialization,
      experience,
      qualification,
      phoneNumber,
      fee,
      appointmentsSchedule,
    } = req.body;

    let doctor = await Doctor.findOne({
      _id: req.params.doctorId,
      clinics: { $in: [req.user.clinicId] },
    });

    if (!doctor) {
      return res.status(404).json({ message: "Doctor not found" });
    }

    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        return res.status(400).json({ message: "Invalid email format." });
      }
    }

    if (email && email !== doctor.email) {
      doctor.email = email.trim().toLowerCase();
    }

    if (phoneNumber) {
      const phoneRegex = /^\+[1-9]\d{0,3}\d{10}$/;
      phoneNumber = phoneNumber.trim();
      if (!phoneRegex.test(phoneNumber.trim())) {
        return res
          .status(400)
          .json({ message: "Invalid phone number format." });
      }
      doctor.phoneNumber = phoneNumber;
    }

    if (fullName) doctor.fullName = fullName;
    if (specialization) doctor.specialization = specialization;
    if (qualification) doctor.medicalDegree = qualification;
    if (experience) {
      if (isNaN(experience)) {
        return res
          .status(400)
          .json({ message: "Experience must be a number." });
      }

      experience = parseInt(experience);
      doctor.experience = experience;
    }

    let fees;
    if (fee) {
      fee = parseInt(fee);

      fees = doctor.fees.find(
        (fee) => fee.clinicId.toString() === req.user.clinicId.toString()
      );
      fees.fee = fee;
    }

    if (appointmentsSchedule) {
      const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

      const timeToMinutes = (time) => {
        const [hours, minutes] = time.split(":").map(Number);
        return hours * 60 + minutes;
      };

      for (const {
        day,
        startTime,
        endTime,
        maxSlots,
      } of appointmentsSchedule) {
        if (!day || !startTime || !endTime || isNaN(maxSlots)) {
          return res.status(400).json({
            message:
              "Each schedule must include day, startTime, endTime and maxSlots are required.",
          });
        }
        if (!validDays.includes(day)) {
          return res.status(400).json({ message: `Invalid day: ${day}` });
        }
        if (!timeRegex.test(startTime) || !timeRegex.test(endTime)) {
          return res.status(400).json({
            message: `Time should be in 24-hour format (HH:MM) for ${day}`,
          });
        }

        const startMinutes = timeToMinutes(startTime);
        const endMinutes = timeToMinutes(endTime);

        for (const clinic of doctor.appointmentsSchedule) {
          if (clinic.clinicId.toString() !== req.user.clinicId.toString()) {
            const conflictingSchedule = clinic.schedule.find((appointment) => {
              if (appointment.day === day) {
                const appointmentStart = timeToMinutes(appointment.startTime);
                const appointmentEnd = timeToMinutes(appointment.endTime);
                return (
                  (startMinutes >= appointmentStart &&
                    startMinutes < appointmentEnd) ||
                  (endMinutes > appointmentStart &&
                    endMinutes <= appointmentEnd) ||
                  (startMinutes <= appointmentStart &&
                    endMinutes >= appointmentEnd)
                );
              }
              return false;
            });

            if (conflictingSchedule) {
              return res.status(400).json({
                message: `Time conflict: Doctor is already scheduled at another clinic on ${day} from ${conflictingSchedule.startTime} to ${conflictingSchedule.endTime}.`,
              });
            }
          }
        }
      }

      let clinicSchedule = doctor.appointmentsSchedule.find(
        (schedule) =>
          schedule.clinicId.toString() === req.user.clinicId.toString()
      );

      if (clinicSchedule) {
        clinicSchedule.schedule = appointmentsSchedule;
      } else {
        doctor.appointmentsSchedule.push({
          clinicId: req.user.clinicId,
          schedule: appointmentsSchedule,
        });
      }
    }

    await doctor.save();

    // Filter the schedule to include only the current clinic's schedule
    const currentClinicSchedule = doctor.appointmentsSchedule.find(
      (schedule) =>
        schedule.clinicId.toString() === req.user.clinicId.toString()
    );

    res.status(200).json({
      message: "Doctor updated successfully",
      doctor: {
        ...doctor.toObject(),
        fees,
        appointmentsSchedule: currentClinicSchedule,
      },
    });
  } catch (error) {
    console.log(error);
    res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
};

exports.deleteDoctor = async (req, res) => {
  try {
    let doctor = await Doctor.findOne({
      _id: req.params.doctorId,
      clinics: req.user.clinicId,
    });

    if (!doctor) {
      return res.status(404).json({ message: "Doctor not found" });
    }

    if (doctor.clinics.length > 1) {
      await Doctor.updateOne(
        { _id: doctor._id },
        {
          $pull: {
            clinics: req.user.clinicId,
            appointmentsSchedule: { clinicId: req.user.clinicId },
            fees: { clinicId: req.user.clinicId },
          },
        }
      );
    } else {
      // If it's the only clinic, delete the entire doctor record
      await Doctor.deleteOne({ _id: doctor._id });
    }

    res.status(200).json({ message: "Doctor deleted successfully" });
  } catch (error) {
    console.log(error);
    res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
};

exports.deleteDaySchedule = async (req, res) => {
  try {
    const { scheduledId, doctorId } = req.body;
    const clinicId = req.user.clinicId;

    if (!scheduledId || !doctorId) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const doctor = await Doctor.findOne({ _id: doctorId, clinics: clinicId });
    if (!doctor) {
      return res.status(404).json({ message: "Doctor not found" });
    }

    const clinicSchedule = doctor.appointmentsSchedule.find(
      (schedule) => schedule.clinicId.toString() === clinicId.toString()
    );

    if (!clinicSchedule) {
      return res.status(404).json({ message: "Clinic schedule not found" });
    }

    const scheduleIndex = clinicSchedule.schedule.findIndex(
      (appointment) => appointment._id.toString() === scheduledId.toString()
    );

    if (scheduleIndex === -1) {
      return res
        .status(404)
        .json({ message: "Appointment scheduled not found" });
    }

    clinicSchedule.schedule.splice(scheduleIndex, 1);

    if (clinicSchedule.schedule.length === 0) {
      doctor.appointmentsSchedule = doctor.appointmentsSchedule.filter(
        (schedule) => schedule.clinicId.toString() !== clinicId.toString()
      );
    }

    await doctor.save();

    res.status(200).json({
      message: "Clinic appointment schedule deleted successfully",
      appointmentsSchedule: doctor.appointmentsSchedule,
    });
  } catch (error) {
    console.log(error);
    res
      .status(500)
      .json({ message: "Internal server error: ", error: error.message });
  }
};

exports.editDaySchedule = async (req, res) => {
  try {
    const { scheduleId, doctorId, day, startTime, endTime } = req.body;
    const clinicId = req.user.clinicId;

    // Ensure doctorId and scheduleId are provided
    if (!scheduleId || !doctorId) {
      return res
        .status(400)
        .json({ message: "doctorId and scheduleId are required" });
    }

    // Find doctor in the specified clinic
    const doctor = await Doctor.findOne({ _id: doctorId, clinics: clinicId });
    if (!doctor) {
      return res.status(404).json({ message: "Doctor not found" });
    }

    // Locate the clinic's schedule within the doctor's appointmentsSchedule
    const clinicSchedule = doctor.appointmentsSchedule.find(
      (schedule) => schedule.clinicId.toString() === clinicId.toString()
    );

    if (!clinicSchedule) {
      return res.status(404).json({ message: "Clinic schedule not found" });
    }

    // Find the specific schedule using scheduleId
    const schedule = clinicSchedule.schedule.find(
      (appointment) => appointment._id.toString() === scheduleId.toString()
    );

    if (!schedule) {
      return res
        .status(404)
        .json({ message: "Appointment schedule not found" });
    }

    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

    const timeToMinutes = (time) => {
      const [hours, minutes] = time.split(":").map(Number);
      return hours * 60 + minutes;
    };

    // Handle optional fields for time conflict and update only if provided
    if (day || startTime || endTime) {
      if (startTime && !timeRegex.test(startTime)) {
        return res
          .status(400)
          .json({ message: "Invalid startTime format, should be HH:MM" });
      }
      if (endTime && !timeRegex.test(endTime)) {
        return res
          .status(400)
          .json({ message: "Invalid endTime format, should be HH:MM" });
      }

      const startMinutes = startTime ? timeToMinutes(startTime) : null;
      const endMinutes = endTime ? timeToMinutes(endTime) : null;

      for (const clinic of doctor.appointmentsSchedule) {
        if (clinic.clinicId.toString() !== clinicId.toString()) {
          const conflictingSchedule = clinic.schedule.find((appointment) => {
            if (appointment.day === day) {
              const appointmentStart = timeToMinutes(appointment.startTime);
              const appointmentEnd = timeToMinutes(appointment.endTime);
              return (
                (startMinutes !== null &&
                  endMinutes !== null &&
                  ((startMinutes >= appointmentStart &&
                    startMinutes < appointmentEnd) ||
                    (endMinutes > appointmentStart &&
                      endMinutes <= appointmentEnd) ||
                    (startMinutes <= appointmentStart &&
                      endMinutes >= appointmentEnd))) ||
                (day && appointment.day === day)
              );
            }
            return false;
          });

          if (conflictingSchedule) {
            return res.status(400).json({
              message: `Time conflict: Doctor is already scheduled at another clinic on ${day} from ${conflictingSchedule.startTime} to ${conflictingSchedule.endTime}.`,
            });
          }
        }
      }

      // Update schedule fields if provided
      if (day) schedule.day = day;
      if (startTime) schedule.startTime = startTime;
      if (endTime) schedule.endTime = endTime;
    }

    // Save updated schedule
    await doctor.save();

    res.status(200).json({
      message: "Clinic appointment schedule updated successfully",
      appointmentsSchedule: doctor.appointmentsSchedule,
    });
  } catch (error) {
    console.log(error);
    res
      .status(500)
      .json({ message: "Internal server error", error: error.message });
  }
};

exports.getAllAppointmentsClinic = async (req, res) => {
  try {
    const clinicId = req.user.clinicId;

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit);
    const skip = (page - 1) * limit;

    const totalAppointments = await Appointment.countDocuments({ clinicId });
    const totalPages = Math.ceil(totalAppointments / limit);

    const appointments = await Appointment.find({ clinicId })
      .select(
        "-__v -totalAmount -amountPaid -paymentId -orderId -paymentMethod"
      )
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    return res.status(200).json({
      appointments: appointments || [],
      totalPages: totalPages || 1,
    });
  } catch (error) {
    console.log(error);
    res
      .status(500)
      .json({ message: "Internal server error", error: error.message });
  }
};

exports.createLabTest = async (req, res) => {
  try {
    const { clinicId } = req.user;
    let { name, description, price } = req.body;
    if (!name || !description || isNaN(price)) {
      return res.status(400).json({ message: "All fields are required" });
    }

    price = Number(price);

    const labTest = new LabTest({
      name,
      description,
      price,
      clinicId,
    });

    await labTest.save();
    res.status(201).json({ message: "Lab Test created successfully", labTest });
  } catch (error) {
    console.log("Error creating lab test:", error);
    res
      .status(400)
      .json({ message: "Internal Server Error", error: error.message });
  }
};

exports.getAllLabTests = async (req, res) => {
  try {
    const { clinicId } = req.user;
    let { page, limit } = req.query;

    page = parseInt(page) || 1;
    limit = parseInt(limit);

    const skip = (page - 1) * limit || 0;
    const totalLabTests = await LabTest.countDocuments({ clinicId });
    const totalPages = Math.ceil(totalLabTests / limit) || 1;

    const labTests = await LabTest.find({ clinicId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    res.status(200).json({ labTests, totalPages: totalPages || 1 });
  } catch (error) {
    console.log("Error getting lab tests:", error);
    res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
};

exports.getLabTestById = async (req, res) => {
  try {
    const { labTestId } = req.params;
    const { clinicId } = req.user;
    const labTest = await LabTest.findOne({ _id: labTestId, clinicId });
    if (!labTest) {
      return res.status(404).json({ message: "Lab Test not found" });
    }
    res.status(200).json(labTest);
  } catch (error) {
    console.log("Error getting lab test:", error);
    res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
};

exports.updateLabTest = async (req, res) => {
  try {
    const { labTestId } = req.params;
    const { clinicId } = req.user;
    let { name, description, price } = req.body;

    price = Number(price);

    const labTest = await LabTest.findOneAndUpdate(
      { _id: labTestId, clinicId },
      { $set: { name, description, price } },
      { new: true }
    );

    if (!labTest) {
      return res.status(404).json({ message: "Lab Test not found" });
    }
    res.status(200).json({ message: "Lab Test updated successfully", labTest });
  } catch (error) {
    console.log(error);
    res
      .status(400)
      .json({ message: "Internal Server Error", error: error.message });
  }
};

exports.deleteLabTest = async (req, res) => {
  try {
    const { labTestId } = req.params;
    const { clinicId } = req.user;
    const labTest = await LabTest.findOneAndDelete({
      _id: labTestId,
      clinicId,
    });
    if (!labTest) {
      return res.status(404).json({ message: "Lab Test not found" });
    }
    res.status(200).json({ message: "Lab Test deleted successfully" });
  } catch (error) {
    console.log("Error deleting lab test:", error);
    res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
};

exports.getAllLabTestAppointments = async (req, res) => {
  try {
    const { clinicId } = req.user;
    let { page, limit } = req.query;
    page = parseInt(page) || 1;
    limit = parseInt(limit);
    const skip = (page - 1) * limit || 0;
    const totalAppointments = await LabTestAppointment.countDocuments({
      clinicId,
    });
    const totalPages = Math.ceil(totalAppointments / limit);
    const appointments = await LabTestAppointment.find({
      clinicId,
    })
      .select("-__v")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    res.status(200).json({ appointments, totalPages: totalPages || 1 });
  } catch (error) {
    console.log(error);
    res
      .status(500)
      .json({ message: "Internal server error", error: error.message });
  }
};

exports.verifyClinicByAdmin = async (req, res) => {
  try {
    const { clinicId } = req.params;
    const clinic = await Clinic.findOneAndUpdate(
      { _id: clinicId },
      { $set: { isVerified: true } }
    );
    if (!clinic) {
      return res.status(404).json({ message: "Clinic not found" });
    }
    res.status(200).json({ message: "Clinic verified successfully" });
  } catch (error) {
    console.log(error);
    res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
};

exports.getAllSpecializations = async (req, res) => {
  try {
    const specializations = await AdminCommission.findOne({}).select(
      "specializations"
    );
    res.status(200).json({ specializations: specializations.specializations });
  } catch (error) {
    console.log("Error getting specializations:", error);
    res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
};
