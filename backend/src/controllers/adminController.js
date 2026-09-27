const User = require("../models/User");
const Market = require("../models/Market");
const Product = require("../models/Product");
const Order = require("../models/Order");
const Category = require("../models/Category");
const Notification = require("../models/Notification");
const { sendFarmerApprovalEmail } = require("../services/emailService");

async function dashboard(req, res) {
  const [
    farmers,
    customers,
    markets,
    orders,
    revenue,
    activeFarmers,
    pendingFarmers,
    suspendedFarmers,
    activeCustomers,
    pendingOrders,
    readyOrders,
    totalProducts,
    flaggedProducts,
    totalReviews,
    visibleReviews,
    recentUsers,
    recentOrders,
    ordersByStatus
  ] = await Promise.all([
    User.countDocuments({ role: "farmer" }),
    User.countDocuments({ role: "customer" }),
    Market.countDocuments({ isActive: true }),
    Order.countDocuments(),
    Order.aggregate([{ $match: { status: "COMPLETED" } }, { $group: { _id: null, total: { $sum: "$totalAmount" } } }]),
    User.countDocuments({ role: "farmer", "farmerProfile.approvalStatus": "approved", isActive: true }),
    User.countDocuments({ role: "farmer", "farmerProfile.approvalStatus": "pending" }),
    User.countDocuments({ role: "farmer", "farmerProfile.approvalStatus": "suspended" }),
    User.countDocuments({ role: "customer", isActive: true }),
    Order.countDocuments({ status: { $in: ["PLACED", "ACCEPTED"] } }),
    Order.countDocuments({ status: "READY_FOR_PICKUP" }),
    Product.countDocuments(),
    Product.countDocuments({ adminModerationBlocked: true }),
    require("../models/Review").countDocuments(),
    require("../models/Review").countDocuments({ isVisible: true }),
    User.find({ role: { $ne: "admin" } }).select("name email role isActive farmerProfile.approvalStatus createdAt").sort({ createdAt: -1 }).limit(6).lean(),
    Order.find().select("customer farmer market totalAmount status createdAt").populate("customer", "name").populate("farmer", "name").populate("market", "name").sort({ createdAt: -1 }).limit(6).lean(),
    Order.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }])
  ]);

  const statusMap = ordersByStatus.reduce((acc, item) => {
    acc[item._id] = item.count;
    return acc;
  }, {});

  res.json({
    success: true,
    dashboard: {
      totalFarmers: farmers,
      totalCustomers: customers,
      totalMarkets: markets,
      totalOrders: orders,
      totalRevenue: revenue[0]?.total || 0,
      activeFarmers,
      pendingFarmers,
      suspendedFarmers,
      activeCustomers,
      pendingOrders,
      readyOrders,
      totalProducts,
      flaggedProducts,
      totalReviews,
      visibleReviews,
      orderStatus: statusMap,
      recentUsers,
      recentOrders
    }
  });
}
async function listUsers(req, res) {
  const filter = {};
  if (req.query.role) filter.role = req.query.role;
  const users = await User.find(filter).select("-password").sort({ createdAt: -1 });
  res.json({ success: true, users });
}

async function setUserStatus(req, res) {
  const user = await User.findByIdAndUpdate(req.params.id, { isActive: Boolean(req.body.isActive) }, { new: true }).select("-password");
  if (!user) return res.status(404).json({ success: false, message: "User not found" });
  res.json({ success: true, user });
}

async function setFarmerApproval(req, res) {
  const status = req.body.status;
  if (!["pending", "approved", "suspended"].includes(status)) return res.status(400).json({ success: false, message: "Invalid farmer status" });
  const farmer = await User.findOneAndUpdate(
    { _id: req.params.id, role: "farmer" },
    { "farmerProfile.approvalStatus": status },
    { new: true }
  ).select("-password");
  if (!farmer) return res.status(404).json({ success: false, message: "Farmer not found" });

  if (["approved", "suspended"].includes(status)) {
    await sendFarmerApprovalEmail(farmer, status);
  }

  res.json({ success: true, farmer });
}

async function categories(req, res) {
  const list = await Category.find().sort({ name: 1 }).lean();
  res.set("Cache-Control", "no-store");
  res.json({ success: true, categories: list, total: list.length, active: list.filter(c => c.isActive !== false).length });
}

async function createCategory(req, res) {
  const category = await Category.create(req.body);
  res.status(201).json({ success: true, category });
}

async function updateCategory(req, res) {
  const category = await Category.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!category) return res.status(404).json({ success: false, message: "Category not found" });
  res.json({ success: true, category });
}

async function deleteCategory(req, res) {
  const category = await Category.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
  if (!category) return res.status(404).json({ success: false, message: "Category not found" });
  res.json({ success: true, message: "Category disabled" });
}

async function listProducts(req, res) {
  const products = await Product.find().populate("farmer", "name email").populate("market", "name").populate("category", "name").sort({ createdAt: -1 });
  res.json({ success: true, products });
}

async function listReviews(req, res) {
  const Review = require("../models/Review");
  const reviews = await Review.find().populate("customer", "name email").populate("farmer", "name").populate("product", "name").sort({ createdAt: -1 });
  res.json({ success: true, reviews });
}

async function reports(req, res) {
  const [ordersByMarket, activeFarmers, topFarmers] = await Promise.all([
    Order.aggregate([
      { $match: { status: "COMPLETED" } },
      { $group: { _id: "$market", orders: { $sum: 1 }, revenue: { $sum: "$totalAmount" } } },
      { $lookup: { from: "markets", localField: "_id", foreignField: "_id", as: "market" } },
      { $unwind: { path: "$market", preserveNullAndEmptyArrays: true } },
      { $project: { market: "$market.name", orders: 1, revenue: 1 } }
    ]),
    User.countDocuments({ role: "farmer", "farmerProfile.approvalStatus": "approved", isActive: true }),
    Order.aggregate([
      { $match: { status: "COMPLETED" } },
      { $group: { _id: "$farmer", orders: { $sum: 1 }, revenue: { $sum: "$totalAmount" } } },
      { $sort: { orders: -1 } }, { $limit: 10 },
      { $lookup: { from: "users", localField: "_id", foreignField: "_id", as: "farmer" } },
      { $unwind: { path: "$farmer", preserveNullAndEmptyArrays: true } },
      { $project: { farmer: "$farmer.name", orders: 1, revenue: 1 } }
    ])
  ]);
  res.json({ success: true, reports: { ordersByMarket, activeFarmers, mostActiveFarmers: topFarmers } });
}

async function publishNotification(req, res) {
  const users = await User.find({ isActive: true }).select("_id");
  const docs = users.map(u => ({
    user: u._id, type: "ANNOUNCEMENT", title: req.body.title, message: req.body.message
  }));
  const notifications = docs.length ? await Notification.insertMany(docs) : [];
  res.status(201).json({ success: true, count: notifications.length });
}

async function moderateProduct(req, res) {
  const product = await Product.findByIdAndUpdate(req.params.id, { adminModerationBlocked: Boolean(req.body.blocked) }, { new: true });
  if (!product) return res.status(404).json({ success: false, message: "Product not found" });
  res.json({ success: true, product });
}

module.exports = {
  dashboard, listUsers, setUserStatus, setFarmerApproval,
  categories, createCategory, updateCategory, deleteCategory,
  reports, publishNotification, moderateProduct, listProducts, listReviews
};
