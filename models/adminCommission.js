const mongoose = require("mongoose");

const adminCommissionSchema = new mongoose.Schema(
  {
    platFormFee: {
      type: Number,
      default: 1,
      required: true,
    },
    bookingCommission: {
      type: Number,
      default: 0,
      required: true,
    },
    specializations: [{ type: String }],
    labTestCommissionPercentage: {
      type: Number,
      default: 0,
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("AdminCommission", adminCommissionSchema);
