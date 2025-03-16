const express = require("express");
const {
  getAllDoctors,
  createAppointment,
  appointmentWebhook,
  getAllUserAppointments,
  getDoctorByIdForUser,
  getClinicDetailsForUser,
  getDoctorSlots,
  getAllClinics,
  getDoctorsByClinic,
  searchEndpoint,
  getAllLabTestClinics,
  getAllLabsByClinicId,
  labTestAppointmentWebhook,
  createLabTestAppointment,
  getAllUserLabTestAppointments,
  getAllAddedCities,
  paymentSuccessCallbackUrl,
  paymentSuccessCallbackUrlForAppointment,
  paymentSuccessCallbackUrlForLabTest,
} = require("../controllers/userController");
const router = express.Router();
const validateUserJwt = require("../middlewares/validateUserJwt");
const bodyParser = require("body-parser");
const {
  checkDuplicateEvent,
  checkDuplicateEventLabTest,
} = require("../middlewares/duplicateWebhookCheck");

router.route("/doctors/").get(getAllDoctors);
router.route("/doctors/clinics/:clinicId").get(getDoctorsByClinic);
router.route("/clinics/").get(getAllClinics);
router.route("/cities").get(getAllAddedCities);
router.route("/get-all-data").get(searchEndpoint);
router
  .route("/appointments/")
  .post(validateUserJwt, createAppointment)
  .get(validateUserJwt, getAllUserAppointments);
router
  .route("/pay")
  .post(
    bodyParser.raw({ type: "application/json" }),
    checkDuplicateEvent,
    appointmentWebhook
  );
router.route("/doctor/slots").get(validateUserJwt, getDoctorSlots);
router.route("/doctor/:doctorId").get(validateUserJwt, getDoctorByIdForUser);
router.route("/clinic/:clinicId").get(validateUserJwt, getClinicDetailsForUser);
router.route("/lab-clinics").get(getAllLabTestClinics);
router
  .route("/lab/appointments/")
  .post(validateUserJwt, createLabTestAppointment)
  .get(validateUserJwt, getAllUserLabTestAppointments);
router
  .route("/lab/pay")
  .post(
    bodyParser.raw({ type: "application/json" }),
    checkDuplicateEventLabTest,
    labTestAppointmentWebhook
  );
router.route("/labs/:clinicId").get(getAllLabsByClinicId);
router
  .route("/payment-success/appointment/redirect")
  .post(paymentSuccessCallbackUrlForAppointment);
router
  .route("/payment-success/labtest/redirect")
  .post(paymentSuccessCallbackUrlForLabTest);

module.exports = router;
