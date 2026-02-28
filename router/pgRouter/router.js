const express = require("express");
const pgController = require("../../controllers/pgController/controller");
const { upload } = require("../../utils/cloudinary");
const router = express.Router();

router.get("/", pgController.getAllpg);

//posts-----------
// router.post("/createRoom", upload.single("image"), pgController.createRoom);

router.post(
  "/createPgListing",
  upload.array("image", 10),
  pgController.createPgListing,
);

router.post(
  "/createRoom",
  upload.array("image", 10),
  pgController.createPgRoom,
);

router.get("/getAllRooms/:id", pgController.getAllRoomsByPgId);
router.get("/getRoom/:id", pgController.getRoom);
router.patch("/updateRoom/:id", pgController.updateRoom);
router.delete("/deleteRoom/:id", pgController.deleteRoom);

router.post("/createReview", pgController.reviewRoom);
router.delete("/deleteListing/:id", pgController.deleteListing);
module.exports = router;
