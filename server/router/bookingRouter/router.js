const express = require("express");
const router = express.Router();
const bookingController = require("../../controllers/bookingController/controller");
const authController = require("../../controllers/authController");

router.post("/", authController.protect, bookingController.createBooking);

module.exports = router;
