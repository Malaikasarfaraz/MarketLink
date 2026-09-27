const WeeklyStock = require("../models/WeeklyStock");
const { number } = require("../utils/validators");
const Product = require("../models/Product");
const { notifyProductRestock } = require("./favoriteController");

function startOfWeek(input) {
  const date = input ? new Date(input) : new Date();
  if (Number.isNaN(date.getTime())) return null;
  date.setHours(0, 0, 0, 0);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  return date;
}

function sameOwner(stock, user) {
  return user.role === "admin" || stock.farmer.toString() === user._id.toString();
}

async function listWeeklyStock(req, res) {
  const weekStart = startOfWeek(req.query.weekStart);
  if (!weekStart) return res.status(400).json({ success: false, message: "Invalid weekStart" });

  const filter = { weekStart };
  if (req.query.product) filter.product = req.query.product;
  if (req.query.farmer) filter.farmer = req.query.farmer;

  let stocks = await WeeklyStock.find(filter)
    .populate({ path: "product", populate: [{ path: "category", select: "name" }, { path: "market", select: "name" }] })
    .populate("farmer", "name farmerProfile")
    .sort({ createdAt: -1 });

  const productFilter = { "weeklyStockTemplate.enabled": true };
  if (filter.product) productFilter._id = filter.product;
  if (filter.farmer) productFilter.farmer = filter.farmer;
  const templateProducts = await Product.find(productFilter);
  const existing = new Set(stocks.map(stock => stock.product?._id?.toString() || stock.product?.toString()));
  const missing = templateProducts.filter(product => !existing.has(product._id.toString()));
  if (missing.length) {
    const created = await WeeklyStock.insertMany(missing.map(product => ({
      product: product._id, farmer: product.farmer, weekStart,
      quantity: Number(product.weeklyStockTemplate.defaultQuantity || product.quantityAvailable),
      unit: product.unit, price: product.price, soldOut: false, notes: product.weeklyStockTemplate.notes || ""
    })), { ordered: false });
    stocks = await WeeklyStock.find({ _id: { $in: [...stocks.map(x => x._id), ...created.map(x => x._id)] } })
      .populate({ path: "product", populate: [{ path: "category", select: "name" }, { path: "market", select: "name" }] })
      .populate("farmer", "name farmerProfile")
      .sort({ createdAt: -1 });
  }

  res.json({ success: true, weekStart, stocks });
}

async function listMyWeeklyStock(req, res) {
  req.query.farmer = req.user._id.toString();
  return listWeeklyStock(req, res);
}

async function createWeeklyStock(req, res) {
  const { product: productId, weekStart: requestedWeek, quantity, price, notes, templateEnabled } = req.body;
  const product = await Product.findById(productId);
  if (!product) return res.status(404).json({ success: false, message: "Product not found" });

  if (req.user.role === "farmer" && product.farmer.toString() !== req.user._id.toString()) {
    return res.status(403).json({ success: false, message: "You can only manage stock for your own products" });
  }
  if (req.user.role === "farmer" && product.temporarilyUnavailable) {
    return res.status(400).json({ success: false, message: "This product is temporarily unavailable" });
  }

  const weekStart = startOfWeek(requestedWeek);
  const parsedQuantity = number(quantity,"Quantity",{min:0,max:100000000});
  if (!weekStart || !Number.isFinite(parsedQuantity) || parsedQuantity < 0) {
    return res.status(400).json({ success: false, message: "A valid week and quantity are required" });
  }

  const previous = await WeeklyStock.findOne({ product: product._id, weekStart });
  const stock = await WeeklyStock.findOneAndUpdate(
    { product: product._id, weekStart },
    {
      $set: {
        farmer: product.farmer,
        quantity: parsedQuantity,
        unit: product.unit,
        price: price === "" || price === undefined ? product.price : number(price,"Price",{min:0,max:100000000}),
        soldOut: parsedQuantity === 0 || (previous?.soldQuantity || 0) >= parsedQuantity,
        notes: notes || ""
      },
      $setOnInsert: { soldQuantity: 0 }
    },
    { new: true, upsert: true, runValidators: true }
  );

  if (templateEnabled !== undefined) {
    product.weeklyStockTemplate = {
      enabled: Boolean(templateEnabled),
      defaultQuantity: parsedQuantity,
      notes: notes || ""
    };
    await product.save();
  }

  const currentWeek = startOfWeek();
  if (weekStart.getTime() === currentWeek.getTime()) {
    product.quantityAvailable = Math.max(0, parsedQuantity - stock.soldQuantity);
    product.soldOut = product.quantityAvailable === 0;
    if (price !== "" && price !== undefined) product.price = Number(price);
    await product.save();
  }

  if (previous?.soldOut && !stock.soldOut && stock.quantity > stock.soldQuantity) {
    await notifyProductRestock(product._id, `${product.name} has been restocked`);
  } else if (!previous && stock.quantity > stock.soldQuantity) {
    await notifyProductRestock(product._id, `${product.name} is now available for this week`);
  }

  res.status(201).json({ success: true, stock });
}

async function updateWeeklyStock(req, res) {
  const stock = await WeeklyStock.findById(req.params.id).populate("product");
  if (!stock) return res.status(404).json({ success: false, message: "Weekly stock record not found" });
  if (!sameOwner(stock, req.user)) return res.status(403).json({ success: false, message: "Access denied" });

  const wasSoldOut = stock.soldOut || stock.soldQuantity >= stock.quantity;
  const quantity = req.body.quantity === undefined ? stock.quantity : Number(req.body.quantity);
  if (!Number.isFinite(quantity) || quantity < stock.soldQuantity) return res.status(400).json({ success: false, message: `Quantity cannot be lower than already sold stock (${stock.soldQuantity})` });

  stock.quantity = quantity;
  stock.soldOut = quantity === stock.soldQuantity;
  if (req.body.price !== undefined && req.body.price !== "") stock.price = Number(req.body.price);
  if (req.body.notes !== undefined) stock.notes = req.body.notes;
  await stock.save();

  if (stock.weekStart.getTime() === startOfWeek().getTime()) {
    const product = await Product.findById(stock.product._id);
    if (product) {
      product.quantityAvailable = Math.max(0, quantity - stock.soldQuantity);
      product.soldOut = product.quantityAvailable === 0;
      if (stock.price !== undefined) product.price = stock.price;
      await product.save();
    }
  }

  if (wasSoldOut && !stock.soldOut && stock.quantity > stock.soldQuantity) {
    await notifyProductRestock(stock.product._id || stock.product, `${stock.product?.name || "A product"} has been restocked`);
  }
  res.json({ success: true, stock });
}

async function deleteWeeklyStock(req, res) {
  const stock = await WeeklyStock.findById(req.params.id);
  if (!stock) return res.status(404).json({ success: false, message: "Weekly stock record not found" });
  if (!sameOwner(stock, req.user)) return res.status(403).json({ success: false, message: "Access denied" });

  if (stock.weekStart.getTime() === startOfWeek().getTime()) {
    const product = await Product.findById(stock.product);
    if (product) {
      product.quantityAvailable = 0;
      product.soldOut = true;
      await product.save();
    }
  }

  await stock.deleteOne();
  res.json({ success: true, message: "Weekly stock deleted" });
}

module.exports = { listWeeklyStock, listMyWeeklyStock, createWeeklyStock, updateWeeklyStock, deleteWeeklyStock, startOfWeek };
