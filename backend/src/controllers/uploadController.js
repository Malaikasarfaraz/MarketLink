const cloudinary = require("../config/cloudinary");

function uploadBufferToCloudinary(buffer, folder) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: `marketlink/${folder}`,
        transformation: [{ width: 1000, height: 1000, crop: "limit" }],
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    stream.end(buffer);
  });
}

async function uploadProductImage(req, res) {
  if (!req.file) {
    return res.status(400).json({ success: false, message: "No image file was provided" });
  }
  const result = await uploadBufferToCloudinary(req.file.buffer, "products");
  res.status(201).json({ success: true, url: result.secure_url, publicId: result.public_id });
}

async function uploadFarmerImage(req, res) {
  if (!req.file) {
    return res.status(400).json({ success: false, message: "No image file was provided" });
  }
  const result = await uploadBufferToCloudinary(req.file.buffer, "farmers");
  res.status(201).json({ success: true, url: result.secure_url, publicId: result.public_id });
}

async function deleteImage(req, res) {
  const { publicId } = req.body;
  if (!publicId) {
    return res.status(400).json({ success: false, message: "publicId is required" });
  }
  await cloudinary.uploader.destroy(publicId);
  res.json({ success: true, message: "Image deleted" });
}

module.exports = { uploadProductImage, uploadFarmerImage, deleteImage };
