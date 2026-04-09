// cloudinary.js

const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const multer = require("multer");
const dotenv = require("dotenv");

dotenv.config();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// 1) Set up the Cloudinary Storage Engine
const imageStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "test_folder",
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
    transformation: [
      { width: 1200, height: 800, crop: "limit" }, // Max dimensions
      { quality: "auto", fetch_format: "auto" }, // Let Cloudinary auto-compress
    ],
  },
});

// 2) Use memory storage
// const storage = multer.memoryStorage();

// 1) -------Video Storage -------
const videoStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "rooms_video",
    resource_type: "video",
    allowed_formats: ["mp4", "mov", "webm", "avi"],
  },
});

// photo upload
const uploadImage = multer({
  storage: imageStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
});

const uploadVideo = multer({
  storage: videoStorage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 50MB limit for videos
});

// NEW
// const uploadMedia = multer({
//   storage,
//   limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
//   fileFilter: (req, file, cb) => {
//     if (
//       file.mimetype.startsWith("image/") ||
//       file.mimetype.startsWith("video/")
//     ) {
//       cb(null, true);
//     } else {
//       cb(new Error("Only images or video allowed!"));
//     }
//   },
// });

module.exports = { cloudinary, uploadImage, uploadVideo };
