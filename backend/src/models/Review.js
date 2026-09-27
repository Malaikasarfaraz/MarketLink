const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema({
  customer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  farmer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
  order: { type: mongoose.Schema.Types.ObjectId, ref: "Order", required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, trim: true },
  farmerResponse: String,
  isVisible: { type: Boolean, default: true }
}, { timestamps: true });

reviewSchema.index({ product: 1, createdAt: -1 });
reviewSchema.index({ customer: 1, order: 1, product: 1 }, { unique: true });

module.exports = mongoose.model("Review", reviewSchema);
