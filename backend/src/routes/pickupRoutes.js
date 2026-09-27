const router = require("express").Router();
const controller = require("../controllers/pickupController");
const protect = require("../middleware/authMiddleware");
const allowRoles = require("../middleware/roleMiddleware");

router.get("/", controller.listSlots);
router.post("/", protect, allowRoles("farmer", "admin"), controller.createSlot);
router.put("/:id", protect, allowRoles("farmer", "admin"), controller.updateSlot);
router.delete("/:id", protect, allowRoles("farmer", "admin"), controller.deleteSlot);

module.exports = router;
