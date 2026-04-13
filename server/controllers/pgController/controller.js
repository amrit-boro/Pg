const pgRepo = require("../../service/pg/pgRepo");
const { cloudinary } = require("../../utils/cloudinary");
const pool = require("../../config/db");
const streamUpload = require("../../utils/streamUpload");
const catchAsync = require("../../utils/catchAsync");
const AppError = require("../../utils/appError");
const PgRepo = require("../../service/pg/pgRepo");
const filterRepo = require("../../service/filterRoom/filterRoom");

// filter listings==========================

exports.search = catchAsync(async (req, res, next) => {
  const { q } = req.query;
  console.log("q:", q);
  if (!q) {
    return next(new AppError("Query is required!", 400));
  }

  const searchResult = await pgRepo.searchListing(q);
  res.status(200).json({
    success: true,
    data: searchResult,
  });
});

exports.filterListings = catchAsync(async (req, res, next) => {
  const allowedFilters = ["listing_type", "maxPrice", "minPrice", "page"];
  // const { id } = req.user;
  const id = "a636d235-d681-42d2-92eb-74e57ef679aa";
  const filterData = {};

  for (const key of Object.keys(req.query)) {
    if (!allowedFilters.includes(key)) {
      return next(new AppError("Invalid query parameter", 400));
    }
    filterData[key] = req.query[key];
  }

  if (filterData.minPrice || filterData.maxPrice) {
    const min = Number(filterData.minPrice);
    const max = Number(filterData.maxPrice);

    if (filterData.minPrice && !Number.isInteger(min)) {
      return res.status(400).json({
        success: false,
        message: "Min price must be an integer",
      });
    }

    if (filterData.maxPrice && !Number.isInteger(max)) {
      return res.status(400).json({
        success: false,
        message: "Max price must be an integer",
      });
    }

    if (filterData.minPrice) filterData.minPrice = min;
    if (filterData.maxPrice) filterData.maxPrice = max;
  }

  // add user_id

  const filterValues = await filterRepo.filterListings(filterData, id);

  if (!filterValues || filterValues.length === 0) {
    return res.status(200).json({
      success: true,
      message: "Ooops room not found ):",
      total: 0,
      data: [],
    });
  }

  res.status(200).json({
    total: filterValues.length,
    success: true,
    data: filterValues,
  });
});

exports.getListings = catchAsync(async (req, res, next) => {
  const listings = await pgRepo.findListings();
  if (listings.length === 0) {
    return next(new AppError("No listing found", 400));
  }

  res.status(200).json({
    total: listings.length,
    success: true,
    data: listings,
  });
});

exports.getListing = catchAsync(async (req, res, next) => {
  const { listingId: id } = req.params;
  const currentUserId = "a636d235-d681-42d2-92eb-74e57ef679aa";
  const getListing = await pgRepo.getListingById(id, currentUserId);
  if (getListing.length === 0) {
    return next(new AppError("No listing found", 400));
  }
  res.status(200).json({
    success: true,
    data: getListing,
  });
});

exports.getAllListings = catchAsync(async (req, res, next) => {
  const filterData = req.query;

  const allListings = await pgRepo.findAllPg(filterData);
  if (allListings.length === 0) {
    return next(new AppError(`No listing found!!`));
  }
  res.status(200).json({
    total: allListings.length,
    success: true,
    data: allListings,
  });
});

exports.updateListings = catchAsync(async (req, res, next) => {
  const { listingId: id } = req.params;
  console.log("id:", id);
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
  const filters = {
    listingId: req.params.listingId,
    ...req.query,
  };

  // const currentUser = req.user
  const currentUser = "a636d235-d681-42d2-92eb-74e57ef679aa";

  const rooms = await pgRepo.getAllRoomsById(filters, currentUser);
  if (!rooms || rooms.rooms.length === 0) {
    return next(new AppError("Room not found!", 200));
  }
  res.status(200).json({
    total: rooms.rooms.length,
    success: true,
    data: rooms,
  });
});

// UPDATE ROOM BY ID ==========================================

