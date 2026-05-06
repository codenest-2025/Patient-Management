const express = require("express");
const router = express.Router();
const { addVisit, getVisits } = require("../controllers/visitController");
const { protect } = require("../middleware/authMiddleware");

router.route("/").post(protect, addVisit).get(protect, getVisits);

module.exports = router;
