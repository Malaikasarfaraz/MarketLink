const Product = require("../models/Product");
const { required, number } = require("../utils/validators");
const User = require("../models/User");
const Market = require("../models/Market");
const Category = require("../models/Category");
const WeeklyStock = require("../models/WeeklyStock");
const cloudinary = require("../config/cloudinary");
const { notifyProductRestock } = require("./favoriteController");

async function destroyImageSafely(publicId) {
  if (!publicId) return;
  try { await cloudinary.uploader.destroy(publicId); } catch (err) { console.error("Cloudinary cleanup failed:", err.message); }
}

function startOfWeek(input) {
  const date = input ? new Date(input) : new Date();
  date.setHours(0, 0, 0, 0);
  const day = date.getDay();
  date.setDate(date.getDate() + (day === 0 ? -6 : 1 - day));
  return date;
}

function farmerCanManage(user, product) {
  return user.role === "admin" || (user.role === "farmer" && product.farmer.toString() === user._id.toString());
}

function parseNumber(value, fallback = null) {
  if (value === undefined || value === null || value === "") return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

async function publicProductFilter(req) {
  // Paused products must stay hidden from normal customers/public browsing.
  // A logged-in farmer may request their own paused products for the Farmer
  // dashboard by sending includeUnavailable=true.
  const isOwnFarmerListing =
    req.query.includeUnavailable === "true" &&
    req.user?.role === "farmer" &&
    req.query.farmer &&
    req.query.farmer.toString() === req.user._id.toString();

  const filter = {
    ...(isOwnFarmerListing ? {} : { temporarilyUnavailable: false }),
    adminModerationBlocked: false
  };

  if (req.query.farmer) filter.farmer = req.query.farmer;
  if (req.query.market) filter.market = req.query.market;
  if (req.query.category) filter.category = req.query.category;
  const min = parseNumber(req.query.minPrice); const max = parseNumber(req.query.maxPrice);
  if (req.query.minPrice !== undefined && min === null || req.query.maxPrice !== undefined && max === null) {
    const err = new Error("Price filters must be valid numbers"); err.statusCode = 400; throw err;
  }
  if (min !== null || max !== null) { filter.price = {}; if (min !== null) filter.price.$gte = min; if (max !== null) filter.price.$lte = max; }
  if (min !== null && max !== null && min > max) { const err = new Error("Minimum price cannot exceed maximum price"); err.statusCode = 400; throw err; }
  if (req.query.day) {
    const markets = await Market.find({ isActive: true, operatingDays: req.query.day }).select("_id");
    filter.market = { $in: markets.map(m => m._id) };
  }
  if (req.query.search) filter.$text = { $search: String(req.query.search).slice(0, 100) };
  const farmerIds = await User.find({ role: "farmer", isActive: true, "farmerProfile.approvalStatus": "approved" }).select("_id");
  const marketIds = await Market.find({ isActive: true }).select("_id");
  filter.farmer = filter.farmer ? filter.farmer : { $in: farmerIds.map(x => x._id) };
  if (filter.market?.$in) {
    filter.market.$in = filter.market.$in.filter(id => marketIds.some(m => m._id.toString() === id.toString()));
  } else if (filter.market) {
    if (!marketIds.some(m => m._id.toString() === filter.market.toString())) filter.market = { $in: [] };
  } else { filter.market = { $in: marketIds.map(x => x._id) }; }
  return filter;
}

async function listProducts(req, res) {
  const filter = await publicProductFilter(req);
  const page = Math.max(1, Number.parseInt(req.query.page || "1", 10));
  const limit = Math.min(48, Math.max(1, Number.parseInt(req.query.limit || "24", 10)));
  const skip = (page - 1) * limit;
  const [total, products] = await Promise.all([
    Product.countDocuments(filter),
    Product.find(filter).populate("farmer", "name farmerProfile").populate("market", "name address operatingDays latitude longitude").populate("category", "name").sort({ createdAt: -1 }).skip(skip).limit(limit)
  ]);

  const currentWeek = startOfWeek();
  const existingStocks = await WeeklyStock.find({ product: { $in: products.map(p => p._id) }, weekStart: currentWeek });
  const existingIds = new Set(existingStocks.map(stock => stock.product.toString()));
  const templates = products.filter(product => product.weeklyStockTemplate?.enabled && !existingIds.has(product._id.toString()));
  let stocks = existingStocks;
  if (templates.length) {
    const created = await WeeklyStock.insertMany(templates.map(product => ({ product: product._id, farmer: product.farmer._id || product.farmer, weekStart: currentWeek, quantity: Number(product.weeklyStockTemplate.defaultQuantity || product.quantityAvailable), unit: product.unit, price: product.price, soldOut: false, notes: product.weeklyStockTemplate.notes || "" })), { ordered: false }).catch(() => []);
    stocks = stocks.concat(created);
  }
  const stockMap = new Map(stocks.map(stock => [stock.product.toString(), stock]));
  const result = products.map(product => {
    const stock = stockMap.get(product._id.toString());
    const remaining = stock ? Math.max(0, stock.quantity - stock.soldQuantity) : product.quantityAvailable;
    return { ...product.toObject(), weeklyStock: stock || null, weeklyStockRemaining: remaining };
  });
  res.json({ success: true, count: result.length, total, page, limit, pages: Math.ceil(total / limit), products: result });
}

async function getProduct(req, res) {
  const product = await Product.findById(req.params.id).populate("farmer", "name phone address role isActive farmerProfile").populate("market").populate("category");
  if (!product || product.temporarilyUnavailable || product.adminModerationBlocked || !product.farmer || product.farmer.role !== "farmer" || !product.farmer.isActive || product.farmer.farmerProfile?.approvalStatus !== "approved" || !product.market || !product.market.isActive) return res.status(404).json({ success: false, message: "Product not found or unavailable" });
  const weeklyStock = await WeeklyStock.findOne({ product: product._id, weekStart: startOfWeek() });
  const result = product.toObject(); result.weeklyStock = weeklyStock || null; result.weeklyStockRemaining = weeklyStock ? Math.max(0, weeklyStock.quantity - weeklyStock.soldQuantity) : product.quantityAvailable;
  res.json({ success: true, product: result });
}

async function validateRelationships(body, farmerId) {
  const market = await Market.findOne({ _id: body.market, isActive: true });
  if (!market) { const err = new Error("Selected market is not active or does not exist"); err.statusCode = 400; throw err; }
  const category = await Category.findOne({ _id: body.category, isActive: true });
  if (!category) { const err = new Error("Selected category is not active or does not exist"); err.statusCode = 400; throw err; }
  const farmer = await User.findOne({ _id: farmerId, role: "farmer", isActive: true, "farmerProfile.approvalStatus": "approved" });
  if (!farmer) { const err = new Error("Only active approved farmers can list products"); err.statusCode = 403; throw err; }
  if (!farmer.farmerProfile?.markets?.some(id => id.toString() === body.market.toString())) { const err = new Error("Farmer is not assigned to the selected market"); err.statusCode = 400; throw err; }
}

async function createProduct(req, res) {
  let body = { ...req.body };
  required(body.name, "Product name"); required(body.unit, "Unit"); required(body.market, "Market"); required(body.category, "Category");
  body.name=String(body.name).trim(); body.unit=String(body.unit).trim();
  body.price=number(body.price,"Price",{min:0,max:100000000}); body.quantityAvailable=number(body.quantityAvailable,"Available quantity",{min:0,max:100000000});
  const farmerId = req.user.role === "admin" ? body.farmer : req.user._id;
  if (!farmerId) return res.status(400).json({ success: false, message: "Farmer is required" });
  if (req.user.role !== "admin") body.farmer = req.user._id;
  await validateRelationships(body, farmerId);
  const product = await Product.create(body);
  res.status(201).json({ success: true, product });
}

async function updateProduct(req, res) {
  if(req.body.name!==undefined) required(req.body.name,"Product name"); if(req.body.unit!==undefined) required(req.body.unit,"Unit");
  if(req.body.price!==undefined) req.body.price=number(req.body.price,"Price",{min:0,max:100000000}); if(req.body.quantityAvailable!==undefined) req.body.quantityAvailable=number(req.body.quantityAvailable,"Available quantity",{min:0,max:100000000});
  const product = await Product.findById(req.params.id);
  if (!product) return res.status(404).json({ success: false, message: "Product not found" });
  if (!farmerCanManage(req.user, product)) return res.status(403).json({ success: false, message: "Access denied" });
  const oldPublicId = product.imagePublicId;
  const wasUnavailable = product.temporarilyUnavailable || product.soldOut;
  const allowed = ["name", "description", "price", "unit", "quantityAvailable", "image", "imagePublicId", "temporarilyUnavailable", "weeklyStockTemplate", "market", "category"];
  for (const key of allowed) if (req.body[key] !== undefined) product[key] = req.body[key];
  if (req.user.role === "farmer") {
    product.farmer = req.user._id;
    if (product.adminModerationBlocked && req.body.adminModerationBlocked !== undefined) delete req.body.adminModerationBlocked;
  }
  await validateRelationships(product.toObject(), product.farmer);
  if (product.quantityAvailable < 0 || product.price < 0) return res.status(400).json({ success: false, message: "Price and quantity cannot be negative" });
  product.soldOut = Number(product.quantityAvailable) === 0;
  await product.save();
  if (req.user.role === "farmer" && product.adminModerationBlocked) { product.adminModerationBlocked = true; await product.save(); }
  if (wasUnavailable && !product.temporarilyUnavailable && !product.soldOut && !product.adminModerationBlocked) {
    await notifyProductRestock(product._id, `${product.name} is available again`);
  }
  if (req.body.imagePublicId && req.body.imagePublicId !== oldPublicId) await destroyImageSafely(oldPublicId);
  res.json({ success: true, product });
}

async function deleteProduct(req, res) {
  const product = await Product.findById(req.params.id);
  if (!product) return res.status(404).json({ success: false, message: "Product not found" });
  if (!farmerCanManage(req.user, product)) return res.status(403).json({ success: false, message: "Access denied" });
  await product.deleteOne(); await destroyImageSafely(product.imagePublicId);
  res.json({ success: true, message: "Product deleted" });
}

module.exports = { listProducts, getProduct, createProduct, updateProduct, deleteProduct };
