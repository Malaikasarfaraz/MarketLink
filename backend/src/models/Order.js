const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
  nameSnapshot: { type: String, required: true },
  priceSnapshot: { type: Number, required: true },
  quantity: { type: Number, required: true, min: 1 }
}, { _id: false });

const orderSchema = new mongoose.Schema({
  customer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  farmer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  market: { type: mongoose.Schema.Types.ObjectId, ref: "Market", required: true },
  pickupSlot: { type: mongoose.Schema.Types.ObjectId, ref: "PickupSlot", required: true },
  items: { type: [orderItemSchema], validate: v => v.length > 0 },
  totalAmount: { type: Number, required: true, min: 0 },
  status: {
    type: String,
    enum: ["PLACED", "ACCEPTED", "READY_FOR_PICKUP", "COMPLETED", "DECLINED", "CANCELLED"],
    default: "PLACED"
  },
  pickupDate: { type: Date, required: true },
  cancellationReason: String,
  cutoffAt: { type: Date, required: true }
}, { timestamps: true });

orderSchema.index({ customer: 1, createdAt: -1 });
orderSchema.index({ farmer: 1, status: 1 });

module.exports = mongoose.model("Order", orderSchema);
