const Medicine = require("../models/Medicine");

// @desc    Add new medicine
// @route   POST /api/medicines
const addMedicine = async (req, res) => {
  try {
    const medicine = await Medicine.create(req.body);
    res.status(201).json(medicine);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all medicines
// @route   GET /api/medicines
const getMedicines = async (req, res) => {
  try {
    const medicines = await Medicine.find().sort({ name: 1 });
    res.json(medicines);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update medicine stock
// @route   PUT /api/medicines/:id/stock
const updateStock = async (req, res) => {
  const { amount } = req.body; // positive for increase, negative for decrease
  try {
    const medicine = await Medicine.findByIdAndUpdate(
      req.params.id,
      { $inc: { stock: amount } },
      { new: true }
    );
    if (medicine) {
      res.json(medicine);
    } else {
      res.status(404).json({ message: "Medicine not found" });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete medicine
// @route   DELETE /api/medicines/:id
const deleteMedicine = async (req, res) => {
  try {
    const medicine = await Medicine.findById(req.params.id);
    if (medicine) {
      await medicine.deleteOne();
      res.json({ message: "Medicine removed" });
    } else {
      res.status(404).json({ message: "Medicine not found" });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  addMedicine,
  getMedicines,
  updateStock,
  deleteMedicine,
};
