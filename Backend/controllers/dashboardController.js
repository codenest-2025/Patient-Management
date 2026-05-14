const Patient = require("../models/Patient");
const Medicine = require("../models/Medicine");
const Visit = require("../models/Visit");

// @desc    Get dashboard summary
// @route   GET /api/dashboard/summary
const getSummary = async (req, res) => {
  try {
    const [totalPatients, totalMedicines, totalVisits, dueAggregation, lowStockMedicines] = await Promise.all([
      Patient.estimatedDocumentCount(),   // O(1) — reads collection metadata, no scan
      Medicine.estimatedDocumentCount(),  // O(1) — reads collection metadata, no scan
      Visit.estimatedDocumentCount(),     // O(1) — reads collection metadata, no scan
      Patient.aggregate([
        { $match: { totalDue: { $gt: 0 } } },
        { $group: { _id: null, total: { $sum: "$totalDue" } } }
      ]),
      Medicine.find({ stock: { $lte: 2 } }).sort({ stock: 1 }).limit(20).lean() // sorted: most critical first
    ]);

    const totalDueAmount = dueAggregation.length > 0 ? dueAggregation[0].total : 0;

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
