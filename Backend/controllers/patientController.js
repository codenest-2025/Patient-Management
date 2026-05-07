const Patient = require("../models/Patient");
const { getIO } = require("../config/socket");

// @desc    Add new patient
// @route   POST /api/patients
const addPatient = async (req, res) => {
  try {
    const patient = await Patient.create(req.body);
    getIO().emit("patient_changed");
    res.status(201).json(patient);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all patients
// @route   GET /api/patients
const getPatients = async (req, res) => {
  const { search, hasDue, page = 1, limit = 10 } = req.query;
  const skip = (page - 1) * limit;

  let query = {};

  if (search) {
    query = {
      $or: [
        { name: { $regex: search, $options: "i" } },
        { mobile1: { $regex: search, $options: "i" } },
      ],
    };
  }

  if (hasDue === "true") {
    query.totalDue = { $gt: 0 };
  }

  try {
    const [total, patients] = await Promise.all([
      Patient.countDocuments(query),
      Patient.find(query)
        .sort({ updatedAt: -1 })
        .skip(parseInt(skip))
        .limit(parseInt(limit))
        .lean()
    ]);

    res.json({
      patients,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get patient by ID
// @route   GET /api/patients/:id
const getPatientById = async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.id);
    if (patient) {
      res.json(patient);
    } else {
      res.status(404).json({ message: "Patient not found" });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update patient
// @route   PUT /api/patients/:id
const updatePatient = async (req, res) => {
  try {
    const patient = await Patient.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    if (patient) {
      getIO().emit("patient_changed");
      res.json(patient);
    } else {
      res.status(404).json({ message: "Patient not found" });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete patient
// @route   DELETE /api/patients/:id
const deletePatient = async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.id);
    if (patient) {
      await patient.deleteOne();
      getIO().emit("patient_changed");
      res.json({ message: "Patient removed" });
    } else {
      res.status(404).json({ message: "Patient not found" });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  addPatient,
  getPatients,
  getPatientById,
  updatePatient,
  deletePatient,
};
