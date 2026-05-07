const mongoose = require("mongoose");

const visitSchema = new mongoose.Schema(
  {
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Patient",
    },

    medicines: [
      {
        medicineId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Medicine",
        },

        quantity: Number,
      },
    ],

    payableAmount: Number,

    paidAmount: Number,

    dueAmount: Number,

    purpose: String,

    visitDate: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

visitSchema.index({ patientId: 1, visitDate: -1 });

module.exports = mongoose.model("Visit", visitSchema);
