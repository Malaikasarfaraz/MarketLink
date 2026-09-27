const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
  farmer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  market: { type: mongoose.Schema.Types.ObjectId, ref: "Market", required: true },
  category: { type: mongoose.Schema.Types.ObjectId, ref: "Category", required: true },
  name: { type: String, required: true, trim: true },
  description: String,
  price: { type: Number, required: true, min: 0 },
  unit: { type: String, required: true, trim: true },
  quantityAvailable: { type: Number, required: true, min: 0 },
  image: String,
  imagePublicId: String,
  soldOut: { type: Boolean, default: false },
  temporarilyUnavailable: { type: Boolean, default: false },
  adminModerationBlocked: { type: Boolean, default: false },
  weeklyStockTemplate: {
    enabled: { type: Boolean, default: false },
    defaultQuantity: Number,
    notes: String
  }
}, { timestamps: true });

productSchema.index({ name: "text", description: "text" });
productSchema.index({ farmer: 1, market: 1, category: 1, price: 1 });

module.exports = mongoose.model("Product", productSchema);
