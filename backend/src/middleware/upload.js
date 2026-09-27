const multer = require("multer");

// Files are held in memory as a buffer, then streamed straight to
// Cloudinary in the controller — no temp files ever touch the disk.
const storage = multer.memoryStorage();

function fileFilter(req, file, cb) {
  if (!file.mimetype.startsWith("image/")) {
    return cb(new Error("Only image files are allowed"));
  }
  cb(null, true);
}

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter,
});

module.exports = upload;
