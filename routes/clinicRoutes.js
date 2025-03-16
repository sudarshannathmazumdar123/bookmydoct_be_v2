const express = require("express");
const validateClinicJwt = require("../middlewares/validateClinicJwt");
const {
  createClinicAdmin,
  updateClinicAdmin,
  getClinicAdminById,
  deleteClinicAdmin,
  getAllClinicAdmins,
  createDoctor,
  getDoctorById,
  updateDoctor,
  deleteDoctor,
  getAllDoctorsByClinic,
  deleteDaySchedule,
  getAllAppointmentsClinic,
  updateClinicDetails,
  editDaySchedule,
  getDoctorByRegistrationNumber,
  getClinicDetails,
  createLabTest,
  getAllLabTests,
  updateLabTest,
  getLabTestById,
  deleteLabTest,
  getAllLabTestAppointments,
  verifyClinicByAdmin,
  getAllSpecializations,
} = require("../controllers/clinicController");
const router = express.Router();

router
  .route("/users/")
  .post(validateClinicJwt, createClinicAdmin)
  .get(validateClinicJwt, getAllClinicAdmins);
router
  .route("/users/:userId")
  .put(validateClinicJwt, updateClinicAdmin)
  .get(validateClinicJwt, getClinicAdminById)
  .delete(validateClinicJwt, deleteClinicAdmin);

router
  .route("/doctors/")
  .post(validateClinicJwt, createDoctor)
  .get(validateClinicJwt, getAllDoctorsByClinic);

router
  .route("/doctors/schedule")
  .delete(validateClinicJwt, deleteDaySchedule)
  .put(validateClinicJwt, editDaySchedule);

router.route("/doctors/specializations").get(getAllSpecializations);

router
  .route("/doctors/registration/:registrationNumber")
  .get(validateClinicJwt, getDoctorByRegistrationNumber);

router
  .route("/doctors/:doctorId")
  .get(validateClinicJwt, getDoctorById)
  .put(validateClinicJwt, updateDoctor)
  .delete(validateClinicJwt, deleteDoctor);

router.route("/appointments").get(validateClinicJwt, getAllAppointmentsClinic);
router
  .route("/")
  .put(validateClinicJwt, updateClinicDetails)
  .get(validateClinicJwt, getClinicDetails);

router
  .route("/labs")
  .post(validateClinicJwt, createLabTest)
  .get(validateClinicJwt, getAllLabTests);

router
  .route("/labs/appointments")
  .get(validateClinicJwt, getAllLabTestAppointments);

router
  .route("/labs/:labTestId")
  .put(validateClinicJwt, updateLabTest)
  .get(validateClinicJwt, getLabTestById)
  .delete(validateClinicJwt, deleteLabTest);

router.route("/verify/:clinicId").get(verifyClinicByAdmin);

module.exports = router;
