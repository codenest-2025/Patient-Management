const Medicine = require("../models/Medicine");
const { getIO } = require("../config/socket");

// @desc    Add new medicine
// @route   POST /api/medicines
const addMedicine = async (req, res) => {
  try {
    const normalizedName = req.body.name?.trim();
    if (!normalizedName) {
      return res.status(400).json({ message: "Medicine name is required" });
    }

    const duplicate = await Medicine.findOne({
      name: { $regex: new RegExp(`^${normalizedName}$`, "i") }
    });

    if (duplicate) {
      return res.status(400).json({ message: "A medicine with this name already exists" });
    }

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
    query.stock = { $lte: 2 };
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

    const medicine = await Medicine.findById(req.params.id);
    if (!medicine) {
      return res.status(404).json({ message: "Medicine not found" });
    }

    if (medicine.stock + amount < 0) {
      return res.status(400).json({ message: `Insufficient stock. Current: ${medicine.stock}` });
    }

    medicine.stock += amount;
    await medicine.save();

    getIO().emit("stock_changed");
    res.json(medicine);
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

// @desc    Update medicine details
// @route   PUT /api/medicines/:id
const updateMedicine = async (req, res) => {
  try {
    if (req.user.role === "staff") {
      return res.status(403).json({ message: "Staff are not allowed to update medicines" });
    }

    const normalizedName = req.body.name?.trim();
    if (normalizedName) {
      const duplicate = await Medicine.findOne({
        _id: { $ne: req.params.id },
        name: { $regex: new RegExp(`^${normalizedName}$`, "i") }
      });
      if (duplicate) {
        return res.status(400).json({ message: "A medicine with this name already exists" });
      }
    }

    const medicine = await Medicine.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
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

module.exports = {
  addMedicine,
  getMedicines,
  updateStock,
  updateMedicine,
  deleteMedicine,
};
