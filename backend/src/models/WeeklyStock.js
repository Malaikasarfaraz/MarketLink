const mongoose = require("mongoose");

const weeklyStockSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
  farmer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  weekStart: { type: Date, required: true },
  quantity: { type: Number, required: true, min: 0 },
  soldQuantity: { type: Number, default: 0, min: 0 },
  unit: { type: String, required: true, trim: true },
  price: { type: Number, min: 0 },
  soldOut: { type: Boolean, default: false },
  notes: { type: String, trim: true, maxlength: 500 }
}, { timestamps: true });

weeklyStockSchema.index({ product: 1, weekStart: 1 }, { unique: true });
weeklyStockSchema.index({ farmer: 1, weekStart: 1 });

module.exports = mongoose.model("WeeklyStock", weeklyStockSchema);
