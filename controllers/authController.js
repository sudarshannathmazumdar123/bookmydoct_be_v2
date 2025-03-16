const User = require("../models/user");
const Clinic = require("../models/clinic");
const Admin = require("../models/admin");
const jwt = require("jsonwebtoken");
const { transporter } = require("../utils/mailService");
const ClinicAdmin = require("../models/clinicAdmin");
const bcrypt = require("bcrypt");

const generateToken = (user) => {
  return jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });
};

const generateRefreshToken = (user) => {
  return jwt.sign({ id: user._id }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: "30d",
  });
};

exports.signupForUser = async (req, res) => {
  try {
    let { fullName, email, phoneNumber, address, password } = req.body;
    if (!fullName || !email || !phoneNumber || !password || !address) {
      return res.status(400).json({ message: "All fields are required." });
    }

    email = email.trim().toLowerCase();
    phoneNumber = phoneNumber.trim();

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: "Invalid email format." });
    }

    const phoneRegex = /^\+[1-9]\d{0,3}\d{10}$/;
    phoneNumber = phoneNumber.trim();
    if (!phoneRegex.test(phoneNumber)) {
      return res.status(400).json({ message: "Invalid phone number format." });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: "User already exists." });
    }

    const user = new User({
      fullName,
      email,
      phoneNumber,
      address,
      password,
    });

    const savedUser = await user.save();

    let userObject = savedUser.toObject();
    delete userObject.password;

    const token = generateToken(savedUser);
    const refreshToken = generateRefreshToken(savedUser);
    res.status(201).json({
      message: "User created successfully.",
      userObject,
      token,
      refreshToken,
    });
  } catch (error) {
    console.log(error);
    res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
};

exports.signupForClinic = async (req, res) => {
  try {
    let {
      name,
      email,
      phoneNumber,
      addressOne,
      addressTwo,
      city,
      state,
      pincode,
      userName,
      password,
      userAddress,
      userEmail,
      userPhoneNumber,
      latitude,
      longitude,
    } = req.body;
    if (
      !name ||
      !email ||
      !phoneNumber ||
      !password ||
      !addressOne ||
      !city ||
      !state ||
      !pincode ||
      !userName ||
      !userEmail
    ) {
      return res.status(400).json({ message: "All fields are required." });
    }

    if ((latitude && isNaN(latitude)) || (longitude && isNaN(longitude))) {
      return res
        .status(400)
        .json({ message: "latitude and latitude must be a number" });
    }

    email = email.trim().toLowerCase();
    phoneNumber = phoneNumber.trim();

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    email = email.trim().toLowerCase();
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: "Invalid clinic email format." });
    }

    if (!emailRegex.test(userEmail)) {
      return res.status(400).json({ message: "Invalid user email format." });
    }

    phoneNumber = phoneNumber.trim();
    const phoneRegex = /^\+[1-9]\d{0,3}\d{10}$/;
    if (!phoneRegex.test(phoneNumber)) {
      return res
        .status(400)
        .json({ message: "Invalid clinic phone number format." });
    }

    if (isNaN(pincode)) {
      return res.status(400).json({ message: "Pincode must be a number" });
    }

    if (userPhoneNumber && !phoneRegex.test(userPhoneNumber)) {
      return res
        .status(400)
        .json({ message: "Invalid user phone number format." });
    }

    const existingClinic = await Clinic.findOne({ email });
    if (existingClinic) {
      return res
        .status(409)
        .json({ message: "Clinic with this email already exists." });
    }

    const existingClinicUser = await ClinicAdmin.findOne({ email: userEmail });
    if (existingClinicUser) {
      return res.status(409).json({ message: "User already exists." });
    }

    const clinic = new Clinic({
      name,
      email,
      phoneNumber,
      addressOne,
      addressTwo,
      city,
      state,
      pincode,
      latitude,
      longitude,
    });

    const savedClinic = await clinic.save();

    const clinicAdmin = new ClinicAdmin({
      fullName: userName,
      email: userEmail,
      phoneNumber: userPhoneNumber,
      address: userAddress,
      password,
      clinicId: savedClinic._id,
    });

    const savedUser = await clinicAdmin.save();

    let userObject = savedUser.toObject();
    delete userObject.password;

    res.status(201).json({
      message:
        "Clinic created successfully and a mail has been send to admin for verification.",
    });

    const verificationLink = `${process.env.PRODUCTION_API_URL}/clinic/verify/${savedClinic._id}`;
    const mailOptions = {
      from: process.env.MAIL_USERNAME,
      to: process.env.ADMIN_EMAIL,
      subject: "New Clinic Registration",
      html: `
          <div style="font-family: Arial, sans-serif; line-height: 1.6;">
            <h2>New Clinic Registration</h2>
            <p>Hello Admin,</p>
            <p>The following clinic admin has been registered on the platform:</p>
            <h3>Clinic Admin Details</h3>
            <ul>
              <li><strong>Full Name:</strong> ${clinicAdmin.fullName}</li>
              <li><strong>Email:</strong> ${clinicAdmin.email}</li>
            </ul>
            <h3>Clinic Details</h3>
            <ul>
              <li><strong>Clinic Name:</strong> ${savedClinic?.name}</li>
              <li><strong>Clinic Address:</strong> ${savedClinic?.addressOne}, ${savedClinic?.addressTwo}, ${savedClinic?.city}, ${savedClinic?.state}, ${savedClinic?.pincode}</li>
              <li><strong>Clinic Contact:</strong> ${savedClinic?.phoneNumber}</li>
            </ul>
              <p>Please verify the clinic using the link below:</p>
              <p><a href="${verificationLink}" style="background-color: #4CAF50; color: white; padding: 10px 15px; text-decoration: none; border-radius: 5px; display: inline-block;">
                Verify Clinic
              </a></p>
          </div>
        `,
    };

    // Send email
    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.log(error);
    res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
};

