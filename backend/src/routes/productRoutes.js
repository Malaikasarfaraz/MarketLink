const router = require("express").Router();
const controller = require("../controllers/productController");
const protect = require("../middleware/authMiddleware");
const optionalAuth = require("../middleware/optionalAuthMiddleware");
const allowRoles = require("../middleware/roleMiddleware");

router.get("/", optionalAuth, controller.listProducts);
router.get("/:id", controller.getProduct);
router.post("/", protect, allowRoles("farmer", "admin"), controller.createProduct);
router.put("/:id", protect, allowRoles("farmer", "admin"), controller.updateProduct);
router.delete("/:id", protect, allowRoles("farmer", "admin"), controller.deleteProduct);

module.exports = router;