exports.updateRoom = catchAsync(async (req, res, next) => {
  console.log("callled");
  const updateFields = req.body;
  console.log("fiels: ", updateFields);
  const { roomId: id } = req.params;
  console.log("id: ", id);
  const existingRoom = await pgRepo.getRoomById(id);
  if (!existingRoom) {
    return next(new AppError(`Room not found with Id: ${id}!`, 404));
  }
  console.log("updateFields: ", updateFields, "roomID: ", id);
  const updatedRoom = await pgRepo.updateRoomById(updateFields, id);
  if (!updatedRoom) {
    return next(new AppError("Room not found or deleted!", 404));
  }
  res.status(201).json({
    success: true,
    data: updatedRoom,
  });
});

// GET ROOM BY ID ============================================

exports.getRoom = catchAsync(async (req, res, next) => {
  const { roomId: id } = req.params;
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
// ================================================================================================
exports.uploadSignature = catchAsync(async (req, res, next) => {
  const timestamp = Math.round(new Date().getTime() / 1000);

  // Any specific upload parameters go here (e.g., folder, transformation)
  const paramsToSign = {
    timestamp: timestamp,
    folder: "test_folder",
  };

  const signature = cloudinary.utils.api_sign_request(
    paramsToSign,
    process.env.CLOUDINARY_API_SECRET,
  );

  res.json({
    signature,
    timestamp,
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    folder: "test_folder",
  });
});

// exports.createPgListing = catchAsync(async (req, res, next) => {
//   let uploadResults = [];
//   console.log("hit================");
//   console.log("file: ", req.files);
//   const imageUrls = req.files.map((file) => file.path);
//   console.log(imageUrls);
//   try {
//     if (!req.files || req.files.length < 3) {
//       return next(new AppError("You must upload atleast 3 photos", 400));
//     }

//     // 1️⃣ Upload images first (outside transaction)
//     uploadResults = await Promise.all(
//       req.files.map((file) => streamUpload(file.buffer)),
//     );

//     const client = await pool.connect();

//     await client.query("BEGIN");

//     // 2️⃣ Create listing
//     const newListing = await pgRepo.createListing(client, {
//       ...req.body,
//     });

//     if (!newListing) {
//       await client.query("ROLLBACK");
//       return next(new AppError("Failed to create listing", 500));
//     }

//     // 3️⃣ Prepare photo payload
//     const photos = uploadResults.map((result, i) => ({
//       listing_id: newListing.id,
//       url: result.secure_url,
//       public_id: result.public_id,
//       caption: req.body.caption || null,
//       is_cover: i === 0,
//       sort_order: i,
//     }));

//     // Saved to Database
//     const savedPhotos = await pgRepo.bulkInsertPhotos(client, photos);

//     await client.query("COMMIT");

//     res.status(201).json({
//       success: true,
//       listing: newListing,
//       photos: savedPhotos,
//     });
//   } catch (error) {
//     await client.query("ROLLBACK");
//     // Cleanup uploaded images if DB fails
//     if (uploadResults.length > 0) {
//       await Promise.all(
//         uploadResults.map((r) => cloudinary.uploader.destroy(r.public_id)),
//       );
//     }

//     next(error); // ✅ Forward to global error handler
//   } finally {
//     client.release();
//   }
// });

exports.createPgListing = catchAsync(async (req, res, next) => {
  const client = await pool.connect();
  try {
    if (!req.files || req.files.length < 3) {
      return next(new AppError("You must upload at least 3 photos", 400));
    }

    await client.query("BEGIN");
    const newListing = await pgRepo.createListing(client, { ...req.body });

    if (!newListing) {
      await client.query("ROLLBACK");
      return next(new AppError("Failed to create listing", 500));
    }

    const photos = req.files.map((file, i) => ({
      listing_id: newListing.id,
      url: file.path,
      public_id: file.filename,
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
    if (req.files && req.files.length > 0) {
      await Promise.all(
        req.files.map((file) => cloudinary.uploader.destroy(file.filename)),
      );
    }
    next(error);
  } finally {
    client.release();
  }
});

// --------------Create Pg Room ----------
// Method 1: OLD
// exports.createPgRoom = catchAsync(async (req, res, next) => {
//   // Define variables at the top, but DO NOT check out the DB client yet
//   let client;
//   let uploadResults = [];
//   let uploadedVideo = null;
//   const images = req.files.images || [];
//   const video = req.files.video?.[0];

//   console.log("file: ", req.files.images);

//   if (!images || images.length < 3) {
//     return next(new AppError("You must upload atleast 3 photos!", 400));
//   }

//   if (!video) {
//     return next(new AppError("You must upload a video!", 400));
//   }

//   const photolimit = 5 * 1024 * 1024; // 5MB lilmit

//   for (const img of images) {
//     // check type
//     if (!img.mimetype.startsWith("image/")) {
//       return next(
//         new AppError(`File '${img.originalname}' is not a valid image! `, 400),
//       );
//     }

//     // check size
//     if (img.size > photolimit) {
//       return next(
//         new AppError(
//           `Photo '${img.originalname}' is too large! Please keep individual photos under 5MB.`,
//           400,
//         ),
//       );
//     }
//   }

//   try {
//     // 1. Validate inputs early (fast fail)

//     // 2. Upload ALL media in parallel (Images AND Video together)
//     // This dramatically reduces the total wait time.
//     const imageUploadPromises = images.map((file) =>
//       streamUpload(file.buffer, "image"),
//     );
//     const videoUploadPromise = streamUpload(video.buffer, "video");

//     const [resolvedImages, resolvedVideo] = await Promise.all([
//       Promise.all(imageUploadPromises),
//       videoUploadPromise,
//     ]);

//     // Assign to our outer variables for the catch block to access if DB fails
//     uploadResults = resolvedImages;
//     uploadedVideo = resolvedVideo;

//     // 3. NOW check out the DB connection (Network IO is done)
//     client = await pool.connect();
//     await client.query("BEGIN");

//     // 4. Database Operations
//     const newRoom = await pgRepo.createRoom(client, { ...req.body });

//     const photos = uploadResults.map((result, i) => ({
//       room_id: newRoom.id,
//       url: result.secure_url,
//       public_id: result.public_id,
//       caption: req.body.caption || null,
//       is_cover: i === 0,
//       sort_order: i,
//       media_type: "image",
//     }));

//     photos.push({
//       room_id: newRoom.id,
//       url: uploadedVideo.secure_url,
//       public_id: uploadedVideo.public_id,
//       caption: "Room Video",
//       is_cover: false,
//       sort_order: 0,
//       media_type: "video",
//     });

//     const savedMedia = await pgRepo.createRoomsPhotos(client, photos);

//     await client.query("COMMIT");

//     return res.status(201).json({
//       success: true,
//       message: "Room created successfully!!",
//       data: newRoom,
//       photos: savedMedia,
//     });
//   } catch (error) {
//     // 5. Cleanup Database
//     if (client) {
//       await client.query("ROLLBACK");
//     }

//     // 6. Cleanup Cloudinary (Fixed syntax errors)
//     const cleanupPromises = [];

//     if (uploadResults && uploadResults.length > 0) {
//       // Removed curly braces so the promise is implicitly returned
//       const imageCleanup = uploadResults.map((r) =>
//         cloudinary.uploader.destroy(r.public_id),
//       );
//       cleanupPromises.push(...imageCleanup);
//     }

//     if (uploadedVideo) {
//       // Fixed argument syntax for Cloudinary video deletion
//       cleanupPromises.push(
//         cloudinary.uploader.destroy(uploadedVideo.public_id, {
//           resource_type: "video",
//         }),
//       );
//     }

//     // Wait for all cleanup tasks to finish
//     await Promise.allSettled(cleanupPromises); // Promise.allSettled is safer here so one failed deletion doesn't stop the rest

//     next(error);
//   } finally {
//     // 7. Ensure connection is released ONLY if it was actually acquired
//     if (client) {
//       client.release();
//     }
//   }
// });

// The new ONE Create Pg Romm--------------

// ==========================================
// STEP 1: CREATE THE ROOM (Text Data Only)
// ==========================================
exports.createPgRoom = catchAsync(async (req, res, next) => {
  let client;

  try {
    client = await pool.connect();
    await client.query("BEGIN");

    // Create the room using ONLY the text data from the form
    const newRoom = await pgRepo.createRoom(client, { ...req.body });

    await client.query("COMMIT");

    // Return the new room ID to the frontend immediately so it can
    // fire off the parallel image and video uploads
    return res.status(201).json({
      success: true,
      message: "Room details saved! Awaiting media...",
      data: newRoom,
    });
  } catch (error) {
    if (client) await client.query("ROLLBACK");
    next(error);
  } finally {
    if (client) client.release();
  }
});

// Upload image room
exports.uploadRoomImages = catchAsync(async (req, res, next) => {
  const { roomId } = req.params;
  // Verify file exists
  console.log("hello");
  if (!req.files || req.files.length === 0) {
    return next(new AppError("No images provided for upload!", 400));
  }

  // 2. Prepare the database insert promises
  // req.files is an array populated by multer-storage-cloudinary
  const uploadPromises = req.files.map((file, index) => {
    // Cloudinary specific fields returned by Multer
    const url = file.path;
    const public_id = file.filename;

    const is_cover = index === 0;
    const sort_order = index;

    // Execute the insert query
    return pool.query(
      `INSERT INTO rooms_photos 
          (room_id, url, public_id, is_cover, sort_order) 
         VALUES 
          ($1, $2, $3, $4, $5) 
         RETURNING id, url, is_cover, sort_order`,
      [roomId, url, public_id, is_cover, sort_order],
    );
  });

  // 3. Run all database inserts in parallel for maximum speed
  const results = await Promise.all(uploadPromises);

  // Extract the returned rows to send back to the frontend
  const insertedPhotos = results.map((result) => result.rows[0]);

  // 4. Send success response
  res.status(201).json({
    message: "Images successfully uploaded and linked to room.",
    photos: insertedPhotos,
  });
});

// Upload room video
exports.uploadRoomVideo = catchAsync(async (req, res, next) => {
  const { roomId } = req.params;
  // Verify file exists
  if (!req.file) {
    return next(new AppError("No video provided for upload", 400));
  }

  // 2) Extract Cloudinary Data
  const url = req.file.path;
  const public_id = req.file.filename;

  // 3. Save to database
  // We explicitly flag media_type as 'video' so your frontend knows
  // to render a <video> tag instead of an <img> tag for this URL.
  const result = await pool.query(
    `INSERT INTO rooms_photos 
        (room_id, url, public_id, media_type) 
       VALUES 
        ($1, $2, $3, $4) 
       RETURNING id, url, media_type`,
    [roomId, url, public_id, "video"],
  );

  const insertedVideo = result.rows[0];

  // 4. Send success response
  res.status(201).json({
    message: "Video successfully uploaded and linked to room.",
    video: insertedVideo,
  });
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
  const { id } = req.params;
  // check listings
  console.log("id: ", id);
  const pgresult = await pgRepo.findListingById(id);
  if (pgresult.length === 0) {
    return next(new AppError("No listing found", 400));
  }
  console.log("=========");
  // check total rooms
  const result = await pgRepo.getTotaltype(id);
  res.status(200).json({
    success: true,
    result,
  });
});

// ==========================================================================
// SAVED LISTINGS

exports.saveListing = catchAsync(async (req, res, next) => {
  console.log("req body :", req.body);
  const id = "a636d235-d681-42d2-92eb-74e57ef679aa"; // harcoded
  const { listing_id } = req.body;

  await pgRepo.saveListing(id, listing_id);
  res.status(201).json({
    success: true,
    message: "Listing saved",
  });
});

exports.getSavedListings = catchAsync(async (req, res, next) => {
  const userId = "a636d235-d681-42d2-92eb-74e57ef679aa";
  const result = await pgRepo.getSaveListing(userId);

  res.status(200).json({
    success: true,
    total: result.length,
    data: result || [],
  });
});

exports.deleteSavedListing = catchAsync(async (req, res, next) => {
  // const {id} = req.user
  const id = "a636d235-d681-42d2-92eb-74e57ef679aa";
  const { listing_id } = req.body;

  await pgRepo.removeSavedListing(id, listing_id);

  res.status(200).json({
    success: true,
    message: "Deleted",
  });
});
