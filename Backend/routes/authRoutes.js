const express = require("express");
const router = express.Router();
const {
  loginUser,
  registerUser,
  getUsers,
  updateUser,
  deleteUser,
} = require("../controllers/authController");
const { protect, isAdmin } = require("../middleware/authMiddleware");

router.post("/login", loginUser);
router.post("/register", protect, isAdmin, registerUser);
router.get("/users", protect, isAdmin, getUsers);
router.route("/users/:id").put(protect, isAdmin, updateUser).delete(protect, isAdmin, deleteUser);

module.exports = router;
