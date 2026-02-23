const express = require("express");
const pgController = require("../../controllers/pgController/controller");
const { upload } = require("../../utils/cloudinary");
const router = express.Router();

router.get("/getAllPgRoom", pgController.getAllpg);
router.get("/getRoom/:id", pgController.getRoom);

//posts-----------
// router.post("/createRoom", upload.single("image"), pgController.createRoom);
router.post("/createRoom", upload.array("image", 10), pgController.createRoom);

router.post("/createReview", pgController.reviewRoom);
router.patch("/updateRoom/:id", pgController.updateRoom);
router.post("/deleteRoom/:id", pgController.deleteRoom);

module.exports = router;
