const router = require("express").Router();
const { register, login, me, updateProfile, googleAuth } = require("../controllers/authController");
const protect = require("../middleware/authMiddleware");
const { authLimiter } = require("../middleware/securityMiddleware");

router.post("/register", authLimiter, register);
router.post("/login", authLimiter, login);
router.post("/google", authLimiter, googleAuth);
router.get("/me", protect, me);
router.put("/profile", protect, updateProfile);

module.exports = router;
