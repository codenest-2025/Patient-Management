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

// @desc    Update visit (Admin only)
// @route   PUT /api/visits/:id
const updateVisit = async (req, res) => {
  try {
    const { medicines, payableAmount, paidAmount, purpose } = req.body;
    const oldVisit = await Visit.findById(req.params.id);

    if (!oldVisit) {
      return res.status(404).json({ message: "Visit not found" });
    }

    // 1. Revert old stock changes
    for (const item of oldVisit.medicines) {
      await Medicine.findByIdAndUpdate(item.medicineId, {
        $inc: { stock: item.quantity },
      });
    }

    // 2. Revert old patient due
    await Patient.findByIdAndUpdate(oldVisit.patientId, {
      $inc: { totalDue: -oldVisit.dueAmount },
    });

    // 3. Calculate new due
    const newDueAmount = payableAmount - paidAmount;

    // 4. Apply new stock changes
    for (const item of medicines) {
      await Medicine.findByIdAndUpdate(item.medicineId, {
        $inc: { stock: -item.quantity },
      });
    }

    // 5. Apply new patient due
    await Patient.findByIdAndUpdate(oldVisit.patientId, {
      $inc: { totalDue: newDueAmount },
    });

    // 6. Update visit
    oldVisit.medicines = medicines;
    oldVisit.payableAmount = payableAmount;
    oldVisit.paidAmount = paidAmount;
    oldVisit.dueAmount = newDueAmount;
    oldVisit.purpose = purpose;

    const updatedVisit = await oldVisit.save();

    getIO().emit("visit_added"); // Re-use event to trigger refresh
    getIO().emit("patient_changed");
    getIO().emit("stock_changed");

    res.json(updatedVisit);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  addVisit,
  getVisits,
  updateVisit,
};
