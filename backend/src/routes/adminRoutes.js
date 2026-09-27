const router = require("express").Router();
const controller = require("../controllers/adminController");
const protect = require("../middleware/authMiddleware");
const allowRoles = require("../middleware/roleMiddleware");

router.use(protect, allowRoles("admin"));
router.get("/dashboard", controller.dashboard);
router.get("/users", controller.listUsers);
router.patch("/users/:id/status", controller.setUserStatus);
router.patch("/farmers/:id/approval", controller.setFarmerApproval);
router.get("/categories", controller.categories);
router.post("/categories", controller.createCategory);
router.put("/categories/:id", controller.updateCategory);
router.delete("/categories/:id", controller.deleteCategory);
router.get("/reports", controller.reports);
router.get("/products", controller.listProducts);
router.get("/reviews", controller.listReviews);
router.post("/notifications", controller.publishNotification);
router.patch("/products/:id/moderate", controller.moderateProduct);

module.exports = router;
