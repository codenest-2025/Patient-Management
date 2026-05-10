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
  const { search, lowStock, page = 1, limit = 20 } = req.query;
  const skip = (page - 1) * limit;

  let query = {};

  if (search) {
    query.name = { $regex: search, $options: "i" };
  }

  if (lowStock === "true") {
    query.stock = { $lt: 10 };
  }

  try {
    const [total, medicines] = await Promise.all([
      Medicine.countDocuments(query),
      Medicine.find(query)
        .sort({ name: 1 })
        .skip(parseInt(skip))
        .limit(parseInt(limit))
        .lean()
    ]);

    res.json({
      medicines,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update medicine stock
// @route   PUT /api/medicines/:id/stock
const updateStock = async (req, res) => {
  const { amount } = req.body; // positive for increase, negative for decrease
  try {
    if (req.user.role === "staff" && amount < 0) {
      return res.status(403).json({ message: "Staff are not allowed to remove stock" });
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
    if (req.user.role === "staff") {
      return res.status(403).json({ message: "Staff are not allowed to delete medicines" });
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