exports.signupForAdmin = async (req, res) => {
  try {
    let { fullName, email, phoneNumber, address, password } = req.body;
    if (!fullName || !email || !phoneNumber || !password || !address) {
      return res.status(400).json({ message: "All fields are required." });
    }

    email = email.trim().toLowerCase();
    phoneNumber = phoneNumber.trim();

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: "Invalid email format." });
    }

    const phoneRegex = /^\+[1-9]\d{0,3}\d{10}$/;
    phoneNumber = phoneNumber.trim();
    if (!phoneRegex.test(phoneNumber)) {
      return res.status(400).json({ message: "Invalid phone number format." });
    }

    const existingUser = await Admin.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: "User already exists." });
    }

    const clinic = new Admin({
      fullName,
      email,
      phoneNumber,
      address,
      password,
    });

    const savedUser = await clinic.save();

    let userObject = savedUser.toObject();
    delete userObject.password;

    const token = generateToken(savedUser);
    const refreshToken = generateRefreshToken(savedUser);
    res.status(201).json({
      message: "Clinic created successfully.",
      userObject,
      token,
      refreshToken,
    });
  } catch (error) {
    console.log(error);
    res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
};

exports.loginForUser = async (req, res) => {
  try {
    let { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "All fields are required." });
    }

    email = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: "Invalid email format." });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "Invalid email or password." });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    let userObject = user.toObject();
    delete userObject.password;

    const token = generateToken(user);
    const refreshToken = generateRefreshToken(user);
    res.status(200).json({ token, refreshToken, userObject });
  } catch (error) {
    console.log(error);
    res
      .status(400)
      .json({ message: "Error logging in.", error: error.message });
  }
};

