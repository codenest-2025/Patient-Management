const express = require("express");
const router = express.Router();
const { addVisit, getVisits, updateVisit } = require("../controllers/visitController");
const { protect, isAdmin } = require("../middleware/authMiddleware");

router.route("/").post(protect, addVisit).get(protect, getVisits);
router.route("/:id").put(protect, isAdmin, updateVisit);

module.exports = router;
