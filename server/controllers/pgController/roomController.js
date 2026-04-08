const PgRepo = require("../../service/pg/pgRepo");
const AppError = require("../../utils/appError");
const catchAsync = require("../../utils/catchAsync");

exports.savedRooms = catchAsync(async (req, res, next) => {
  const userId = "a636d235-d681-42d2-92eb-74e57ef679aa";
  const result = await PgRepo.getSavedRooms(userId);
  if (result.length === 0) {
    return next(new AppError("No saved-room found!", 404));
  }
  res.status(200).json({
    success: true,
    data: result,
  });
});
