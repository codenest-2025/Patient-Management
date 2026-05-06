const express = require("express");
const router = express.Router();
const { clearDue } = require("../controllers/paymentController");
const { protect } = require("../middleware/authMiddleware");

router.post("/clear-due", protect, clearDue);

module.exports = router;
