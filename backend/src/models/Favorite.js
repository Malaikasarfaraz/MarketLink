const mongoose = require("mongoose");

const favoriteSchema = new mongoose.Schema({
  customer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  type: { type: String, enum: ["farmer", "product", "market"], required: true },
  farmer: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  product: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
  market: { type: mongoose.Schema.Types.ObjectId, ref: "Market" }
}, { timestamps: true });

// A customer can save each target only once.
favoriteSchema.index({ customer: 1, type: 1, farmer: 1, product: 1, market: 1 }, { unique: true });

module.exports = mongoose.model("Favorite", favoriteSchema);
