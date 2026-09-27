const router = require("express").Router();
const controller = require("../controllers/marketController");
const protect = require("../middleware/authMiddleware");
const allowRoles = require("../middleware/roleMiddleware");

router.get("/", controller.listMarkets);
router.get("/:id", controller.getMarket);
router.post("/", protect, allowRoles("admin"), controller.createMarket);
router.put("/:id", protect, allowRoles("admin"), controller.updateMarket);
router.delete("/:id", protect, allowRoles("admin"), controller.deleteMarket);
router.post("/:id/farmers", protect, allowRoles("admin"), controller.assignFarmer);

module.exports = router;
