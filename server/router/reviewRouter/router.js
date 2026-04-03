const express = require("express");
const reviewController = require("../../controllers/ReviewController/controller");
const authController = require("../../controllers/authController");

const router = express.Router();

router
  .route("/listing")
  .get(reviewController.getAllReview)
  .post(
    authController.protect,
    authController.restrictTo("guest"),
    reviewController.createReview,
  );

router.route("/listing/:id").get(reviewController.getListingAggregates);

module.exports = router;
