const mongoose = require("mongoose");

const patientSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },

    mobile1: {
      type: String,
    },

    mobile2: {
      type: String,
    },

    address: {
      type: String,
    },

    totalDue: {
      type: Number,
      default: 0,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

patientSchema.index({ name: "text" }); // Enable text search for name if needed, or just standard index
patientSchema.index({ name: 1 });
patientSchema.index({ updatedAt: -1 }); // Speeds up default sort in getPatients

module.exports = mongoose.model("Patient", patientSchema);
