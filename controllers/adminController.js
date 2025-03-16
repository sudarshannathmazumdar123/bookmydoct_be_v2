const AdminCommission = require("../models/adminCommission");
const Clinic = require("../models/clinic");

exports.commissionFees = async (req, res) => {
  const { platFormFee, bookingCommission, labTestCommissionPercentage } =
    req.body;

  if (
    isNaN(platFormFee) ||
    isNaN(bookingCommission) ||
    isNaN(labTestCommissionPercentage)
  ) {
    return res.status(400).json({
      message:
        "platFormFee, labTestCommissionPercentage and bookingCommission must be a number",
    });
  }

  if (platFormFee <= 0) {
    return res
      .status(400)
      .json({ message: "Platform fee must be greater than 0." });
  }

  try {
    const data = await AdminCommission.findOneAndUpdate(
      {},
      {
        $set: { platFormFee, bookingCommission, labTestCommissionPercentage },
      },
      { upsert: true, new: true }
    );

    return res
      .status(200)
      .json({ message: "Fees data updated successfully.", data });
  } catch (error) {
    console.log(error);
    res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
};

exports.getCommissionFeeDetails = async (req, res) => {
  try {
    const data = await AdminCommission.findOne({});
    res.status(200).json({ data });
  } catch (error) {
    console.log("Error getting commission fees:", error);
    res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
};

exports.getUnVerifiedClinics = async (req, res) => {
  try {
    const data = await Clinic.find({ isVerified: false });
    res.status(200).json({ clinics: data });
  } catch (error) {
    console.log("Error getting unverified clinics:", error);
    res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
};

exports.addSpecialization = async (req, res) => {
  try {
    const { specialization } = req.body;
    if (!specialization) {
      return res.status(400).json({ message: "Specialization is required." });
    }
    await AdminCommission.findOneAndUpdate(
      {},
      { $addToSet: { specializations: specialization } },
      { upsert: true, new: true }
    );
    res.status(200).json({ message: "Specialization added successfully" });
  } catch (error) {
    console.log("Error adding specialization:", error);
    res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
};

exports.deleteSpecialization = async (req, res) => {
  try {
    const { specialization } = req.body;
    if (!specialization) {
      return res.status(400).json({ message: "Specialization is required." });
    }
    await AdminCommission.findOneAndUpdate(
      {},
      { $pull: { specializations: specialization } },
      { upsert: true, new: true }
    );
    res.status(200).json({ message: "Specialization deleted successfully" });
  } catch (error) {
    console.log("Error deleting specialization:", error);
    res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
};
