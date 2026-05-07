const Medicine = require("../models/Medicine");
const { getIO } = require("../config/socket");

// @desc    Add new medicine
// @route   POST /api/medicines
const addMedicine = async (req, res) => {
  try {
    const medicine = await Medicine.create(req.body);
    getIO().emit("stock_changed");
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
    if (req.user.role === "manager" && amount < 0) {
      return res.status(403).json({ message: "Managers are not allowed to remove stock" });
    }

    const medicine = await Medicine.findByIdAndUpdate(
      req.params.id,
      { $inc: { stock: amount } },
      { new: true }
    );
    if (medicine) {
      getIO().emit("stock_changed");
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
    if (req.user.role === "manager") {
      return res.status(403).json({ message: "Managers are not allowed to delete medicines" });
    }

    const medicine = await Medicine.findById(req.params.id);
    if (medicine) {
      await medicine.deleteOne();
      getIO().emit("stock_changed");
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
