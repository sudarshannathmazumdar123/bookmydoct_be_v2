const express = require("express");
const {
  commissionFees,
  getCommissionFeeDetails,
  getUnVerifiedClinics,
  addSpecialization,
  deleteSpecialization,
} = require("../controllers/adminController");
const validateAdminJwt = require("../middlewares/validateAdminJwt");
const { getAllAppointments } = require("../controllers/userController");
const router = express.Router();

router.route("/update/platformFee").put(validateAdminJwt, commissionFees);
router.route("/add/specialization").put(validateAdminJwt, addSpecialization);
router
  .route("/delete/specialization")
  .put(validateAdminJwt, deleteSpecialization);
router
  .route("/get/commission-details")
  .get(validateAdminJwt, getCommissionFeeDetails);

router.route("/unverified-clinics").get(validateAdminJwt, getUnVerifiedClinics);

router.route("/get-all-appointments").get(getAllAppointments);

module.exports = router;
