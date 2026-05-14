const express = require("express");
const router = express.Router();
const {
  addMedicine,
  getMedicines,
  updateStock,
  updateMedicine,
  deleteMedicine,
} = require("../controllers/medicineController");
const { protect } = require("../middleware/authMiddleware");

router.route("/").post(protect, addMedicine).get(protect, getMedicines);

router.route("/:id/stock").put(protect, updateStock);

router.route("/:id").put(protect, updateMedicine).delete(protect, deleteMedicine);

module.exports = router;
