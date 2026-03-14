const pgRepo = require("../../service/pg/pgRepo");
const { cloudinary } = require("../../utils/cloudinary");
const pool = require("../../config/db");
const streamUpload = require("../../utils/streamUpload");
const catchAsync = require("../../utils/catchAsync");
const AppError = require("../../utils/appError");
const PgRepo = require("../../service/pg/pgRepo");

exports.getpgs = catchAsync(async (req, res, next) => {
  console.log("hello");
  const pgresult = await pgRepo.findsomePg();
  if (!pgresult) {
    return next(new AppError("No listing found", 400));
  }

  res.status(200).json({
    success: true,
    data: pgresult,
  });
});
exports.getpg = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const pgresult = await pgRepo.getListingById(id);
  if (!pgresult) {
    return next(new AppError("No listing found", 400));
  }

  res.status(200).json({
    success: true,
    data: pgresult,
  });
});

exports.getAllpg = catchAsync(async (req, res, next) => {
  const filterData = req.query;

  const allpg = await pgRepo.findAllPg(filterData);
  if (!allpg) {
    return next(new AppError(`No listing found!!`));
  }
  res.status(200).json({
    total: allpg.length,
    success: true,
    data: allpg,
  });
});

exports.updateListings = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  // Check listing is active or not-----
  const existingListing = await PgRepo.findListingById(id);
  if (!existingListing) {
    return next(new AppError("Pg not found!!", 404));
  }
  const updated = await pgRepo.updatePgListingById(id, req.body);
  if (!updated) {
    return next(new AppError("Listing not found or deleted!", 404));
  }
  res.status(201).json({
    success: true,
    data: updated,
  });
});

// Rooms related==============================================

exports.getAllRoomsByPgId = catchAsync(async (req, res, next) => {
  const { type, pgId } = req.query;
  const allRooms = await pgRepo.getAllRoomsById(type, pgId);

  if (!allRooms || allRooms.rooms.length === 0) {
    return res.status(200).json({
      success: true,
      message: "Oops room not found ):",
      total: 0,
      data: [],
    });
  }
  res.status(200).json({
    total: allRooms.rooms.length,
    success: true,
    data: allRooms,
  });
});

// UPDATE ROOM BY ID ==========================================

exports.updateRoom = catchAsync(async (req, res, next) => {
  const updateFields = { ...req.body };
  const { id } = req.params;
  const existingRoom = await pgRepo.getRoomById(id);
  if (!existingRoom) {
    return next(new AppError(`Room not found with Id: ${id}!`, 404));
  }
  const updatedRoom = await pgRepo.updateRoomById(updateFields, id);
  if (!updatedRoom) {
    return next(new AppError("Room not found or deleted!", 404));
  }
  return res.status(201).json({
    success: true,
    data: updatedRoom,
  });
});

// GET ROOM BY ID ============================================

exports.getRoom = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const result = await pgRepo.getRoomById(id);

  // 1. Check if the result is empty or null
  if (!result || (Array.isArray(result) && result.length === 0)) {
    return next(new AppError(`No room found with id ${id}`, 404));
  }

  // 2. Success case
  res.status(200).json({
    success: true,
    data: result,
  });
});

