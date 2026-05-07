const Visit = require("../models/Visit");
const Medicine = require("../models/Medicine");
const Patient = require("../models/Patient");
const { getIO } = require("../config/socket");

// @desc    Add new visit
// @route   POST /api/visits
const addVisit = async (req, res) => {
  try {
    const { patientId, medicines, payableAmount, paidAmount, purpose } = req.body;

    const dueAmount = payableAmount - paidAmount;

    // Stock deduction
    for (const item of medicines) {
      await Medicine.findByIdAndUpdate(item.medicineId, {
        $inc: {
          stock: -item.quantity,
        },
      });
    }

    // Update patient due
    await Patient.findByIdAndUpdate(patientId, {
      $inc: {
        totalDue: dueAmount,
      },
    });

    const visit = await Visit.create({
      patientId,
      medicines,
      payableAmount,
      paidAmount,
      dueAmount,
      purpose,
    });

    getIO().emit("visit_added");
    getIO().emit("patient_changed");
    getIO().emit("stock_changed");

    res.json(visit);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all visits
// @route   GET /api/visits
const getVisits = async (req, res) => {
  try {
    const visits = await Visit.find()
      .populate("patientId")
      .populate("medicines.medicineId");

    res.json(visits);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  addVisit,
  getVisits,
};
