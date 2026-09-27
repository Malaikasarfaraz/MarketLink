const router = require("express").Router();
const controller = require("../controllers/favoriteController");
const protect = require("../middleware/authMiddleware");
const allowRoles = require("../middleware/roleMiddleware");

router.use(protect, allowRoles("customer"));
router.get("/", controller.listFavorites);
router.post("/", controller.addFavorite);
router.delete("/:id", controller.removeFavorite);

module.exports = router;
