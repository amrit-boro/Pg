const express = require("express");
const router = express.Router();
const listingController = require("../../controllers/pgController/controller");
const roomController = require("../../controllers/pgController/roomController");
const photoController = require("../../controllers/photoController/deleteRoomphoto");
const authController = require("../../controllers/authController");
const {
  uploadImage,
  uploadVideo,
  uploadMedia,
} = require("../../utils/cloudinary");

// Listings related--------------------------
//posts-----------
// router.post("/createRoom", upload.single("image"), pgController.createRoom);
router.get("/search", listingController.search);
router.get("/top-4", listingController.getListings); // first 4 listings
// router.get("/allListings", listingController.getAllListings);
router.get("/filters", listingController.filterListings);
router.get("/total/:id", listingController.getTotal);
// Saved listings
router
  .route("/saved-listings")
  .get(listingController.getSavedListings)
  .post(listingController.saveListing)
  .delete(listingController.deleteSavedListing);

// =============
// SAVE ROOM
// =============
router
  .route("/saved-rooms")
  .get(roomController.savedRooms)
  .post(roomController.saveRooms)
  .delete(roomController.deleteSavedRoom);

router
  .route("/:listingId")
  .get(listingController.getListing)
  .patch(listingController.updateListings)
  .delete(listingController.deleteListing);

// signature...................
router.get("/upload-signature", listingController.uploadSignature);
router.post(
  "/createPgListing",
  uploadImage.array("image", 10),
  listingController.createPgListing,
);
router.post(
  "/uploadListingsPhotos/:id",
  uploadImage.array("image", 10),
  photoController.uploadListingPhoto,
);

router.delete("/deleteListingPhoto/:id", photoController.deleteListingPhoto);
// =======================================================
// Room related
// =======================================================

router.get("/:listingId/rooms", listingController.getAllRoomsByPgId);
console.log("===============");

console.log("********");
router
  .route("/room/:roomId")
  .get(listingController.getRoom)
  .patch(listingController.updateRoom)
  .delete(listingController.deleteRoom);

// --------Create Room-----------
// Method 1:
// router.post(
//   "/createRoom",
//   uploadMedia.fields([
//     { name: "images", maxCount: 10 },
//     { name: "video", maxCount: 1 },
//   ]),
//   listingController.createPgRoom,
// );

// Method 2:

router.post("/createRoom", listingController.createPgRoom); // first text data-----
router.post(
  // second image
  "/createRoom/:roomId/images",
  (req, res, next) => {
    (console.log("hello from the middleware before uploading image"), next());
  },
  uploadImage.array("images", 10),
  (err, req, res, next) => {
    if (err) {
      console.error("Multer error:", err);
      return res.status(500).json({ message: err.message });
    }
    next();
  },
  listingController.uploadRoomImages,
);
router.post(
  "/createRoom/:roomId/video",
  uploadVideo.single("video"),
  (err, req, res, next) => {
    if (err) {
      console.error("Multer error:", err);
      return res.status(500).json({ message: err.message });
    }
    next();
  },
  listingController.uploadRoomVideo,
);

router.delete("/deleteRoomPhoto/:id", photoController.deletePhoto);

// Review-------------------------------------
router.post("/createReview", listingController.reviewRoom);

// router.get("/saved-listings", listingController.getSavedListings);
module.exports = router;
