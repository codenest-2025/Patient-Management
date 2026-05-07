const express = require("express");
const router = express.Router();
const { loginUser, registerUser } = require("../controllers/authController");
const { protect, isAdmin } = require("../middleware/authMiddleware");

router.post("/login", loginUser);
router.post("/register", protect, isAdmin, registerUser);

module.exports = router;
