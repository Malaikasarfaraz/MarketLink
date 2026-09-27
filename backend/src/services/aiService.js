let OpenAI = null;
let client = null;

function getClient() {
  if (!process.env.OPENROUTER_API_KEY) return null;
  if (!OpenAI) OpenAI = require("openai");
  if (!client) {
    client = new OpenAI({
      apiKey: process.env.OPENROUTER_API_KEY,
      baseURL: "https://openrouter.ai/api/v1"
    });
  }
  return client;
}

function clean(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function normalize(value) {
  return clean(value).toLowerCase().replace(/[^a-z0-9\s]/g, " ");
}

function parseContext(contextText) {
  const sections = {};
  const matches = String(contextText || "").split(/\n(?=[A-Z_ ]+:)/);
  for (const section of matches) {
    const index = section.indexOf(":");
    if (index < 0) continue;
    const key = section.slice(0, index).trim();
    const body = section.slice(index + 1).trim();
    sections[key] = body;
  }
  return sections;
}

function linesFor(sections, key) {
  return (sections[key] || "").split("\n").map(clean).filter(Boolean)
    .filter(line => !/^No .* data available\.?$/i.test(line));
}

function findProduct(question, productLines) {
  const q = normalize(question);
  return productLines.find(line => {
    const name = clean(line.replace(/^- /, "").split(" | ")[0]);
    const n = normalize(name);
    return n && (q.includes(n) || n.split(" ").every(word => q.includes(word)));
  });
}

function extractField(line, field) {
  const match = line.match(new RegExp(`\\| ${field}: ([^|]+)`, "i"));
  return match ? clean(match[1]) : "";
}

function dataGroundedAnswer(question, contextText) {
  const q = normalize(question);
  const sections = parseContext(contextText);
  const products = linesFor(sections, "PRODUCTS");
  const farmers = linesFor(sections, "FARMERS");
  const markets = linesFor(sections, "MARKETS");
  const slots = linesFor(sections, "PICKUP SLOTS");

  // Deterministic answers for direct data questions keep the assistant
  // accurate even when an external LLM is unavailable or over-interprets.
  if (/(what products|which products|products available|available products)/.test(q)) {
    if (!products.length) return "I couldn't find any currently available products in the MarketLink data.";
    const names = products.map(line => line.replace(/^- /, "").split(" | ")[0]);
    return `Here are the products currently available:\n- ${names.join("\n- ")}`;
  }

  // Category/type questions such as "which types of vegetables?" or
  // "what fruits do you have?" should be answered from the live category
  // field instead of falling through to the generic assistant message.
  const categoryAliases = [
    ["vegetables", ["vegetable", "vegetables", "veggies"]],
    ["fruits", ["fruit", "fruits"]],
    ["dairy", ["dairy", "milk", "cheese", "yogurt"]],
    ["baked goods", ["baked good", "baked goods", "bakery", "bread"]],
    ["grains", ["grain", "grains"]],
    ["herbs", ["herb", "herbs"]]
  ];

  const categoryMatch = categoryAliases.find(([, aliases]) =>
    aliases.some(alias => q.includes(alias))
  );

  if (categoryMatch && /(which|what|types?|kind|available|have|offer)/.test(q)) {
    const categoryName = categoryMatch[0];
    const matches = products.filter(line => {
      const category = normalize(extractField(line, "category"));
      return category && category.includes(normalize(categoryName));
    });

    if (!matches.length) {
      return `I couldn't find any currently available ${categoryName} in the MarketLink data.`;
    }

    return `The currently available ${categoryName} are:\n${matches.map(line => `- ${line.replace(/^- /, "").split(" | ")[0]}${extractField(line, "price") ? ` — ${extractField(line, "price")} per ${line.match(/\| price: PKR [^|]+ per ([^|]+)/i)?.[1] || "unit"}` : ""}`).join("\n")}`;
  }

  if (/(pickup slots|pickup times|pickup time|available slots|available pickup)/.test(q)) {
    if (!slots.length) return "There are no active future pickup slots available in the current MarketLink data.";
    return `Here are the currently available pickup slots:\n${slots.slice(0, 12).map(line => `- ${line.replace(/ \| remaining capacity:/i, " · remaining capacity: ")}`).join("\n")}`;
  }

  if (/(how does pickup|how.*pickup work|pickup process|collect my order|where.*collect)/.test(q)) {
    return "MarketLink is pickup-only. Place a pre-order, choose an available pickup slot, wait for the farmer to mark the order ready, then collect it at the selected market. Delivery is not part of MarketLink.";
  }

  if (/(payment|pay online|online payment|pay at pickup|pay.*collect)/.test(q)) {
    return "MarketLink does not use an online payment gateway. Orders are paid in person when you collect them at pickup.";
  }

  if (/(which farmers|what farmers|farmers available|available farmers|list farmers)/.test(q)) {
    if (!farmers.length) return "I couldn't find any approved active farmers in the current MarketLink data.";
    return `These approved farmers are currently available:\n${farmers.slice(0, 20).map(line => `- ${line.replace(/^- /, "").split(" | ")[0]}`).join("\n")}`;
  }

  if (/(which markets|what markets|markets available|available markets|list markets)/.test(q)) {
    if (!markets.length) return "I couldn't find any active markets in the current MarketLink data.";
    return `These active markets are currently available:\n${markets.slice(0, 20).map(line => `- ${line.replace(/^- /, "").split(" | ")[0]}`).join("\n")}`;
  }

  // Farmer-specific product lookup.
  if (/(what products|which products|products).*?(sell|have|offer)/.test(q)) {
    const farmer = farmers.find(line => {
      const name = normalize(line.replace(/^- /, "").split(" | ")[0]);
      return name && q.includes(name);
    });
    if (farmer) {
      const farmerName = farmer.replace(/^- /, "").split(" | ")[0];
      const matches = products.filter(line => normalize(extractField(line, "farmer")) === normalize(farmerName));
      if (!matches.length) return `${farmerName} does not have any currently available products in the MarketLink data.`;
      return `${farmerName} currently sells:\n${matches.map(line => `- ${line.replace(/^- /, "").split(" | ")[0]}`).join("\n")}`;
    }
  }

  // Market-specific farmer lookup.
  if (/(which farmers|what farmers|farmers).*?(at|in|selling)/.test(q)) {
    const market = markets.find(line => {
      const name = normalize(line.replace(/^- /, "").split(" | ")[0]);
      return name && q.includes(name);
    });
    if (market) {
      const marketName = market.replace(/^- /, "").split(" | ")[0];
      const matches = products
        .filter(line => normalize(extractField(line, "market")) === normalize(marketName))
        .map(line => extractField(line, "farmer"))
        .filter(Boolean);
      const unique = [...new Set(matches)];
      if (!unique.length) return `I couldn't find currently available farmers with products listed at ${marketName}.`;
      return `Farmers with currently available products at ${marketName}:\n${unique.map(name => `- ${name}`).join("\n")}`;
    }
  }

  const product = findProduct(question, products);
  if (product) {
    const name = product.replace(/^- /, "").split(" | ")[0];
    const price = extractField(product, "price");
    const stock = extractField(product, "stock");
    const farmer = extractField(product, "farmer");
    const market = extractField(product, "market");

    if (/(how much|price|cost|rate)/.test(q)) {
      return `${name} costs ${price || "a price not listed"}${farmer ? ` at ${market || "the listed market"}, sourced from ${farmer}` : ""}.`;
    }
    if (/(stock|quantity|how many|available quantity)/.test(q)) {
      return `${name} currently has ${stock || "no stock quantity listed"} available.`;
    }
    if (/(who sells|which farmer|farmer.*sell|seller)/.test(q)) {
      return `${name} is listed by ${farmer || "a farmer not specified in the current data"}${market ? ` at ${market}` : ""}.`;
    }
    if (/(where|which market|market.*sell|available.*market)/.test(q)) {
      return `${name} is available at ${market || "a market not specified in the current data"}${farmer ? ` from ${farmer}` : ""}.`;
    }
  }

  if (/(order|pre.?order|cancel|modify|reorder|status)/.test(q)) {
    return "Customers can place pickup pre-orders, view order status, and cancel or modify eligible orders before the farmer's cutoff time. Completed orders can also be used for reorder and review workflows.";
  }

  if (/(review|rating|rate)/.test(q)) {
    return "Customers can review products after a completed order. MarketLink also supports farmer responses to customer reviews.";
  }

  // General MarketLink questions should still receive a useful answer when
  // the external AI service is unavailable. These answers describe platform
  // behavior only and do not invent live marketplace data.
  if (/(what is marketlink|what's marketlink|tell me about marketlink|about marketlink|how does marketlink work|how marketlink works)/.test(q)) {
    return "MarketLink is a farmers-market platform that connects customers with local farmers. Customers can discover products and markets, place pre-orders for pickup, manage eligible orders, save favorites and leave reviews.";
  }

  if (/(how.*(use|shop|buy)|how can i shop|how can i buy|how to order)/.test(q)) {
    return "Browse the available products, choose what you want, add it to your basket, select an available pickup slot and place your pre-order. Payment is made in person when you collect the order.";
  }

  if (/(what is a pre.?order|what does pre.?order mean|what.*pre.?order)/.test(q)) {
    return "A pre-order lets you reserve available products before pickup. You select the products and an available pickup slot, then collect the order at the market.";
  }

  if (/(what is a pickup slot|what.*pickup slot|pickup slot mean)/.test(q)) {
    return "A pickup slot is a scheduled date and time window when you can collect your pre-order from the selected market.";
  }

  if (/(is there delivery|do you deliver|delivery|courier)/.test(q)) {
    return "MarketLink is pickup-only. Delivery and courier services are not part of the platform.";
  }

  if (/(why.*pay|payment method|how.*payment|payment work)/.test(q)) {
    return "MarketLink does not use an online payment gateway. Payment is settled in person at pickup.";
  }

  return null;
}

function localFallback(question, contextText) {
  return dataGroundedAnswer(question, contextText) ||
    "I can help with MarketLink products, farmers, markets, pickup slots, orders, reviews and payment at pickup. Try asking about a specific product, farmer or market.";
}

async function getAIResponse(userMessage, contextText) {
  const grounded = dataGroundedAnswer(userMessage, contextText);

  const ai = getClient();
  if (!ai) return grounded || localFallback(userMessage, contextText);

  const systemPrompt = `You are the MarketLink AI Assistant for a farmers marketplace.
Use ONLY the supplied live MarketLink data for changing facts such as products, prices, stock, farmers, markets and pickup slots.
Never invent or guess missing data. If the requested data is absent, explicitly say it is not available in the current MarketLink data.
For general questions about MarketLink, explain the platform and its documented workflows without inventing live marketplace facts. For questions unrelated to MarketLink, you may answer briefly using general knowledge, but clearly separate general information from live MarketLink data. For general workflow questions, use only these documented rules:
- MarketLink is pickup-only; delivery/courier is out of scope.
- Payment is settled in person at pickup; there is no online payment gateway.
- Customers can browse products, farmers and markets, place pickup pre-orders, choose available pickup slots, manage eligible orders before cutoff, and review completed purchases.
- Farmers manage stock, incoming orders, pickup slots and review responses.
Do not claim to know a customer's private order details unless they are explicitly supplied in the data.
Keep answers concise, useful and easy to understand. When listing multiple items, use bullets.
If a specific product is requested, include its price/unit, stock, farmer and market when those fields are available.

LIVE MARKETLINK DATA:
${contextText}`.trim();

  try {
    const completion = await ai.chat.completions.create({
      model: process.env.OPENROUTER_MODEL || "openrouter/free",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: String(userMessage).trim() }
      ],
      temperature: 0.1,
      max_tokens: 500
    });

    const answer = completion.choices?.[0]?.message?.content?.trim();
    return answer || grounded || localFallback(userMessage, contextText);
  } catch (error) {
    console.error("OpenRouter AI error:", error.message);
    return grounded || `${localFallback(userMessage, contextText)}\n\n(AI service is temporarily unavailable, so I used the built-in MarketLink assistant.)`;
  }
}

module.exports = { getAIResponse };
