const router = require("express").Router();
const controller = require("../controllers/notificationController");
const protect = require("../middleware/authMiddleware");

router.use(protect);
router.get("/", controller.listNotifications);
router.patch("/:id/read", controller.markRead);

module.exports = router;
