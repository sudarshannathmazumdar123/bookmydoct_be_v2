const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const clinicAdminSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    address: {
      type: String,
    },
    role: {
      type: String,
      default: "clinic",
    },
    phoneNumber: {
      type: String,
    },
    clinicId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Clinic",
    },

    otpExpiresAt: {
      type: Date,
    },
    otp: {
      type: String,
    },
  },
  { timestamps: true }
);

clinicAdminSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    return next();
  }
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

module.exports = mongoose.model("ClinicAdmin", clinicAdminSchema);
