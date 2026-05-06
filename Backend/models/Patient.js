const mongoose = require("mongoose");

const patientSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },

    mobile1: {
      type: String,
      required: true,
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
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Patient", patientSchema);
