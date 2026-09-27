require("dotenv").config();

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const connectDB = require("../src/config/db");

const User = require("../src/models/User");
const Market = require("../src/models/Market");
const Category = require("../src/models/Category");
const Product = require("../src/models/Product");
const PickupSlot = require("../src/models/PickupSlot");
const Order = require("../src/models/Order");
const Favorite = require("../src/models/Favorite");
const Review = require("../src/models/Review");
const Notification = require("../src/models/Notification");
const WeeklyStock = require("../src/models/WeeklyStock");

async function seed() {
  try {
    await connectDB();

    // --------------------------------------------------
    // CLEAR OLD DATA
    // --------------------------------------------------

    await Promise.all([
      User.deleteMany({}),
      Market.deleteMany({}),
      Category.deleteMany({}),
      Product.deleteMany({}),
      PickupSlot.deleteMany({}),
      Order.deleteMany({}),
      Favorite.deleteMany({}),
      Review.deleteMany({}),
      Notification.deleteMany({}),
      WeeklyStock.deleteMany({})
    ]);

    // --------------------------------------------------
    // PASSWORD
    // --------------------------------------------------

    const password = await bcrypt.hash("MarketLink@123", 12);

    // --------------------------------------------------
    // USERS
    // --------------------------------------------------

    const admin = await User.create({
      name: "MarketLink Admin",
      email: "admin@marketlink.com",
      password,
      role: "admin"
    });

    const farmer = await User.create({
      name: "Green Valley Farmer",
      email: "farmer@marketlink.com",
      password,
      phone: "0300-1111111",
      address: "Karachi, Pakistan",
      role: "farmer",

      farmerProfile: {
        stallName: "Green Valley Produce",
        contactPerson: "Ahmed Khan",
        businessAddress: "Karachi, Pakistan",

        // Farmer operates every day
        operatingDays: [
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
          "Friday",
          "Saturday",
          "Sunday"
        ],

        pickupWindowStart: "09:00",
        pickupWindowEnd: "15:00",

        // Orders close 120 minutes before pickup
        cutoffMinutes: 120,

        latitude: 24.8607,
        longitude: 67.0011,

        approvalStatus: "approved"
      }
    });

    const customer = await User.create({
      name: "Demo Customer",
      email: "customer@marketlink.com",
      password,
      phone: "0300-2222222",
      address: "Karachi, Pakistan",
      role: "customer"
    });

    // --------------------------------------------------
    // MARKET
    // --------------------------------------------------

    const market = await Market.create({
      name: "City Fresh Farmers Market",
      address: "Karachi, Pakistan",

      // Market operates every day
      operatingDays: [
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
        "Sunday"
      ],

      openingTime: "08:00",
      closingTime: "16:00",

      latitude: 24.8607,
      longitude: 67.0011,

      mapProvider: "OpenStreetMap",

      farmers: [farmer._id]
    });

    // Add market to farmer profile
    farmer.farmerProfile.markets = [market._id];
    await farmer.save();

    // --------------------------------------------------
    // CATEGORIES
    // --------------------------------------------------

    const categoryNames = [
      "Vegetables",
      "Fruits",
      "Dairy",
      "Baked Goods",
      "Herbs"
    ];

    const categories = await Category.insertMany(
      categoryNames.map((name) => ({
        name,
        description: `${name} products`
      }))
    );

    const byName = Object.fromEntries(
      categories.map((category) => [category.name, category])
    );

    // --------------------------------------------------
    // PRODUCTS
    // --------------------------------------------------

    const products = await Product.insertMany([
      {
        farmer: farmer._id,
        market: market._id,
        category: byName.Vegetables._id,
        name: "Fresh Tomatoes",
        description: "Locally grown tomatoes",
        price: 250,
        unit: "kg",
        quantityAvailable: 30
      },

      {
        farmer: farmer._id,
        market: market._id,
        category: byName.Vegetables._id,
        name: "Organic Spinach",
        description: "Fresh weekly spinach",
        price: 180,
        unit: "bunch",
        quantityAvailable: 25
      },

      {
        farmer: farmer._id,
        market: market._id,
        category: byName.Fruits._id,
        name: "Mangoes",
        description: "Seasonal sweet mangoes",
        price: 450,
        unit: "kg",
        quantityAvailable: 20
      },

      {
        farmer: farmer._id,
        market: market._id,
        category: byName.Dairy._id,
        name: "Farm Fresh Milk",
        description: "Fresh local milk",
        price: 300,
        unit: "liter",
        quantityAvailable: 15
      },

      {
        farmer: farmer._id,
        market: market._id,
        category: byName["Baked Goods"]._id,
        name: "Whole Wheat Bread",
        description: "Fresh baked bread",
        price: 220,
        unit: "loaf",
        quantityAvailable: 12
      },

      {
        farmer: farmer._id,
        market: market._id,
        category: byName.Herbs._id,
        name: "Fresh Coriander",
        description: "Fresh coriander bunches",
        price: 80,
        unit: "bunch",
        quantityAvailable: 40
      }
    ]);

    // --------------------------------------------------
    // DATE HELPERS
    // --------------------------------------------------

    const startOfWeek = (value) => {
      const date = new Date(value);

      date.setHours(0, 0, 0, 0);

      const day = date.getDay();

      // Monday = start of week
      date.setDate(
        date.getDate() + (day === 0 ? -6 : 1 - day)
      );

      return date;
    };

    // --------------------------------------------------
    // WEEKLY STOCK
    // --------------------------------------------------

    /*
      Create weekly stock for:
      - Current week
      - Next 7 weeks

      This prevents checkout errors when customer selects
      a future pickup date.
    */

    const weeklyRows = [];

    const currentWeekStart = startOfWeek(new Date());

    for (let week = 0; week < 8; week++) {
      const weekStart = new Date(currentWeekStart);

      weekStart.setDate(
        weekStart.getDate() + week * 7
      );

      for (const product of products) {
        weeklyRows.push({
          product: product._id,
          farmer: farmer._id,
          weekStart,
          quantity: product.quantityAvailable,
          unit: product.unit,
          price: product.price,
          soldOut: false
        });
      }
    }

    await WeeklyStock.insertMany(weeklyRows);

    // --------------------------------------------------
    // PICKUP SLOTS
    // --------------------------------------------------

    /*
      Create slots for the next 14 days.

      Because the market operates Monday-Sunday,
      every upcoming day can have pickup slots.
    */

    const pickupSlots = [];

    for (let i = 1; i <= 14; i++) {
      const date = new Date();

      date.setHours(0, 0, 0, 0);

      date.setDate(date.getDate() + i);

      // ------------------------------------------------
      // Slot 1
      // ------------------------------------------------

      pickupSlots.push({
        farmer: farmer._id,
        market: market._id,
        date: new Date(date),
        startTime: "09:00",
        endTime: "10:00",
        capacity: 10
      });

      // ------------------------------------------------
      // Slot 2
      // ------------------------------------------------

      pickupSlots.push({
        farmer: farmer._id,
        market: market._id,
        date: new Date(date),
        startTime: "10:00",
        endTime: "11:00",
        capacity: 10
      });

      // ------------------------------------------------
      // Slot 3
      // ------------------------------------------------

      pickupSlots.push({
        farmer: farmer._id,
        market: market._id,
        date: new Date(date),
        startTime: "11:00",
        endTime: "12:00",
        capacity: 10
      });
    }

    await PickupSlot.insertMany(pickupSlots);

    // --------------------------------------------------
    // WELCOME NOTIFICATION
    // --------------------------------------------------

    await Notification.create({
      user: customer._id,
      type: "ANNOUNCEMENT",
      title: "Welcome to MarketLink",
      message:
        "Browse local farmers, products and pickup markets."
    });

    // --------------------------------------------------
    // SEED COMPLETE
    // --------------------------------------------------

    console.log("");
    console.log("======================================");
    console.log("       MARKETLINK SEED COMPLETE");
    console.log("======================================");

    console.log("");
    console.log(
      "Admin   : admin@marketlink.com / MarketLink@123"
    );

    console.log(
      "Farmer  : farmer@marketlink.com / MarketLink@123"
    );

    console.log(
      "Customer: customer@marketlink.com / MarketLink@123"
    );

    console.log("");
    console.log(
      "Market operating days: Monday - Sunday"
    );

    console.log(
      "Weekly stock: Current + next 7 weeks"
    );

    console.log(
      "Pickup slots: Next 14 days"
    );

    console.log("");
    console.log("======================================");

    await mongoose.connection.close();

    process.exit(0);

  } catch (error) {
    console.error("");
    console.error("Seed failed:", error);

    await mongoose.connection
      .close()
      .catch(() => {});

    process.exit(1);
  }
}

seed();