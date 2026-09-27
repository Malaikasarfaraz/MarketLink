const router = require("express").Router();
const controller = require("../controllers/weeklyStockController");
const protect = require("../middleware/authMiddleware");
const allowRoles = require("../middleware/roleMiddleware");

router.get("/", controller.listWeeklyStock);
router.get("/my", protect, allowRoles("farmer", "admin"), controller.listMyWeeklyStock);
router.post("/", protect, allowRoles("farmer", "admin"), controller.createWeeklyStock);
router.put("/:id", protect, allowRoles("farmer", "admin"), controller.updateWeeklyStock);
router.delete("/:id", protect, allowRoles("farmer", "admin"), controller.deleteWeeklyStock);

module.exports = router;
