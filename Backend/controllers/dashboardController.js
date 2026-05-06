const Patient = require("../models/Patient");
const Medicine = require("../models/Medicine");
const Visit = require("../models/Visit");

// @desc    Get dashboard summary
// @route   GET /api/dashboard/summary
const getSummary = async (req, res) => {
  try {
    const totalPatients = await Patient.countDocuments();
    const totalMedicines = await Medicine.countDocuments();
    const totalVisits = await Visit.countDocuments();

    const patientsWithDue = await Patient.find({ totalDue: { $gt: 0 } });
    const totalDueAmount = patientsWithDue.reduce(
      (acc, patient) => acc + patient.totalDue,
      0
    );

    const lowStockMedicines = await Medicine.find({ stock: { $lt: 10 } });

    res.json({
      totalPatients,
      totalMedicines,
      totalVisits,
      totalDueAmount,
      lowStockMedicines,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getSummary,
};
