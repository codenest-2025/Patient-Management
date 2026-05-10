const mongoose = require("mongoose");
const Visit = require("../models/Visit");
const Medicine = require("../models/Medicine");
const Patient = require("../models/Patient");
const { getIO } = require("../config/socket");

// @desc    Add new visit
// @route   POST /api/visits
const addVisit = async (req, res) => {
  try {
    const { patientId, medicines, payableAmount, paidAmount, purpose } = req.body;

    const dueAmount = payableAmount - paidAmount;

    // Stock deduction
    for (const item of medicines) {
      await Medicine.findByIdAndUpdate(item.medicineId, {
        $inc: {
          stock: -item.quantity,
        },
      });
    }

    // Update patient due
    await Patient.findByIdAndUpdate(patientId, {
      $inc: {
        totalDue: dueAmount,
      },
    });

    const visit = await Visit.create({
      patientId,
      medicines,
      payableAmount,
      paidAmount,
      dueAmount,
      purpose,
    });

    getIO().emit("visit_added");
    getIO().emit("patient_changed");
    getIO().emit("stock_changed");

    res.json(visit);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all visits
// @route   GET /api/visits
const getVisits = async (req, res) => {
  const { search, patientId, startDate, endDate, page = 1, limit = 20 } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  try {
    // --- Build the initial $match stage ---
    const matchStage = {};

    if (patientId) {
      matchStage.patientId = new mongoose.Types.ObjectId(patientId);
    }

    if (startDate || endDate) {
      matchStage.visitDate = {};
      if (startDate) matchStage.visitDate.$gte = new Date(startDate);
      if (endDate)   matchStage.visitDate.$lte = new Date(endDate);
    }

    // Base pipeline shared between count and data queries
    const basePipeline = [
      { $match: matchStage },
      // Join patient so we can filter by name in the same round trip
      {
        $lookup: {
          from: "patients",
          localField: "patientId",
          foreignField: "_id",
          as: "patientId",
        },
      },
      { $unwind: { path: "$patientId", preserveNullAndEmptyArrays: true } },
    ];

    // If searching, filter by patient name OR visit purpose after the lookup
    if (search) {
      const regex = { $regex: search, $options: "i" };
      basePipeline.push({
        $match: {
          $or: [
            { "patientId.name": regex },
            { purpose: regex },
          ],
        },
      });
    }

    // Run count and paginated data in parallel
    const [countResult, visits] = await Promise.all([
      Visit.aggregate([...basePipeline, { $count: "total" }]),
      Visit.aggregate([
        ...basePipeline,
        { $sort: { visitDate: -1 } },
        { $skip: skip },
        { $limit: parseInt(limit) },
        // Join medicine details
        {
          $lookup: {
            from: "medicines",
            localField: "medicines.medicineId",
            foreignField: "_id",
            as: "_medicineDetails",
          },
        },
        // Merge medicine detail back into each medicines array element
        {
          $addFields: {
            medicines: {
              $map: {
                input: "$medicines",
                as: "med",
                in: {
                  quantity: "$$med.quantity",
                  medicineId: {
                    $arrayElemAt: [
                      {
                        $filter: {
                          input: "$_medicineDetails",
                          as: "detail",
                          cond: { $eq: ["$$detail._id", "$$med.medicineId"] },
                        },
                      },
                      0,
                    ],
                  },
                },
              },
            },
          },
        },
        { $project: { _medicineDetails: 0 } },
      ]),
    ]);

    const total = countResult.length > 0 ? countResult[0].total : 0;

    res.json({
      visits,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update visit (Admin only)
// @route   PUT /api/visits/:id
const updateVisit = async (req, res) => {
  try {
    const { medicines, payableAmount, paidAmount, purpose } = req.body;
    const oldVisit = await Visit.findById(req.params.id);

    if (!oldVisit) {
      return res.status(404).json({ message: "Visit not found" });
    }

    // 1. Revert old stock changes
    for (const item of oldVisit.medicines) {
      await Medicine.findByIdAndUpdate(item.medicineId, {
        $inc: { stock: item.quantity },
      });
    }

    // 2. Revert old patient due
    await Patient.findByIdAndUpdate(oldVisit.patientId, {
      $inc: { totalDue: -oldVisit.dueAmount },
    });

    // 3. Calculate new due
    const newDueAmount = payableAmount - paidAmount;

    // 4. Apply new stock changes
    for (const item of medicines) {
      await Medicine.findByIdAndUpdate(item.medicineId, {
        $inc: { stock: -item.quantity },
      });
    }

    // 5. Apply new patient due
    await Patient.findByIdAndUpdate(oldVisit.patientId, {
      $inc: { totalDue: newDueAmount },
    });

    // 6. Update visit
    oldVisit.medicines = medicines;
    oldVisit.payableAmount = payableAmount;
    oldVisit.paidAmount = paidAmount;
    oldVisit.dueAmount = newDueAmount;
    oldVisit.purpose = purpose;

    const updatedVisit = await oldVisit.save();

    getIO().emit("visit_added"); // Re-use event to trigger refresh
    getIO().emit("patient_changed");
    getIO().emit("stock_changed");

    res.json(updatedVisit);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get visit by ID
// @route   GET /api/visits/:id
const getVisitById = async (req, res) => {
  try {
    const visit = await Visit.findById(req.params.id)
      .populate("patientId")
      .populate("medicines.medicineId");
    if (!visit) {
      return res.status(404).json({ message: "Visit not found" });
    }
    res.json(visit);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  addVisit,
  getVisits,
  updateVisit,
  getVisitById,
};