exports.loginForClinic = async (req, res) => {
  try {
    let { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "All fields are required." });
    }

    email = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: "Invalid email format." });
    }

    const user = await ClinicAdmin.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "Invalid email or password." });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    let userObject = user.toObject();
    delete userObject.password;

    const clinic = await Clinic.findById(user.clinicId);
    if (!clinic) {
      return res.status(404).json({ message: "Clinic not found" });
    }

    if (!clinic.isVerified) {
      return res
        .status(401)
        .json({ message: "Clinic is not verified. Kindly contact the admin." });
    }

    const token = generateToken(user);
    const refreshToken = generateRefreshToken(user);
    res.status(200).json({ token, refreshToken, userObject });
  } catch (error) {
    console.log(error);
    res
      .status(400)
      .json({ message: "Error logging in.", error: error.message });
  }
};

exports.loginForAdmin = async (req, res) => {
  try {
    let { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "All fields are required." });
    }

    email = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: "Invalid email format." });
    }

    const user = await Admin.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "Invalid email or password." });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    let userObject = user.toObject();
    delete userObject.password;

    const token = generateToken(user);
    const refreshToken = generateRefreshToken(user);
    res.status(200).json({ token, refreshToken, userObject });
  } catch (error) {
    console.log(error);
    res
      .status(400)
      .json({ message: "Error logging in.", error: error.message });
  }
};

exports.getUserDetails = async (req, res) => {
  try {
    const user = req.user;
    const userObject = user.toObject();
    delete userObject.password;
    res.status(200).json({ user: userObject });
  } catch (error) {
    console.log(error);
    res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
};

exports.editUser = async (req, res) => {
  try {
    const userId = req.user._id;
    const userRole = req.user.role;
    let { fullName, email, phoneNumber, address } = req.body;

    let user;
    if (userRole === "user") {
      user = await User.findById(userId);
    } else if (userRole === "clinic") {
      user = await ClinicAdmin.findById(userId);
    } else {
      user = await Admin.findById(userId);
    }

    if (email) {
      email = email.trim().toLowerCase();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ message: "Invalid email format." });
      }
    }

    if (email && email !== user.email) {
      let existingUser;
      if (userRole === "user") {
        existingUser = await User.findOne({ email });
      } else if (userRole === "clinic") {
        existingUser = await ClinicAdmin.findOne({ email });
      } else {
        existingUser = await Admin.findOne({ email });
      }
      if (existingUser) {
        return res.status(409).json({ message: "Email already exists." });
      }
      user.email = email;
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

    const updatedUser = await user.save();
    const userObject = updatedUser.toObject();
    delete userObject.password;

    res.status(200).json({
      message: "User updated successfully.",
      user: userObject,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

exports.forgotPasswordForUser = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: "Email is required." });
    }
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    user.otp = otp;
    user.otpExpiresAt = Date.now() + 5 * 60 * 1000; // OTP valid for 5 minutes
    await user.save();

    const mailOptions = {
      from: process.env.MAIL_USERNAME,
      to: user.email,
      subject: "Password Reset OTP",
      html: `
      <div class="container">
        <div class="content">
          <h1>One Time Password (OTP)</h1>
          <p>Hi there,</p>
          <p>You recently requested to reset your password for your Book My Doctor account. Please use the following OTP to reset your password:</p>
          <h2 style="background-color: #f2f2f2; padding: 10px; border-radius: 5px; display: inline-block;">${otp}</h2>
          <p>If you did not make this request, you can safely ignore this email.</p>
          <p>Thank you for choosing Book My Doctor account!</p>
        </div>
      </div>
    `,
    };

    await transporter.sendMail(mailOptions);

    res.status(200).json({ message: "OTP sent to your email." });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
};

