const mongoose = require("mongoose");

const labTestAppointment = new mongoose.Schema(
  {
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    fullName: {
      type: String,
      required: true,
    },
    age: {
      type: Number,
      required: true,
    },
    gender: {
      type: String,
      required: true,
    },
    phoneNumber: {
      type: String,
      required: true,
    },
    appointmentDate: {
      type: String,
      required: true,
    },

    paymentMethod: {
      type: String,
      required: true,
    },

    totalAmount: {
      type: Number,
      required: true,
    },
    orderId: {
      type: String,
      required: true,
    },
    amountPaid: {
      type: Number,
      required: true,
    },
    paymentId: {
      type: String,
    },
    clinicId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Clinic",
      required: true,
    },
    address: {
      type: String,
    },
    bookingCommission: {
      type: Number,
      default: 0,
    },
    testNames: {
      type: String,
    },
    testDescriptions: {
      type: String,
    },
    testFees: {
      type: Number,
    },
    testFeeDetails: {
      type: String,
    },
    clinicName: {
      type: String,
    },
    clinicNumber: {
      type: String,
    },
    clinicAddress: {
      type: String,
    },
    paymentStatus: {
      type: String,
      required: true,
    },
    termsAccepted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("LabTestAppointment", labTestAppointment);
