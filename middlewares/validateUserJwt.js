const jwt = require("jsonwebtoken");
const User = require("../models/user");

const validateUserJwt = async (req, res, next) => {
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

    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    if (user.disable) {
      return res.status(401).json({ message: "User is disabled." });
    }

    req.user = user;

    next();
  } catch (err) {
    console.error("Token verification error:", err.message);
    res.status(401).json({ message: "Token is not valid" });
  }
};

module.exports = validateUserJwt;
