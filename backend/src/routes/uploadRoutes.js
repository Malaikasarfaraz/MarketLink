const router = require("express").Router();
const protect = require("../middleware/authMiddleware");
const allowRoles = require("../middleware/roleMiddleware");
const upload = require("../middleware/upload");
const { uploadProductImage, uploadFarmerImage, deleteImage } = require("../controllers/uploadController");

// Farmers upload product photos when adding/editing a product.
router.post("/product-image", protect, allowRoles("farmer", "admin"), upload.single("image"), uploadProductImage);

// Farmers upload a stall/profile photo for their farmer profile.
router.post("/farmer-image", protect, allowRoles("farmer", "admin"), upload.single("image"), uploadFarmerImage);

// Used when a farmer replaces or removes an image, so the old file
// doesn't sit around in Cloudinary storage forever.
router.delete("/", protect, allowRoles("farmer", "admin"), deleteImage);

module.exports = router;
