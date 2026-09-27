const mongoose = require("mongoose");

const marketSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  address: { type: String, required: true, trim: true },
  operatingDays: [{ type: String, trim: true }],
  openingTime: String,
  closingTime: String,
  latitude: Number,
  longitude: Number,
  mapProvider: { type: String, enum: ["OpenStreetMap", "Google Maps"], default: "OpenStreetMap" },
  mapLink: String,
  farmers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model("Market", marketSchema);
