const mongoose = require("mongoose");

const pickupSlotSchema = new mongoose.Schema({
  farmer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  market: { type: mongoose.Schema.Types.ObjectId, ref: "Market", required: true },
  date: { type: Date, required: true },
  startTime: { type: String, required: true },
  endTime: { type: String, required: true },
  capacity: { type: Number, default: 10, min: 1 },
  bookedCount: { type: Number, default: 0, min: 0 },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

pickupSlotSchema.index({ farmer: 1, date: 1, startTime: 1 });

module.exports = mongoose.model("PickupSlot", pickupSlotSchema);
