const PgRepo = require("../../service/pg/pgRepo");
const ReviewRepo = require("../../service/review");
const BookingRepo = require("../../service/Booking/booking");
const AppError = require("../../utils/appError");
const catchAsync = require("../../utils/catchAsync");
const client = require("../../config/db");
const reviewSchema = require("../../validators/reviews");

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
  const reviewer_id = req.user.id;
  const { error, value: validatedData } = reviewSchema.validate(req.body);
  if (error) {
    return next(new AppError(error.details[0].message, 400));
  }

  const {
    booking_id,
    cleanliness,
    reviewee_id,
    listing_id,
    accuracy,
    communication,
    location_score,
    value,
    comment,
  } = validatedData;

  try {
    await client.query("BEGIN");

    // 2. Fetch booking details (Removed FOR UPDATE as unique constraint handles concurrency safely)
    const bookingResult = await BookingRepo.findBooking(booking_id);
    if (!bookingResult) {
      await client.query("ROLLBACK");
      return next(
        new AppError(
          "We couldn't find your booking. Please check the booking ID and try again.",

          404,
        ),
      );
    }
    // 3. Authorization check
    if (bookingResult.guest_id !== reviewer_id) {
      await client.query("ROLLBACK");
      return next(
        new AppError(
          "You cannot review this booking. You may have already done so.",
          403,
        ),
      );
    }

    // 4. Booking must be completed
    // if (booking.status !== "completed") {
    //   await db.query("ROLLBACK");
    //   return res.status(400).json({ error: "You can only review completed bookings" });
    // }

    if (bookingResult.host_id === reviewer_id) {
      await client.query("ROLLBACK");
      return next(new AppError("You cannot review yourself!", 400));
    }

    // 6. Compute overall rating
    // Safe to do math now because Joi guaranteed these are actual integers
    const overall_rating =
      (cleanliness + accuracy + communication + location_score + value) / 5;
    const values = [
      booking_id,
      reviewer_id,
      bookingResult.host_id,
      bookingResult.listing_id,
      overall_rating,
      cleanliness,
      accuracy,
      communication,
      location_score,
      value,
      comment, // This is now guaranteed to be safe and under 2000 chars
    ];
    const newReview = await ReviewRepo.insertReview(values);

    // UPDATE AGGREGATES (only if listing_id exists)
    if (bookingResult.listing_id) {
      await PgRepo.upDateReview(listing_id);
    }

    await client.query("COMMIT");
    res.status(200).json({
      success: true,
      data: newReview,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.log("error: ", error);
    next(error);
  }
});

// --- 3. Get Aggregated Scores for a Listing ---
// This is critical for displaying the "4.8 Star" banner on the UI

exports.getListingAggregates = async (req, res) => {
  const { id } = req.params;
  const limit = parseInt(req.query.limit) || 4;
  const offset = parseInt(req.query.offset) || 0;

  const review = await ReviewRepo.getReview(id, limit, offset);
  res.status(200).json({
    success: true,
    data: review,
  });
};

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
