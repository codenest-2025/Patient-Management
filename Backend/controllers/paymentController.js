const Patient = require("../models/Patient");
const Visit = require("../models/Visit");

// @desc    Clear due amount for a patient
// @route   POST /api/payments/clear-due
const clearDue = async (req, res) => {
  const { patientId, amountPaid, notes } = req.body;

  try {
    const patient = await Patient.findById(patientId);

    if (!patient) {
      return res.status(404).json({ message: "Patient not found" });
    }

    // Update patient's total due
    patient.totalDue -= amountPaid;
    await patient.save();

    // Optionally create a "Payment" visit or record to track this transaction
    const visit = await Visit.create({
      patientId,
      medicines: [], // No medicines for just a payment clearance
      payableAmount: 0,
      paidAmount: amountPaid,
      dueAmount: -amountPaid, // This reflects a payment towards old due
      purpose: notes || "Due Clearance",
      visitDate: new Date(),
    });

    res.json({
      message: "Payment recorded successfully",
      newTotalDue: patient.totalDue,
      visit,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  clearDue,
};
