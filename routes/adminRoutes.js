const express = require("express");
const {
  commissionFees,
  getCommissionFeeDetails,
  getUnVerifiedClinics,
  addSpecialization,
  deleteSpecialization,
} = require("../controllers/adminController");
const validateAdminJwt = require("../middlewares/validateAdminJwt");
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

module.exports = router;