exports.forgotPasswordForClinic = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: "Email is required." });
    }
    const user = await ClinicAdmin.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    user.otp = otp;
    user.otpExpiresAt = Date.now() + 5 * 60 * 1000; // OTP valid for 5 minutes
    await user.save();

    const mailOptions = {
      from: process.env.MAIL_USERNAME,
      to: user.email,
      subject: "Password Reset OTP",
      html: `
        <div class="container">
          <div class="content">
            <h1>One Time Password (OTP)</h1>
            <p>Hi there,</p>
            <p>You recently requested to reset your password for your Book My Doctor account. Please use the following OTP to reset your password:</p>
            <h2 style="background-color: #f2f2f2; padding: 10px; border-radius: 5px; display: inline-block;">${otp}</h2>
            <p>If you did not make this request, you can safely ignore this email.</p>
            <p>Thank you for choosing Book My Doctor account!</p>
          </div>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);

    res.status(200).json({ message: "OTP sent to your email." });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
};

exports.forgotPasswordForAdmin = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: "Email is required." });
    }
    const user = await Admin.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    user.otp = otp;
    user.otpExpiresAt = Date.now() + 5 * 60 * 1000; // OTP valid for 5 minutes
    await user.save();

    const mailOptions = {
      from: process.env.MAIL_USERNAME,
      to: user.email,
      subject: "Password Reset OTP",
      html: `
        <div class="container">
          <div class="content">
            <h1>One Time Password (OTP)</h1>
            <p>Hi there,</p>
            <p>You recently requested to reset your password for your Book My Doctor account. Please use the following OTP to reset your password:</p>
            <h2 style="background-color: #f2f2f2; padding: 10px; border-radius: 5px; display: inline-block;">${otp}</h2>
            <p>If you did not make this request, you can safely ignore this email.</p>
            <p>Thank you for choosing Book My Doctor account!</p>
          </div>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);

    res.status(200).json({ message: "OTP sent to your email." });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
};

exports.resetPasswordForUser = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const user = await User.findOne({
      email,
      otp,
      otpExpiresAt: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        message: "Invalid OTP or otp has been expired.",
      });
    }

    user.password = newPassword;
    user.otp = undefined;
    user.otpExpiresAt = undefined;
    await user.save();

    res.status(200).json({ message: "Password reset successful." });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
};

exports.resetPasswordForClinic = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const user = await ClinicAdmin.findOne({
      email,
      otp,
      otpExpiresAt: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        message: "Invalid OTP or otp has been expired.",
      });
    }

    user.password = newPassword;
    user.otp = undefined;
    user.otpExpiresAt = undefined;
    await user.save();

    res.status(200).json({ message: "Password reset successful." });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
};

exports.resetPasswordForAdmin = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const user = await Admin.findOne({
      email,
      otp,
      otpExpiresAt: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        message: "Invalid OTP or otp has been expired.",
      });
    }

    user.password = newPassword;
    user.otp = undefined;
    user.otpExpiresAt = undefined;
    await user.save();

    res.status(200).json({ message: "Password reset successful." });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
};

exports.changePassword = async (req, res) => {
  try {
    const userId = req.user._id;
    const userRole = req.user.role;
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({ message: "All fields are required" });
    }
    let user;
    if (userRole === "user") {
      user = await User.findById(userId);
    } else if (userRole === "admin") {
      user = await Admin.findById(userId);
    } else {
      user = await ClinicAdmin.findById(userId);
    }
    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Old password is incorrect." });
    }

    user.password = newPassword;
    await user.save();

    res.status(200).json({ message: "Password changed successfully." });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
};

exports.getAccessToken = async (req, res) => {
  try {
    const authHeader = req.header("Authorization");
    console.log(authHeader);
    if (!authHeader) {
      return res
        .status(401)
        .json({ message: "No token, authorization denied." });
    }

    const refreshToken = authHeader.split(" ")[1];
    if (!refreshToken) {
      return res.status(401).json({ message: "Token format is incorrect." });
    }

    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    console.log(decoded);

    if (!decoded.id) {
      return res.status(401).json({ message: "Token is not valid" });
    }

    const user = { _id: decoded.id };
    const newAccessToken = generateToken(user);
    const newRefreshToken = generateRefreshToken(user);

    res
      .status(200)
      .json({ token: newAccessToken, refreshToken: newRefreshToken });
  } catch (error) {
    console.log("Error getting access token:", error);
    res
      .status(401)
      .json({ message: "Refresh token is not valid", error: error.message });
  }
};
