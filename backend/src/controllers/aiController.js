const Product = require("../models/Product");
const User = require("../models/User");
const Market = require("../models/Market");
const PickupSlot = require("../models/PickupSlot");
const WeeklyStock = require("../models/WeeklyStock");
const aiService = require("../services/aiService");

function startOfWeek() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  const day = date.getDay();
  date.setDate(date.getDate() + (day === 0 ? -6 : 1 - day));
  return date;
}

function buildContextText(products, farmers, markets, pickupSlots, stocks) {
  const stockMap = new Map(stocks.map(s => [String(s.product), s]));

  const productLines = products.map((p) => {
    const stock = stockMap.get(String(p._id));
    const remaining = stock
      ? Math.max(0, Number(stock.quantity || 0) - Number(stock.soldQuantity || 0))
      : Number(p.quantityAvailable || 0);

    const farmer = p.farmer?.farmerProfile?.stallName || p.farmer?.name || "Unknown farmer";
    const market = p.market?.name || "Unknown market";
    const category = p.category?.name || "Uncategorised";

    return `- ${p.name} | category: ${category} | price: PKR ${p.price} per ${p.unit} | stock: ${remaining} ${p.unit} | farmer: ${farmer} | market: ${market}`;
  }).join("\n");

  const farmerLines = farmers.map((f) => {
    const profile = f.farmerProfile || {};
    const marketsText = (profile.markets || []).map((m) => m.name).join(", ") || "No market listed";
    const days = (profile.operatingDays || []).join(", ") || "Flexible schedule";
    const pickup = profile.pickupWindowStart && profile.pickupWindowEnd
      ? `${profile.pickupWindowStart}-${profile.pickupWindowEnd}`
      : "Not specified";

    return `- ${profile.stallName || f.name} | contact person: ${f.name} | markets: ${marketsText} | operating days: ${days} | pickup window: ${pickup} | available: ${f.isActive ? "yes" : "no"}`;
  }).join("\n");

  const marketLines = markets.map((m) =>
    `- ${m.name} | address: ${m.address} | days: ${(m.operatingDays || []).join(", ") || "Not specified"} | hours: ${m.openingTime || "?"}-${m.closingTime || "?"} | active: ${m.isActive ? "yes" : "no"}`
  ).join("\n");

  const slotLines = pickupSlots
    .filter(s => s.farmer && s.market)
    .map((s) => {
      const remaining = Math.max(0, Number(s.capacity || 0) - Number(s.bookedCount || 0));
      return `- ${s.market.name} | ${s.farmer.name} | ${new Date(s.date).toLocaleDateString()} | ${s.startTime}-${s.endTime} | remaining capacity: ${remaining}`;
    }).join("\n");

  return `PRODUCTS:
${productLines || "No product data available."}

FARMERS:
${farmerLines || "No farmer data available."}

MARKETS:
${marketLines || "No market data available."}

PICKUP SLOTS:
${slotLines || "No active pickup slots available."}`;
}

async function ask(req, res) {
  try {
    const question = req.body?.question || req.body?.message;

    if (!question || typeof question !== "string" || !question.trim()) {
      return res.status(400).json({ success: false, message: "A question is required." });
    }

    const now = new Date();
    const weekStart = startOfWeek();

    const [products, farmers, markets, pickupSlots] = await Promise.all([
      Product.find({ temporarilyUnavailable: false, soldOut: false })
        .populate({
          path: "farmer",
          select: "name isActive farmerProfile",
          match: { role: "farmer", isActive: true, "farmerProfile.approvalStatus": "approved" }
        })
        .populate("market", "name address operatingDays openingTime closingTime isActive")
        .populate("category", "name")
        .sort({ createdAt: -1 })
        .limit(100),
      User.find({
        role: "farmer",
        "farmerProfile.approvalStatus": "approved",
        isActive: true
      })
        .select("name isActive farmerProfile")
        .populate("farmerProfile.markets", "name"),
      Market.find({ isActive: true }).sort({ name: 1 }).limit(50),
      PickupSlot.find({
        isActive: true,
        date: { $gte: now }
      })
        .populate("farmer", "name")
        .populate("market", "name")
        .sort({ date: 1, startTime: 1 })
        .limit(50)
    ]);

    // Products belonging to suspended/inactive/unapproved farmers are not
    // exposed to the assistant, even if the product document still exists.
    const visibleProducts = products.filter(p => p.farmer && p.market?.isActive);

    const stocks = visibleProducts.length
      ? await WeeklyStock.find({
          product: { $in: visibleProducts.map(p => p._id) },
          weekStart
        })
      : [];

    const contextText = buildContextText(
      visibleProducts,
      farmers,
      markets,
      pickupSlots,
      stocks
    );

    const answer = await aiService.getAIResponse(question.trim(), contextText);

    return res.json({
      success: true,
      answer,
      provider: process.env.OPENROUTER_API_KEY ? "openrouter" : "basic-local-assistant",
      grounded: true
    });
  } catch (error) {
    console.error("AI controller error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to answer right now. Please try again."
    });
  }
}

module.exports = { ask };
