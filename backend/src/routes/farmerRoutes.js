const router = require("express").Router();
const controller = require("../controllers/farmerController");
const protect = require("../middleware/authMiddleware");
const allowRoles = require("../middleware/roleMiddleware");

router.get("/", controller.listFarmers);
router.get("/:id", controller.profile);
router.put("/profile", protect, allowRoles("farmer"), controller.updateProfile);
router.get("/me/insights", protect, allowRoles("farmer"), controller.insights);

module.exports = router;
