const router = require("express").Router();
const controller = require("../controllers/orderController");
const protect = require("../middleware/authMiddleware");
const allowRoles = require("../middleware/roleMiddleware");

router.post("/", protect, allowRoles("customer"), controller.createOrder);
router.get("/my", protect, allowRoles("customer"), controller.customerOrders);
router.get("/farmer", protect, allowRoles("farmer"), controller.farmerOrders);
router.get("/", protect, allowRoles("admin"), controller.allOrders);
router.patch("/:id", protect, allowRoles("customer"), controller.modifyOrder);
router.post("/:id/cancel", protect, allowRoles("customer"), controller.cancelOrder);
router.post("/:id/reorder", protect, allowRoles("customer"), controller.reorder);
router.patch("/:id/status", protect, allowRoles("farmer", "admin"), controller.updateOrderStatus);

module.exports = router;
