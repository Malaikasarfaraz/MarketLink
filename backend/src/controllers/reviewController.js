const Review = require("../models/Review");
const { required, number } = require("../utils/validators");
const Order = require("../models/Order");

async function listReviews(req, res) {
  const filter = req.user?.role === "admin" ? {} : { isVisible: true };
  if (req.query.product) filter.product = req.query.product;
  if (req.query.farmer) filter.farmer = req.query.farmer;
  const reviews = await Review.find(filter).populate("customer", "name").populate("product", "name").populate("farmer", "name");
  res.json({ success: true, reviews });
}

async function createReview(req, res) {
  const { orderId, product, rating, comment } = req.body;
  required(orderId,"Order"); required(product,"Product"); required(comment,"Review comment");
  if(String(comment).trim().length>500) return res.status(400).json({success:false,message:"Review comment must be 500 characters or fewer"});
  const order = await Order.findOne({ _id: orderId, customer: req.user._id, status: "COMPLETED" });
  if (!order) return res.status(400).json({ success: false, message: "A completed order is required for a review" });
  const item = order.items.find(i => i.product.toString() === product);
  if (!item) return res.status(400).json({ success: false, message: "Product was not part of this order" });

  const exists = await Review.findOne({ order: orderId, product, customer: req.user._id });
  if (exists) return res.status(409).json({ success: false, message: "You already reviewed this product for this order" });

  const parsedRating = Number(rating);
  if (!Number.isInteger(parsedRating) || parsedRating < 1 || parsedRating > 5) return res.status(400).json({ success: false, message: "Rating must be between 1 and 5" });

  const review = await Review.create({
    customer: req.user._id, farmer: order.farmer, product, order: orderId, rating: parsedRating, comment
  });
  res.status(201).json({ success: true, review });
}

async function respondToReview(req, res) {
  const review = await Review.findById(req.params.id);
  if (!review) return res.status(404).json({ success: false, message: "Review not found" });
  if (req.user.role !== "admin" && review.farmer.toString() !== req.user._id.toString()) return res.status(403).json({ success: false, message: "Access denied" });
  review.farmerResponse = req.body.response;
  await review.save();
  res.json({ success: true, review });
}

async function moderateReview(req, res) {
  const review = await Review.findByIdAndUpdate(req.params.id, { isVisible: req.body.isVisible !== false }, { new: true });
  if (!review) return res.status(404).json({ success: false, message: "Review not found" });
  res.json({ success: true, review });
}

module.exports = { listReviews, createReview, respondToReview, moderateReview };
