const jwt = require("jsonwebtoken");
const ClinicAdmin = require("../models/clinicAdmin");
const Clinic = require("../models/clinic");

const validateClinicJwt = async (req, res, next) => {
  const authHeader = req.header("Authorization");
  if (!authHeader) {
    return res.status(401).json({ message: "No token, authorization denied." });
  }

  const token = authHeader.split(" ")[1];
  if (!token) {
    return res.status(401).json({ message: "Token format is incorrect." });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await ClinicAdmin.findById(decoded.id);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    if (user.disable) {
      return res.status(401).json({ message: "User is disabled." });
    }

    const clinic = await Clinic.findById(user.clinicId);
    if (!clinic) {
      return res.status(404).json({ message: "Clinic not found." });
    }

    if (!clinic.isVerified) {
      return res.status(401).json({ message: "Clinic is not verified." });
    }

    req.user = user;

    next();
  } catch (err) {
    console.error("Token verification error:", err.message);
    res.status(401).json({ message: "Token is not valid" });
  }
};

module.exports = validateClinicJwt;
