const express = require("express");
const filterController = require("../../controllers/filterController/roomFilter");

const router = express.Router();

router.get("/", filterController.filterListings);

module.exports = router;
