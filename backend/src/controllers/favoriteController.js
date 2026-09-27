const Favorite = require("../models/Favorite");
const User = require("../models/User");
const Product = require("../models/Product");
const Market = require("../models/Market");
const Notification = require("../models/Notification");

async function listFavorites(req, res) {
  const favorites = await Favorite.find({ customer: req.user._id })
    .populate("farmer", "name farmerProfile")
    .populate("product", "name price unit image farmer temporarilyUnavailable soldOut adminModerationBlocked")
    .populate("market", "name address operatingDays openingTime closingTime latitude longitude");
  res.json({ success: true, favorites });
}

async function addFavorite(req, res) {
  const { type, farmer, product, market } = req.body;
  if (!["farmer", "product", "market"].includes(type)) {
    return res.status(400).json({ success: false, message: "Invalid favorite type" });
  }
  const filter = { customer: req.user._id, type };
  if (type === "farmer") {
    const target = await User.findOne({ _id: farmer, role: "farmer", isActive: true, "farmerProfile.approvalStatus": "approved" }).select("_id");
    if (!target) return res.status(404).json({ success: false, message: "Farmer not found" });
    filter.farmer = target._id;
  } else if (type === "product") {
    const target = await Product.findOne({ _id: product, temporarilyUnavailable: false, adminModerationBlocked: false })
      .populate("farmer", "role isActive farmerProfile")
      .populate("market", "isActive")
      .select("_id farmer market");
    if (!target || target.farmer?.role !== "farmer" || !target.farmer?.isActive || target.farmer?.farmerProfile?.approvalStatus !== "approved" || !target.market?.isActive) {
      return res.status(404).json({ success: false, message: "Product is not available" });
    }
    if (!target) return res.status(404).json({ success: false, message: "Product is not available" });
    filter.product = target._id;
  } else {
    const target = await Market.findOne({ _id: market, isActive: true }).select("_id");
    if (!target) return res.status(404).json({ success: false, message: "Market not found" });
    filter.market = target._id;
  }
  try {
    const favorite = await Favorite.create(filter);
    res.status(201).json({ success: true, favorite });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ success: false, message: "Already in favorites" });
    throw err;
  }
}

async function removeFavorite(req, res) {
  const favorite = await Favorite.findOneAndDelete({ _id: req.params.id, customer: req.user._id });
  if (!favorite) return res.status(404).json({ success: false, message: "Favorite not found" });
  res.json({ success: true, message: "Removed from favorites" });
}

async function notifyProductRestock(productId, reason = "Product is available again") {
  const product = await Product.findById(productId).select("farmer name");
  if (!product) return 0;

  const [productFavorites, farmerFavorites] = await Promise.all([
    Favorite.find({ type: "product", product: productId }).select("customer"),
    Favorite.find({ type: "farmer", farmer: product.farmer }).select("customer")
  ]);

  const customers = new Set([
    ...productFavorites.map(f => f.customer.toString()),
    ...farmerFavorites.map(f => f.customer.toString())
  ]);
  if (!customers.size) return 0;

  const docs = [...customers].map(customer => ({
    user: customer,
    type: "RESTOCK",
    title: "Fresh stock is available",
    message: `${reason}. ${product.name} is now available on MarketLink.`
  }));
  await Notification.insertMany(docs);
  return docs.length;
}

module.exports = { listFavorites, addFavorite, removeFavorite, notifyProductRestock };
