const express = require("express");
const router = express.Router();
const priceController = require("../../controllers/priceController/controller");

router.get("/pgPrice/:id", priceController.getPrice);
router.get("/roomPrice/:id", priceController.getRoomPrice);
module.exports = router;
