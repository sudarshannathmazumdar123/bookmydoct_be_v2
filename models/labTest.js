const mongoose = require("mongoose");

const LabTestSchema = new mongoose.Schema({
  name: {
    type: String,
  },

  description: {
    type: String,
  },
  price: {
    type: Number,
  },
  clinicId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Clinic",
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("LabTest", LabTestSchema);
