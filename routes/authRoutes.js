const express = require("express");
const {
  loginForUser,
  loginForClinic,
  getUserDetails,
  editUser,
  signupForUser,
  signupForClinic,
  forgotPasswordForClinic,
  forgotPasswordForUser,
  resetPasswordForUser,
  resetPasswordForClinic,
  changePassword,
  loginForAdmin,
  signupForAdmin,
  forgotPasswordForAdmin,
  resetPasswordForAdmin,
  getAccessToken,
} = require("../controllers/authController");
const validateUserJwt = require("../middlewares/validateUserJwt");
const validateAdminJwt = require("../middlewares/validateAdminJwt");
const validateClinicJwt = require("../middlewares/validateClinicJwt");
const router = express.Router();

router.route("/user/login").post(loginForUser);
router.route("/user/signup").post(signupForUser);
router.route("/user/forgot-password").post(forgotPasswordForUser);
router.route("/user/reset-password").post(resetPasswordForUser);
router.route("/user/change-password").post(validateUserJwt, changePassword);
router.route("/user/details").get(validateUserJwt, getUserDetails);
router.route("/user/edit").put(validateUserJwt, editUser);

router.route("/admin/login").post(loginForAdmin);
router.route("/admin/signup").post(signupForAdmin);
router.route("/admin/forgot-password").post(forgotPasswordForAdmin);
router.route("/admin/reset-password").post(resetPasswordForAdmin);
router.route("/admin/change-password").post(validateAdminJwt, changePassword);
router.route("/admin/details").get(validateAdminJwt, getUserDetails);
router.route("/admin/edit").put(validateAdminJwt, editUser);

router.route("/clinic/login").post(loginForClinic);
router.route("/clinic/signup").post(signupForClinic);
router.route("/clinic/forgot-password").post(forgotPasswordForClinic);
router.route("/clinic/reset-password").post(resetPasswordForClinic);
router.route("/clinic/change-password").post(validateClinicJwt, changePassword);
router.route("/clinic/details").get(validateClinicJwt, getUserDetails);
router.route("/clinic/edit").put(validateClinicJwt, editUser);

router.route("/get-access-token").get(getAccessToken);

module.exports = router;
