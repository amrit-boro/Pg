const express = require("express");
const pgController = require("../../controllers/pgController/controller");
const photoController = require("../../controllers/photoController/deleteRoomphoto");
const { upload } = require("../../utils/cloudinary");
const router = express.Router();

router.get("/getAllPgs", pgController.getAllpg);
router.patch("/updateListing/:id", pgController.updateListings);

//posts-----------
// router.post("/createRoom", upload.single("image"), pgController.createRoom);

// Listings related--------------------------
router.delete("/deleteListing/:id", pgController.deleteListing);
router.delete("/deleteListingPhoto/:id", photoController.deleteListingPhoto);
router.post(
  "/createPgListing",
  upload.array("image", 10),
  pgController.createPgListing,
);

// Room related--------------------------------
router.post(
  "/createRoom",
  upload.array("image", 10),
  pgController.createPgRoom,
);
router.get("/getAllRooms/:id", pgController.getAllRoomsByPgId);
router.get("/getRoom/:id", pgController.getRoom);
router.patch("/updateRoom/:id", pgController.updateRoom);
router.delete("/deleteRoom/:id", pgController.deleteRoom);
router.delete("/deleteRoomPhoto/:id", photoController.deletePhoto);

// Review-------------------------------------
router.post("/createReview", pgController.reviewRoom);
module.exports = router;
