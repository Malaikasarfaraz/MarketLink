const router = require("express").Router();
const controller = require("../controllers/reviewController");
const protect = require("../middleware/authMiddleware");
const allowRoles = require("../middleware/roleMiddleware");

router.get("/", controller.listReviews);
router.post("/", protect, allowRoles("customer"), controller.createReview);
router.patch("/:id/respond", protect, allowRoles("farmer", "admin"), controller.respondToReview);
router.patch("/:id/moderate", protect, allowRoles("admin"), controller.moderateReview);

module.exports = router;
