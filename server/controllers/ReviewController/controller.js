const PgRepo = require("../../service/pg/pgRepo");
const AppError = require("../../utils/appError");
const catchAsync = require("../../utils/catchAsync");

exports.getAllReview = catchAsync(async (req, res, next) => {
  const reviews = await PgRepo.getAllReviews();
  if (!reviews) {
    return next(new AppError("There is no review's", 200));
  }
  res.status(200).json({
    status: "success",
    data: reviews,
  });
});

exports.createReview = catchAsync(async (req, res, next) => {
  const newReview = await PgRepo.createReview(req.body);

  res.status(201).json({
    status: "success",
    data: newReview,
  });
});

exports.getAllReviewById = catchAsync(async (req, res, next) => {
  const { listing_id } = req.body;

  const reviews = await PgRepo.getAllPgReviewsById(listing_id);

  if (!reviews) {
    return next(new AppError("There is no review", 200));
  }

  res.status(200).json({
    status: "success",
    data: reviews,
  });
});
