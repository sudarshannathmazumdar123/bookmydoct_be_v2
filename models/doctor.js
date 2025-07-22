const mongoose = require("mongoose");
const clinic = require("./clinic");

const doctorSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true,
    },
    doctorNotes: {
      type: String,
    },
    email: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      default: "doctor",
    },
    specialization: {
      type: String,
      required: true,
    },
    medicalDegree: {
      type: String,
    },
    registrationNumber: {
      type: String,
      required: true,
    },
    address: {
      type: String,
    },
    clinics: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Clinic",
      },
    ],
    gender: {
      type: String,
    },
    phoneNumber: {
      type: String,
    },
    experience: {
      type: Number,
    },
    available: {
      type: Boolean,
      default: true,
    },
    disable: {
      type: Boolean,
      default: false,
    },
    fees: [
      {
        clinicId: { type: mongoose.Schema.Types.ObjectId, ref: "Clinic" },
        fee: { type: Number },
      },
    ],
    appointmentsSchedule: [
      {
        clinicId: { type: mongoose.Schema.Types.ObjectId, ref: "Clinic" },
        schedule: [
          {
            day: { type: String },
            startTime: { type: String },
            endTime: { type: String },
            maxSlots: { type: Number, default: 0 },
          },
        ],
      },
    ],
    termsAccepted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Doctor", doctorSchema);
