const PgRepo = require("../../service/pg/pgRepo");
const priceRepo = require("../../service/priceRepo/price");
const AppError = require("../../utils/appError");
const catchAsync = require("../../utils/catchAsync");

exports.getPrice = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  console.log("hello", id);
  // 1) Check is there is a pg
  const pglisting = await PgRepo.findRoomById(id);
  if (!pglisting) {
    return next(new AppError(`There is no room with Id ${id}`, 400));
  }

  const price = await priceRepo.getRoomPrice(id);
});
