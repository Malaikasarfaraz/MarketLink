const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  // Password is only required for accounts created with email/password.
  // Google-authenticated accounts (googleId set) never need one.
  password: {
    type: String,
    minlength: 6,
    required: function () { return !this.googleId; }
  },
  googleId: { type: String, unique: true, sparse: true },
  phone: { type: String, trim: true },
  address: { type: String, trim: true },
  role: { type: String, enum: ["customer", "farmer", "admin"], default: "customer" },
  isActive: { type: Boolean, default: true },
  farmerProfile: {
    stallName: String,
    contactPerson: String,
    businessAddress: String,
    operatingDays: [String],
    pickupWindowStart: String,
    pickupWindowEnd: String,
    cutoffMinutes: { type: Number, default: 120 },
    latitude: Number,
    longitude: Number,
    markets: [{ type: mongoose.Schema.Types.ObjectId, ref: "Market" }],
    approvalStatus: { type: String, enum: ["pending", "approved", "suspended"], default: "pending" }
  }
}, { timestamps: true });

module.exports = mongoose.model("User", userSchema);
