const Doctor = require("../models/doctor");
const Appointment = require("../models/appointments");
const Clinic = require("../models/clinic");
const { genders } = require("../utils/constants");
const { razorpayInstance } = require("../utils/razorpay");
const {
  validateWebhookSignature,
} = require("razorpay/dist/utils/razorpay-utils");
const AdminCommission = require("../models/adminCommission");
const LabTest = require("../models/labTest");
const LabTestAppointment = require("../models/labTestAppointment");
const labTest = require("../models/labTest");
const { transporter } = require("../utils/mailService");

exports.getAllDoctors = async (req, res) => {
  try {
    const platform = await AdminCommission.findOne({});
    const platformFee = platform ? platform?.platFormFee : 1;

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit);
    const skip = (page - 1) * limit;

    const totalDoctors = await Doctor.countDocuments();
    const totalPages = Math.ceil(totalDoctors / limit);

    const doctors = await Doctor.find()
      .populate("clinics", "name address phoneNumber email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select("-__v");

    res.status(200).json({ doctors, platformFee, totalPages: totalPages || 1 });
  } catch (error) {
    console.log(error);
    res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
};

exports.getDoctorByIdOnly = async (req, res) => {
  try {
    const doctor = await Doctor.findOne({
      _id: req.params.doctorId,
    });

    if (!doctor) {
      return res.status(404).json({ message: "Doctor not found" });
    }

    res.status(200).json({ doctor });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
};

exports.createAppointment = async (req, res) => {
  try {
    let {
      doctorId,
      scheduledId,
      fullName,
      phoneNumber,
      age,
      gender,
      healthInsured,
      clinicId,
      billingAddress,
      termsAccepted,
      appointmentDate,
    } = req.body;

    if (
      !doctorId ||
      !scheduledId ||
      !fullName ||
      !phoneNumber ||
      !age ||
      !gender ||
      !clinicId ||
      !appointmentDate
    ) {
      return res
        .status(400)
        .json({ message: "All required fields must be filled" });
    }

    const validDateRegex =
      /^(0[1-9]|[12][0-9]|3[01])-(0[1-9]|1[0-2])-(19|20)\d{2}$/;

    if (!validDateRegex.test(appointmentDate)) {
      return res
        .status(400)
        .json({ message: "Invalid date format. Accepted format: dd-mm-yyyy" });
    }

    if (
      typeof termsAccepted !== "boolean" ||
      typeof healthInsured !== "boolean"
    ) {
      return res.status(400).json({
        message: "Terms and conditions and health insurance are required",
      });
    }

    if (!termsAccepted) {
      return res.status(400).json({
        message: "Please accept the terms and conditions",
      });
    }

    const clinic = await Clinic.findById(clinicId);
    if (!clinic) {
      return res.status(404).json({ message: "Clinic not found" });
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
        .json({ message: "Appointment schedule not found" });
    }

    const appointmentDay = clinicSchedule.schedule[scheduleIndex].day;
    const appointmentTimeFrom =
      clinicSchedule.schedule[scheduleIndex].startTime;
    const appointmentTimeTo = clinicSchedule.schedule[scheduleIndex].endTime;
    const maxSlots = clinicSchedule.schedule[scheduleIndex].maxSlots;

    const bookedSlot = await Appointment.countDocuments({
      clinicId,
      doctor: doctorId,
      appointmentDate,
      appointmentTimeFrom,
      appointmentTimeTo,
    });

    if (bookedSlot >= maxSlots) {
      return res.status(400).json({
        message:
          "Maximum limit for appointment reached. Please choose another date or time available.",
      });
    }

    gender = gender.toLowerCase();
    if (!genders.includes(gender)) {
      return res.status(400).json({ message: "Invalid gender" });
    }

    const platForm = await AdminCommission.findOne({});
    const platFormFee = platForm?.platFormFee || 1;

    const metadata = {
      userId: req.user._id,
      appointmentDate,
      doctorId,
      appointmentDay,
      appointmentTimeFrom,
      appointmentTimeTo,
      fullName,
      phoneNumber,
      age,
      gender,
      healthInsured,
      clinicId,
      billingAddress,
      termsAccepted,
    };

    // Create Razorpay order
    const options = {
      amount: platFormFee * 100,
      currency: "INR",
      receipt: `receipt_${req?.user?._id}`,
      payment_capture: 1, // Auto capture the payment
      notes: metadata,
    };

    const order = await razorpayInstance.orders.create(options);

    // Send response with payment link (Razorpay hosted page)
    res.status(200).json({
      order_id: order.id,
      amount: platFormFee * 100,
      key_id: process.env.RAZORPAY_KEY_ID,
      user: req?.user._id,
    });
  } catch (error) {
    console.log(error);
    res
      .status(500)
      .json({ message: "Internal server error", error: error.message });
  }
};

exports.appointmentWebhook = async (req, res) => {
  try {
    const signature = req.headers["x-razorpay-signature"];
    const isValid = validateWebhookSignature(
      JSON.stringify(req.body),
      signature,
      process.env.RAZORPAY_WEBHOOK_SECRET
    );
    console.log("IsValid", isValid);
    if (isValid) {
      const { event, payload } = req.body;
      console.log("Webhook received:", req.body);
      console.log("Event type:", event);
      console.log("Payload:", payload);
      switch (event) {
        case "payment.captured":
          const paymentData = payload.payment.entity;

          const doctorId = paymentData.notes.doctorId;
          if (doctorId) {
            const appointmentDay = paymentData.notes.appointmentDay;
            const appointmentDate = paymentData.notes.appointmentDate;
            const appointmentTimeFrom = paymentData.notes.appointmentTimeFrom;
            const appointmentTimeTo = paymentData.notes.appointmentTimeTo;
            const fullName = paymentData.notes.fullName;
            const phoneNumber = paymentData.notes.phoneNumber;
            const age = paymentData.notes.age;
            const gender = paymentData.notes.gender;
            const clinicId = paymentData.notes.clinicId;
            const billingAddress = paymentData.notes.billingAddress;
            const termsAccepted = paymentData.notes.termsAccepted;
            const healthInsured = paymentData.notes.healthInsured;
            const orderId = paymentData.order_id;
            const userId = paymentData.notes.userId;
            const amountPaid = paymentData.amount / 100; // Convert to rupees
            const totalAmount = paymentData?.amount / 100;

            const commission = await AdminCommission.findOne({});
            const bookingCommission =
              ((commission?.bookingCommission * totalAmount) / 100).toFixed(
                2
              ) || 0;

            const doctor = await Doctor.findById(doctorId);
            const doctorName = doctor.fullName;
            const specialization = doctor.specialization;

            const fees = doctor.fees.find(
              (fee) => fee.clinicId.toString() === clinicId.toString()
            );
            const doctorFee = fees.fee;

            const clinic = await Clinic.findById(clinicId);
            const clinicName = clinic.name;
            const clinicAddress = clinic.address;
            const clinicNumber = clinic.phoneNumber;
            const clinicEmail = clinic?.email || "";

            const appointment = new Appointment({
              createdBy: userId,
              doctor: doctorId,
              doctorName,
              specialization,
              doctorFee,
              clinicName,
              clinicAddress,
              clinicNumber,
              fullName,
              phoneNumber,
              age,
              gender,
              appointmentDay,
              appointmentDate,
              appointmentTimeFrom,
              appointmentTimeTo,
              healthInsured,
              paymentMethod: paymentData.method || "unknown",
              amountPaid,
              paymentId: paymentData.id,
              orderId,
              clinicId,
              billingAddress,
              bookingCommission,
              paymentStatus: "Paid",
              termsAccepted,
              totalAmount,
            });

            await appointment.save();

            res.status(201).json({
              message: "Appointment created successfully",
              appointment,
            });

            const mailOptions = {
              from: process.env.MAIL_USERNAME,
              to: [process.env.ADMIN_EMAIL, clinicEmail],
              subject: "New Appointment",
              html: `
                      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
                        <h2>New Appointment Booking</h2>
                        <p>Hello,</p>
                        <p>An appointment has been booked by a user on the platform:</p>
                        <h3>User Details</h3>
                        <ul>
                          <li><strong>Full Name:</strong> ${fullName}</li>
                          <li><strong>Phone:</strong> ${phoneNumber}</li>
                        </ul>
                        <h3>Appointment Details</h3>
                        <ul>
                          <li><strong>Date:</strong> ${appointmentDay}, ${appointmentDate}</li>
                          <li><strong>Time:</strong> ${appointmentTimeFrom} - ${appointmentTimeTo}</li>
                        </ul>
                        <h3>Clinic Details</h3>
                        <ul>
                          <li><strong>Clinic Name:</strong> ${clinic.name}</li>
                         <li><strong>Clinic Address:</strong> ${[
                           clinic.addressOne,
                           clinic.addressTwo,
                           clinic.city,
                           clinic.state,
                           clinic.pincode,
                         ]
                           .filter(Boolean)
                           .join(", ")}</li>

                          <li><strong>Clinic Contact:</strong> ${
                            clinic.phoneNumber
                          }</li>
                        </ul>
                        <p>Thank you.</p>
                      </div>
                    `,
            };

            await transporter.sendMail(mailOptions);
          }
      }
    }
    return res.status(200).send();
  } catch (error) {
    console.log(error);
  }
};

exports.getAllUserAppointments = async (req, res) => {
  try {
    const userId = req.user._id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit);
    const skip = (page - 1) * limit;

    const totalAppointments = await Appointment.countDocuments({
      createdBy: userId,
    });
    const totalPages = Math.ceil(totalAppointments / limit);

    const appointments = await Appointment.find({ createdBy: userId })
      .select("-__v  -bookingCommission")
      .sort({
        createdAt: -1,
      })
      .skip(skip)
      .limit(limit);
    res
      .status(200)
      .json({ appointments: appointments || [], totalPages: totalPages || 1 });
  } catch (error) {
    console.log(error);
    res
      .status(500)
      .json({ message: "Internal server error", error: error.message });
  }
};

exports.getClinicDetailsForUser = async (req, res) => {
  try {
    const { clinicId } = req.params;
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

exports.getDoctorByIdForUser = async (req, res) => {
  try {
    const { doctorId } = req.params;

    const platformData = await AdminCommission.findOne({});
    const platformFee = platformData ? platformData?.platFormFee : 1;

    const doctor = await Doctor.findById(doctorId);

    if (!doctor) {
      return res.status(404).json({ message: "Doctor not found" });
    }

    res.status(200).json({
      doctor,
      platformFee,
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
};

exports.getDoctorSlots = async (req, res) => {
  try {
    let { doctorId, clinicId, scheduledId, appointmentDate } = req.query;

    if (!doctorId || !clinicId || !scheduledId || !appointmentDate) {
      return res.status(400).json({
        message:
          "Doctor Id, Clinic Id, appointment Date and Scheduled Id are required",
      });
    }

    const clinic = await Clinic.findById(clinicId);
    if (!clinic) {
      return res.status(404).json({ message: "Clinic not found" });
    }

    const doctor = await Doctor.findOne({ _id: doctorId, clinics: clinicId });

    if (!doctor) {
      return res.status(404).json({ message: "Doctor not found" });
    }

    const validDateRegex =
      /^(0[1-9]|[12][0-9]|3[01])-(0[1-9]|1[0-2])-(19|20)\d{2}$/;

    if (!validDateRegex.test(appointmentDate)) {
      return res
        .status(400)
        .json({ message: "Invalid date format. Accepted format: dd-mm-yyyy" });
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
        .json({ message: "Appointment schedule not found" });
    }

    const appointmentTimeFrom =
      clinicSchedule.schedule[scheduleIndex].startTime;
    const appointmentTimeTo = clinicSchedule.schedule[scheduleIndex].endTime;
    const maxSlots = clinicSchedule.schedule[scheduleIndex].maxSlots;

    const bookedSlot = await Appointment.countDocuments({
      clinicId,
      doctor: doctorId,
      appointmentDate,
      appointmentTimeFrom,
      appointmentTimeTo,
    });

    res
      .status(200)
      .json({ scheduledId, clinicId, doctorId, maxSlots, bookedSlot });
  } catch (error) {
    console.log(error);
    res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
};

exports.getAllClinics = async (req, res) => {
  try {
    const clinics = await Clinic.find({ isVerified: true });
    res.status(200).json({ clinics });
  } catch (error) {
    console.log(error);
    res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
};

exports.getDoctorsByClinic = async (req, res) => {
  try {
    const { clinicId } = req.params;
    let { page, limit } = req.query;

    page = parseInt(page) || 1;
    limit = parseInt(limit);

    const skip = (page - 1) * limit || 0;
    const totalDoctors = await Doctor.countDocuments({ clinics: clinicId });
    const totalPages = Math.ceil(totalDoctors / limit) || 1;

    const doctors = await Doctor.find({ clinics: clinicId })
      .sort({
        createdAt: -1,
      })
      .skip(skip)
      .limit(limit)
      .select("-__v");
    res.status(200).json({ doctors, totalPages });
  } catch (error) {
    console.log(error);
    res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
};

exports.searchEndpoint = async (req, res) => {
  try {
    const { query = "", location, searchOn } = req.query;
    let data;

    if (searchOn === "clinic") {
      const conditions = [
        {
          $or: [
            { name: { $regex: query, $options: "i" } },
            { addressOne: { $regex: query, $options: "i" } },
            { addressTwo: { $regex: query, $options: "i" } },
            { state: { $regex: query, $options: "i" } },
          ],
        },
      ];

      if (location) {
        conditions.push({ city: location });
      }

      data = await Clinic.find({ $and: conditions, isVerified: true }).sort({
        createdAt: -1,
      });
    } else {
      const matchConditions = [
        {
          $or: [
            { fullName: { $regex: query, $options: "i" } },
            { specialization: { $regex: query, $options: "i" } },
            { experience: { $regex: query, $options: "i" } },
            { qualification: { $regex: query, $options: "i" } },
          ],
        },
      ];

      if (location) {
        matchConditions.push({ "populatedClinics.city": location });
      }

      data = await Doctor.aggregate([
        {
          $lookup: {
            from: "clinics",
            localField: "clinics",
            foreignField: "_id",
            as: "populatedClinics",
          },
        },
        {
          $match: {
            $and: matchConditions,
          },
        },
        {
          $sort: { createdAt: -1 },
        },
      ]);
    }

    return res.status(200).json({ data });
  } catch (error) {
    console.log(error);
    res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
};

exports.getAllLabTestClinics = async (req, res) => {
  try {
    const result = await LabTest.aggregate([
      {
        $group: {
          _id: "$clinicId",
        },
      },
      {
        $lookup: {
          from: "clinics",
          localField: "_id",
          foreignField: "_id",
          as: "clinic",
        },
      },
      {
        $unwind: "$clinic",
      },
      {
        $project: {
          _id: 0,
          _id: "$_id",
          name: "$clinic.name",
          email: "$clinic.email",
          address: "$clinic.address",
          addressOne: "$clinic.addressOne",
          addressTwo: "$clinic.addressTwo",
          city: "$clinic.city",
          state: "$clinic.state",
          pincode: "$clinic.pincode",
          phoneNumber: "$clinic.phoneNumber",
          latitude: "$clinic.latitude",
          longitude: "$clinic.longitude",
        },
      },
      {
        $sort: {
          createdAt: -1,
        },
      },
    ]);
    res.status(200).json(result);
  } catch (error) {
    console.log("Error getting lab test clinics:", error);
    res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
};

exports.getAllLabsByClinicId = async (req, res) => {
  try {
    const { clinicId } = req.params;
    const result = await LabTest.find({ clinicId });
    res.status(200).json(result);
  } catch (error) {
    console.log("Error getting lab test clinics:", error);
    res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
};

exports.createLabTestAppointment = async (req, res) => {
  try {
    let {
      fullName,
      phoneNumber,
      age,
      gender,
      clinicId,
      labTestIds,
      address,
      termsAccepted,
      appointmentDate,
    } = req.body;

    if (
      !fullName ||
      !phoneNumber ||
      !age ||
      !gender ||
      !clinicId ||
      !appointmentDate ||
      labTestIds.length === 0
    ) {
      return res
        .status(400)
        .json({ message: "All required fields must be filled" });
    }

    const validDateRegex =
      /^(0[1-9]|[12][0-9]|3[01])-(0[1-9]|1[0-2])-(19|20)\d{2}$/;

    if (!validDateRegex.test(appointmentDate)) {
      return res
        .status(400)
        .json({ message: "Invalid date format. Accepted format: dd-mm-yyyy" });
    }

    if (typeof termsAccepted !== "boolean") {
      return res.status(400).json({
        message: "Terms and conditions is required",
      });
    }

    if (!termsAccepted) {
      return res.status(400).json({
        message: "Please accept the terms and conditions",
      });
    }

    const clinic = await Clinic.findById(clinicId);
    if (!clinic) {
      return res.status(404).json({ message: "Clinic not found" });
    }
    let testNames = "";
    let testDescriptions = "";
    let testFeeDetails = "";
    let testFees = 0;
    for (const labTestId of labTestIds) {
      const labTest = await LabTest.findById(labTestId);
      if (!labTest) {
        return res
          .status(404)
          .json({ message: `Lab Test Id ${labTestId} not found` });
      }
      testNames += testNames ? `, ${labTest.name}` : labTest.name;
      testFees += labTest.price;
      testDescriptions += testDescriptions
        ? `, ${labTest.description}`
        : labTest.description;

      testFeeDetails += testFeeDetails ? `, ${labTest.price}` : labTest.price;
    }

    gender = gender.toLowerCase();
    if (!genders.includes(gender)) {
      return res.status(400).json({ message: "Invalid gender" });
    }

    const platForm = await AdminCommission.findOne({});
    const platFormFee =
      Math.floor((platForm?.labTestCommissionPercentage * testFees) / 100) || 1;

    const metadata = {
      userId: req.user._id,
      appointmentDate,
      fullName,
      phoneNumber,
      age,
      gender,
      clinicId,
      labTestIds,
      testNames,
      testFees,
      testFeeDetails,
      testDescriptions,
      address,
      termsAccepted,
    };

    // Create Razorpay order
    const options = {
      amount: platFormFee * 100,
      currency: "INR",
      receipt: `receipt_${req?.user?._id}`,
      payment_capture: 1,
      notes: metadata,
    };

    const order = await razorpayInstance.orders.create(options);

    // Send response with payment link (Razorpay hosted page)
    res.status(200).json({
      order_id: order.id,
      amount: platFormFee * 100,
      key_id: process.env.RAZORPAY_KEY_ID,
      user: req?.user._id,
    });
  } catch (error) {
    console.log(error);
    res
      .status(500)
      .json({ message: "Internal server error", error: error.message });
  }
};

exports.labTestAppointmentWebhook = async (req, res) => {
  try {
    const signature = req.headers["x-razorpay-signature"];
    const isValid = validateWebhookSignature(
      JSON.stringify(req.body),
      signature,
      process.env.RAZORPAY_WEBHOOK_SECRET_FOR_LABTEST
    );
    console.log("IsValidLab", isValid);
    if (isValid) {
      const { event, payload } = req.body;
      switch (event) {
        case "payment.captured":
          const paymentData = payload.payment.entity;
          const labTestIds = paymentData?.notes?.labTestIds;
          if (labTestIds.length > 0) {
            const appointmentDate = paymentData.notes.appointmentDate;
            const fullName = paymentData.notes.fullName;
            const phoneNumber = paymentData.notes.phoneNumber;
            const age = paymentData.notes.age;
            const gender = paymentData.notes.gender;
            const clinicId = paymentData.notes.clinicId;
            const address = paymentData.notes.address;
            const labTestNames = paymentData?.notes?.testNames;
            const labTestFees = paymentData?.notes?.testFees;
            const labTestFeeDetails = paymentData?.notes?.testFeeDetails;
            const labTestDescriptions = paymentData?.notes?.testDescriptions;
            const termsAccepted = paymentData.notes.termsAccepted;
            const orderId = paymentData.order_id;
            const userId = paymentData.notes.userId;
            const amountPaid = paymentData.amount / 100; // Convert to rupees
            const totalAmount = paymentData?.amount / 100;

            const bookingCommission = 0;
            const clinic = await Clinic.findById(clinicId);
            const clinicName = clinic.name;
            const clinicAddress = clinic.address;
            const clinicEmail = clinic.email || "";
            const clinicNumber = clinic.phoneNumber;

            const appointment = new LabTestAppointment({
              createdBy: userId,
              fullName,
              phoneNumber,
              age,
              gender,
              appointmentDate,
              testNames: labTestNames,
              testFees: labTestFees,
              testDescriptions: labTestDescriptions,
              testFeeDetails: labTestFeeDetails,
              clinicName,
              clinicAddress,
              clinicNumber,
              paymentMethod: paymentData.method || "unknown",
              totalAmount,
              amountPaid,
              paymentId: paymentData.id,
              orderId,
              clinicId,
              address,
              bookingCommission,
              paymentStatus: "Paid",
              termsAccepted,
            });

            await appointment.save();

            res.status(201).json({
              message: "Lab appointment created successfully",
            });

            const mailOptions = {
              from: process.env.MAIL_USERNAME,
              to: [process.env.ADMIN_EMAIL, clinicEmail],
              subject: "New Lab Test Booking",
              html: `
                <div style="font-family: Arial, sans-serif; line-height: 1.6;">
                  <h2>New Lab Test Booking</h2>
                  <p>Hello,</p>
                  <p>A lab test has been booked by a user on the platform:</p>
                  
                  <h3>User Details</h3>
                  <ul>
                    <li><strong>Full Name:</strong> ${fullName}</li>
                    <li><strong>Phone:</strong> ${phoneNumber}</li>
                  </ul>
            
                  <h3>Lab Test Details</h3>
                  <ul>
                    <li><strong>Test Name(s):</strong> ${labTestNames}</li>
                    <li><strong>Test Date:</strong> ${appointmentDate}</li>
                    <li><strong>Special Instructions:</strong> ${
                      labTestDescriptions || "None"
                    }</li>
                  </ul>
            
                  <h3>Clinic Details</h3>
                  <ul>
                    <li><strong>Name:</strong> ${clinicName}</li>
                    <li><strong>Address:</strong> ${clinicAddress}</li>
                  </ul>
            
                  <p>Thank you.</p>
                </div>
              `,
            };

            await transporter.sendMail(mailOptions);
          }
      }
    }
    return res.status(200).send();
  } catch (error) {
    console.log(error);
  }
};

exports.getAllUserLabTestAppointments = async (req, res) => {
  try {
    const userId = req.user._id;
    let { page, limit } = req.query;

    page = parseInt(page) || 1;
    limit = parseInt(limit);

    const skip = (page - 1) * limit || 0;

    const totalAppointments = await LabTestAppointment.countDocuments({
      createdBy: userId,
    });
    const totalPages = Math.ceil(totalAppointments / limit);

    const appointments = await LabTestAppointment.find({
      createdBy: userId,
    })
      .select("-__v -bookingCommission ")
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

exports.paymentSuccessCallbackUrlForAppointment = async (req, res) => {
  try {
    res.redirect("https://bookmydoct.com/appointments");
  } catch (error) {
    console.log(error);
    res
      .status(500)
      .json({ message: "Internal server error", error: error.message });
  }
};

exports.paymentSuccessCallbackUrlForLabTest = async (req, res) => {
  try {
    res.redirect("https://bookmydoct.com/bookedLabTest");
  } catch (error) {
    console.log(error);
    res
      .status(500)
      .json({ message: "Internal server error", error: error.message });
  }
};

exports.getAllAddedCities = async (req, res) => {
  try {
    const cities = await Clinic.distinct("city", { isVerified: true });
    res.status(200).json({ cities });
  } catch (error) {
    console.log("Error getting added cities:", error);
    res
      .status(500)
      .json({ message: "Internal server error", error: error.message });
  }
};
