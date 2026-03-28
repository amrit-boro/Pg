const express = require("express");
const router = express.Router();
const listingController = require("../../controllers/pgController/controller");
const photoController = require("../../controllers/photoController/deleteRoomphoto");
const authController = require("../../controllers/authController");
const { upload, uploadMedia } = require("../../utils/cloudinary");

// Listings related--------------------------
//posts-----------
// router.post("/createRoom", upload.single("image"), pgController.createRoom);

router.get("/", listingController.getListings); // first 4 listings
// router.get("/allListings", listingController.getAllListings);
router.get("/filters", listingController.filterListings);
router.get("/total/:id", listingController.getTotal);

router
  .route("/:listingId")
  .get(listingController.getListing)
  .patch(authController.protect, listingController.updateListings)
  .delete(listingController.deleteListing);

// Saved listings
router
  .route("/saved-listings")
  .get(listingController.getSavedListings)
  .post(listingController.saveListing);

// router.get("/getListingById/:id", listingController.getpg);
// router.patch("/updateListing/:id", listingController.updateListings);
// router.delete("/deleteListing/:id", listingController.deleteListing);
router.delete("/deleteListingPhoto/:id", photoController.deleteListingPhoto);
router.post(
  "/createPgListing",
  upload.array("image", 10),
  listingController.createPgListing,
);
router.post(
  "/uploadListingsPhotos/:id",
  upload.array("image", 10),
  photoController.uploadListingPhoto,
);

// Room related--------------------------------

// router.post(
//   "/createRoom",
//   upload.array("image", 10),
//   listingController.createPgRoom,
// );

router.get("/:listingId/rooms", listingController.getAllRoomsByPgId);
router
  .route("/room/:roomId")
  .get(listingController.getRoom)
  .patch(listingController.updateRoom)
  .delete(listingController.deleteRoom);

router.post(
  "/createRoom",
  uploadMedia.fields([
    { name: "images", maxCount: 10 },
    { name: "video", maxCount: 1 },
  ]),
  listingController.createPgRoom,
);
router.delete("/deleteRoomPhoto/:id", photoController.deletePhoto);

// Review-------------------------------------
router.post("/createReview", listingController.reviewRoom);

// router.get("/saved-listings", listingController.getSavedListings);
module.exports = router;
