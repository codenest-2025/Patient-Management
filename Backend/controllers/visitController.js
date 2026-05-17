const mongoose = require("mongoose");
const Visit = require("../models/Visit");
const Medicine = require("../models/Medicine");
const Patient = require("../models/Patient");
const { getIO } = require("../config/socket");

// @desc    Add new visit
// @route   POST /api/visits
const addVisit = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { patientId, medicines, payableAmount, paidAmount, purpose } = req.body;

    // 1. Validation & Stock Check
    if (!patientId || !medicines || !Array.isArray(medicines)) {
      throw new Error("Invalid input data");
    }

    for (const item of medicines) {
      const medicine = await Medicine.findById(item.medicineId).session(session);
      if (!medicine) throw new Error(`Medicine not found: ${item.medicineId}`);
      if (medicine.stock < item.quantity) {
        throw new Error(`Insufficient stock for ${medicine.name}. Available: ${medicine.stock}`);
      }
      
      // Stock deduction
      medicine.stock -= item.quantity;
      await medicine.save({ session });
    }

    const dueAmount = (payableAmount || 0) - (paidAmount || 0);

    // 2. Update patient due
    const patient = await Patient.findById(patientId).session(session);
    if (!patient) throw new Error("Patient not found");
    
    patient.totalDue = (patient.totalDue || 0) + dueAmount;
    await patient.save({ session });

    // 3. Create visit
    const visit = await Visit.create(
      [
        {
          patientId,
          medicines,
          payableAmount,
          paidAmount,
          dueAmount,
          purpose,
        },
      ],
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    getIO().emit("visit_added");
    getIO().emit("patient_changed");
    getIO().emit("stock_changed");

    res.json(visit[0]);
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    res.status(400).json({ message: error.message });
  }
};

// @desc    Get all visits
// @route   GET /api/visits
const getVisits = async (req, res) => {
  const { search, patientId, startDate, endDate, page = 1, limit = 20 } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  try {
    const matchStage = {};

    if (patientId) {
      matchStage.patientId = new mongoose.Types.ObjectId(patientId);
    }

    if (startDate || endDate) {
      matchStage.visitDate = {};
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        matchStage.visitDate.$gte = start;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        matchStage.visitDate.$lte = end;
      }
    }

    const basePipeline = [
      { $match: matchStage },
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

    if (search) {
      const regex = { $regex: search, $options: "i" };
      basePipeline.push({
        $match: {
          $or: [{ "patientId.name": regex }, { purpose: regex }],
        },
      });
    }

    const [countResult, visits] = await Promise.all([
      Visit.aggregate([...basePipeline, { $count: "total" }]),
      Visit.aggregate([
        ...basePipeline,
        { $sort: { visitDate: -1 } },
        { $skip: skip },
        { $limit: parseInt(limit) },
        {
          $lookup: {
            from: "medicines",
            localField: "medicines.medicineId",
            foreignField: "_id",
            as: "_medicineDetails",
          },
        },
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
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { medicines, payableAmount, paidAmount, purpose } = req.body;
    const oldVisit = await Visit.findById(req.params.id).session(session);

    if (!oldVisit) {
      throw new Error("Visit not found");
    }

    // 1. Revert old stock changes
    for (const item of oldVisit.medicines) {
      await Medicine.findByIdAndUpdate(
        item.medicineId,
        { $inc: { stock: item.quantity } },
        { session }
      );
    }

    // 2. Revert old patient due
    await Patient.findByIdAndUpdate(
      oldVisit.patientId,
      { $inc: { totalDue: -oldVisit.dueAmount } },
      { session }
    );

    // 3. Validation & New Stock Check
    for (const item of medicines) {
      const medicine = await Medicine.findById(item.medicineId).session(session);
      if (!medicine) throw new Error(`Medicine not found: ${item.medicineId}`);
      if (medicine.stock < item.quantity) {
        throw new Error(`Insufficient stock for ${medicine.name}. Available: ${medicine.stock}`);
      }
      
      // Apply new stock deduction
      medicine.stock -= item.quantity;
      await medicine.save({ session });
    }

    // 4. Apply new patient due
    const newDueAmount = (payableAmount || 0) - (paidAmount || 0);
    await Patient.findByIdAndUpdate(
      oldVisit.patientId,
      { $inc: { totalDue: newDueAmount } },
      { session }
    );

    // 5. Update visit
    oldVisit.medicines = medicines;
    oldVisit.payableAmount = payableAmount;
    oldVisit.paidAmount = paidAmount;
    oldVisit.dueAmount = newDueAmount;
    oldVisit.purpose = purpose;

    const updatedVisit = await oldVisit.save({ session });

    await session.commitTransaction();
    session.endSession();

    getIO().emit("visit_added");
    getIO().emit("patient_changed");
    getIO().emit("stock_changed");

    res.json(updatedVisit);
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    res.status(400).json({ message: error.message });
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

// @desc    Delete visit (Admin only)
// @route   DELETE /api/visits/:id
const deleteVisit = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const visit = await Visit.findById(req.params.id).session(session);

    if (!visit) {
      return res.status(404).json({ message: "Visit not found" });
    }

    // 1. Revert old stock changes
    for (const item of visit.medicines) {
      await Medicine.findByIdAndUpdate(
        item.medicineId,
        { $inc: { stock: item.quantity } },
        { session }
      );
    }

    // 2. Revert old patient due
    await Patient.findByIdAndUpdate(
      visit.patientId,
      { $inc: { totalDue: -visit.dueAmount } },
      { session }
    );

    // 3. Delete visit
    await Visit.findByIdAndDelete(req.params.id).session(session);

    await session.commitTransaction();
    session.endSession();

    getIO().emit("visit_added");
    getIO().emit("patient_changed");
    getIO().emit("stock_changed");

    res.json({ message: "Visit history deleted and stock/dues auto adjusted" });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    res.status(400).json({ message: error.message });
  }
};

module.exports = {
  addVisit,
  getVisits,
  updateVisit,
  getVisitById,
  deleteVisit,
};