exports.createPgListing = catchAsync(async (req, res, next) => {
  const client = await pool.connect();
  let uploadResults = [];

  try {
    if (!req.files || req.files.length < 3) {
      return next(new AppError("You must upload atleast 3 photos", 400));
    }

    // 1️⃣ Upload images first (outside transaction)
    uploadResults = await Promise.all(
      req.files.map((file) => streamUpload(file.buffer)),
    );

    await client.query("BEGIN");

    // 2️⃣ Create listing
    const newListing = await pgRepo.createListing(client, {
      ...req.body,
    });

    if (!newListing) {
      await client.query("ROLLBACK");
      return next(new AppError("Failed to create listing", 500));
    }

    // 3️⃣ Prepare photo payload
    const photos = uploadResults.map((result, i) => ({
      listing_id: newListing.id,
      url: result.secure_url,
      public_id: result.public_id,
      caption: req.body.caption || null,
      is_cover: i === 0,
      sort_order: i,
    }));

    const savedPhotos = await pgRepo.bulkInsertPhotos(client, photos);

    await client.query("COMMIT");

    res.status(201).json({
      success: true,
      listing: newListing,
      photos: savedPhotos,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    // Cleanup uploaded images if DB fails
    if (uploadResults.length > 0) {
      await Promise.all(
        uploadResults.map((r) => cloudinary.uploader.destroy(r.public_id)),
      );
    }

    next(error); // ✅ Forward to global error handler
  } finally {
    client.release();
  }
});

exports.createPgRoom = catchAsync(async (req, res, next) => {
  const client = await pool.connect();
  let uploadResults = [];
  let uploadedVideo = null;
  const images = req.files.images || [];
  const video = req.files.video?.[0];

  try {
    if (!images || images.length < 3) {
      return res.status(400).json({
        success: false,
        message: "You must upload at least 3 photos",
      });
    }

    if (!video) {
      return res.status(400).json({
        success: false,
        message: "You must upload a video!",
      });
    }

    // upload image first (without transaction)
    uploadResults = await Promise.all(
      images.map((file) => streamUpload(file.buffer, "image")),
    );

    // upload video (without transaction)
    uploadedVideo = await streamUpload(video.buffer, "video");

    await client.query("BEGIN");

    const newRoom = await pgRepo.createRoom(client, { ...req.body });

    // 2️⃣ Upload multiple images in parallel
    const photos = uploadResults.map((result, i) => ({
      room_id: newRoom.id,
      url: result.secure_url,
      public_id: result.public_id,
      caption: req.body.caption || null,
      is_cover: i === 0,
      sort_order: i,
      media_type: "image",
    }));

    photos.push({
      room_id: newRoom.id,
      url: uploadedVideo.secure_url,
      public_id: uploadedVideo.public_id,
      caption: "Room Video",
      is_cover: false,
      sort_order: 0,
      media_type: "video",
    });

    const savedMedia = await pgRepo.createRoomsPhotos(client, photos);

    await client.query("COMMIT");

    return res.status(201).json({
      success: true,
      message: "Room created successfully!!",
      data: newRoom,
      photos: savedMedia,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    if (uploadResults && uploadResults.length > 0) {
      await Promise.all(
        uploadResults.map((r) => {
          cloudinary.uploader.destroy(r.public_id);
        }),
      );
    }

    if (uploadedVideo) {
      (await cloudinary.uploader.destroy(uploadedVideo.public_id),
        {
          resource_type: "video",
        });
    }

    next(error); // Forward to Global error
  } finally {
    client.release();
  }
});

exports.deleteListing = catchAsync(async (req, res, next) => {
  const { id: listing_id } = req.params;
  const { host_id } = req.body;
  const deleted = await pgRepo.deleteListingById({ listing_id, host_id });
  if (!deleted) {
    return next(new AppError("Listing not found or unauthorized!", 404));
  }
  res.status(200).json({
    success: true,
    message: "Succesfully deleted!!",
  });
});

// DELETE room
exports.deleteRoom = catchAsync(async (req, res) => {
  const { id: roomId } = req.params;
  const { listing_id } = req.body;
  const deleted = await pgRepo.deleteRoomById({ roomId, listing_id });
  if (!deleted) {
    next(new AppError("Room not found or unauthorized", 404));
  }
  return res.status(200).json({
    success: true,
    message: "Succesfully deleted!!",
  });
});

exports.reviewRoom = catchAsync(async (req, res, next) => {
  const { reviewer_id, listing_id, overall_rating, comment } = req.body;
  const review = pgRepo.createReview({
    reviewer_id,
    listing_id,
    overall_rating,
    comment,
  });
  res.status(201).json({
    success: true,
    data: {
      review,
    },
    message: "Review created successfully!!",
  });
});

exports.getTotal = catchAsync(async (req, res, next) => {
  const { pgId } = req.query;
  const pgresult = await pgRepo.getListingById(pgId);
  if (!pgresult) {
    return next(new AppError("No listing found", 400));
  }
  const result = await pgRepo.getTotal(pgId);
  res.status(200).json({
    success: true,
    result,
  });
});
