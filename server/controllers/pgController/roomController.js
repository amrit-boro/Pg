const PgRepo = require("../../service/pg/pgRepo");
const RoomRepo = require("../../service/filterRoom/filterRoom");
const AppError = require("../../utils/appError");
const catchAsync = require("../../utils/catchAsync");

// FOR GETTING ===========
exports.savedRooms = catchAsync(async (req, res, next) => {
  const userId = "a636d235-d681-42d2-92eb-74e57ef679aa";
  const result = await PgRepo.getSavedRooms(userId);
  res.status(200).json({
    success: true,
    data: result || [],
  });
});

// FOR SAVING
exports.saveRooms = catchAsync(async (req, res, next) => {
  const userId = "a636d235-d681-42d2-92eb-74e57ef679aa";
  const { room_id, listing_id } = req.body;
  await PgRepo.saveRooms(userId, room_id, listing_id);
  res.status(201).json({
    success: true,
    message: "Room Saved!",
  });
});

// FOR DELETING

exports.deleteSavedRoom = catchAsync(async (req, res, next) => {
  const userId = "a636d235-d681-42d2-92eb-74e57ef679aa";
  const { room_id } = req.body;
  await PgRepo.removeRoom(userId, room_id);

  res.status(200).json({
    success: true,
    message: "Successfully Deleted!!",
  });
});

// FETCH ALL PHOTOS

exports.AllRoomPhotos = catchAsync(async (req, res, next) => {
  const roomId = req.params.roomId;
  const rphotos = await RoomRepo.roomPhotos(roomId);
  res.status(200).json({
    data: rphotos,
  });
});
