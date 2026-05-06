const express = require("express");
const router = express.Router();
const {
  addPatient,
  getPatients,
  getPatientById,
  updatePatient,
  deletePatient,
} = require("../controllers/patientController");
const { protect } = require("../middleware/authMiddleware");

router.route("/").post(protect, addPatient).get(protect, getPatients);

router
  .route("/:id")
  .get(protect, getPatientById)
  .put(protect, updatePatient)
  .delete(protect, deletePatient);

module.exports = router;
