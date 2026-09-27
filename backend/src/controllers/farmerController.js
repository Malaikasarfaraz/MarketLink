const User = require("../models/User");

function escapeRegex(value) { return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }
const Order = require("../models/Order");
const Product = require("../models/Product");

async function profile(req, res) {
  const farmer = await User.findById(req.params.id || req.user._id).select("-password").populate("farmerProfile.markets");
  if (!farmer || farmer.role !== "farmer") return res.status(404).json({ success: false, message: "Farmer not found" });
  res.json({ success: true, farmer });
}

async function updateProfile(req, res) {
  const farmer = await User.findById(req.user._id);
  if (!farmer || farmer.role !== "farmer") return res.status(403).json({ success: false, message: "Farmer access required" });
  const allowed = ["name", "phone", "address"];
  allowed.forEach(k => { if (req.body[k] !== undefined) farmer[k] = String(req.body[k]).trim(); });
  if (req.body.farmerProfile) {
    const incoming = req.body.farmerProfile;
    const current = farmer.farmerProfile?.toObject ? farmer.farmerProfile.toObject() : (farmer.farmerProfile || {});
    const next = { ...current };
    ["stallName", "contactPerson", "businessAddress", "pickupWindowStart", "pickupWindowEnd"].forEach(k => { if (incoming[k] !== undefined) next[k] = String(incoming[k]).trim(); });
    if (incoming.operatingDays !== undefined) next.operatingDays = Array.isArray(incoming.operatingDays) ? incoming.operatingDays : [];
    if (incoming.latitude !== undefined && incoming.latitude !== "") next.latitude = Number(incoming.latitude);
    if (incoming.longitude !== undefined && incoming.longitude !== "") next.longitude = Number(incoming.longitude);
    if (incoming.cutoffMinutes !== undefined) {
      const cutoff = Number(incoming.cutoffMinutes);
      if (!Number.isFinite(cutoff) || cutoff < 0 || cutoff > 1440) return res.status(400).json({ success: false, message: "Cutoff minutes must be between 0 and 1440" });
      next.cutoffMinutes = cutoff;
    }
    farmer.farmerProfile = next;
  }
  await farmer.save();
  const safe = farmer.toObject(); delete safe.password;
  res.json({ success: true, farmer: safe });
}

async function insights(req, res) {
  const match = { farmer: req.user._id };
  const [orders, revenue, topProducts] = await Promise.all([
    Order.countDocuments({ ...match }),
    Order.aggregate([{ $match: { ...match, status: "COMPLETED" } }, { $group: { _id: null, total: { $sum: "$totalAmount" } } }]),
    Order.aggregate([
      { $match: { ...match, status: "COMPLETED" } }, { $unwind: "$items" },
      { $group: { _id: "$items.nameSnapshot", quantity: { $sum: "$items.quantity" }, revenue: { $sum: { $multiply: ["$items.priceSnapshot", "$items.quantity"] } } } },
      { $sort: { quantity: -1 } }, { $limit: 10 }
    ])
  ]);
  const pending = await Order.countDocuments({ ...match, status: { $in: ["PLACED", "ACCEPTED"] } });
  res.json({ success: true, insights: { totalOrders: orders, pendingOrders: pending, revenue: revenue[0]?.total || 0, bestSellingProducts: topProducts } });
}

function distanceKm(lat1, lon1, lat2, lon2) {
  const r = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return r * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function listFarmers(req, res) {
  const filter = { role: "farmer", "farmerProfile.approvalStatus": "approved", isActive: true };
  if (req.query.search) { const q=escapeRegex(String(req.query.search).slice(0,80)); filter.$or=[{name:{$regex:q,$options:"i"}},{"farmerProfile.stallName":{$regex:q,$options:"i"}},{"farmerProfile.businessAddress":{$regex:q,$options:"i"}}]; }
  if (req.query.day) filter["farmerProfile.operatingDays"] = req.query.day;
  let farmers = await User.find(filter).select("-password").populate("farmerProfile.markets", "name address operatingDays latitude longitude");

  if (req.query.lat !== undefined || req.query.lng !== undefined || req.query.radiusKm !== undefined) {
    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);
    const radius = req.query.radiusKm === undefined ? 25 : Number(req.query.radiusKm);
    if (!Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lng) || lng < -180 || lng > 180 || !Number.isFinite(radius) || radius <= 0 || radius > 500) {
      return res.status(400).json({ success: false, message: "Invalid location or radius" });
    }
    farmers = farmers.map(f => {
      const x = f.toObject();
      const fLat = Number(x.farmerProfile?.latitude);
      const fLng = Number(x.farmerProfile?.longitude);
      if (Number.isFinite(fLat) && Number.isFinite(fLng)) x.distanceKm = Number(distanceKm(lat, lng, fLat, fLng).toFixed(2));
      return x;
    }).filter(f => Number.isFinite(f.distanceKm) && f.distanceKm <= radius).sort((a, b) => a.distanceKm - b.distanceKm);
  }
  res.json({ success: true, farmers });
}

module.exports = { profile, updateProfile, insights, listFarmers };
