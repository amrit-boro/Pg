const express = require("express");
const router = express.Router();
const priceController = require("../../controllers/priceController/controller");

router.get("/getPgPrice/:id", priceController.getPrice);
router.get("/getRoomPrice/:id", priceController.getRoomPrice);
module.exports = router;
