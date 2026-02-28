const pgRepo = require("../../service/pg/pgRepo");
const streamifier = require("streamifier");
const { cloudinary } = require("../../utils/cloudinary");
const pool = require("../../config/db");
const streamUpload = require("../../utils/streamUpload");
const catchAsync = require("../../utils/catchAsync");
const AppError = require("../../utils/appError");

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

exports.getAllRoomsByPgId = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const allRooms = await pgRepo.getAllRoomsById(id);
  if (!allRooms) {
    return next(new AppError(`No room found with ID ${id}`));
  }
  res.status(200).json({
    total_room: allRooms.rooms.length,
    success: true,
    data: allRooms,
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
  return res.status(201).json({
    success: true,
    data: {
      review,
    },
    message: "Review created successfully!!",
  });
});

// UPDATE ROOM BY ID ==========================================

exports.updateRoom = catchAsync(async (req, res, next) => {
  const updateFields = { ...req.body };
  const { id } = req.params;
  const updatedRoom = await pgRepo.updateRoomById(updateFields, id);
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

// exports.createRoom = async (req, res) => {
//   try {
//     let image_url = null;
//     let publicId = null;

//     // If image exists upload to cloudinary------
//     if (req.file) {
//       const streamUpload = () =>
//         new Promise((resolve, reject) => {
//           const stream = cloudinary.uploader.upload_stream(
//             {
//               folder: "test_folder",
//             },
//             (error, result) => {
//               if (result) resolve(result);
//               else reject(error);
//             },
//           );
//           streamifier.createReadStream(req.file.buffer).pipe(stream);
//         });
//       const result = await streamUpload();
//       image_url = result.secure_url;
//       publicId = result.public_id;
//     }
//     const pgData = {
//       ...req.body,
//       image_url: image_url,
//       image_public_id: publicId,updateRoom
//     };

//     const newPg = await pgRepo.createPg(pgData);
//     return res.status(201).json({
//       success: true,
//       message: "Room successfully created!",
//       data: newPg,
//     });
//   } catch (error) {
//     console.log("Error: ", error.message);
//     throw new Error(error.message);
//   }
//   // try {
//   //   const pgData = req.body;
//   // const newPg = await pgRepo.createPg(pgData);
//   //   return res.status(201).json({
//   //     success: true,
//   //     messages: "Room successfully created!!",
//   //     data: newPg,
//   //   });
//   // } catch (error) {
//   //   throw new Error(error);
//   // }
// };

//===========================================================================================

// exports.createRoom = async (req, res) => {
//   const client = await pool.connect();

//   try {
//     const pgData = { ...req.body };
//     await client.query("BEGIN");

//     // 1️⃣ Create listing
//     const newListing = await pgRepo.createListing(client, pgData);

//     // 2️⃣ Upload image if exists
//     let uploadedPhoto = null;
//     if (req.file) {
//       const result = await streamUpload(req.file.buffer);

//       uploadedPhoto = await pgRepo.addPhoto(client, {
//         listing_id: newListing.id,
//         url: result.secure_url,
//         public_id: result.public_id,
//         caption: req.body.caption,
//         is_cover: true,
//         sort_order: 0,
//       });
//     }

//     await client.query("COMMIT");

//     return res.status(201).json({
//       success: true,
//       listing: newListing,
//       photo: uploadedPhoto,
//     });
//   } catch (error) {
//     await client.query("ROLLBACK");
//     if (result?.public_id) {
//       await cloudinary.uploader.destroy(result.public_id);
//     }
//     return res.status(500).json({ error: error.message });
//   } finally {
//     client.release();
//   }
// };

// ========================================================================
// ========================================================================
// exports.createPgListing = async (req, res) => {
//   const client = await pool.connect();

//   let uploadResults = [];

//   try {
//     if (!req.files || req.files.length < 3) {
//       return res.status(400).json({
//         success: false,
//         message: "You must upload at least 3 photos",
//       });
//     }

//     // uplload images FIRST (outside transaction)
//     uploadResults = await Promise.all(
//       req.files.map((file) => streamUpload(file.buffer)),
//     );

//     await client.query("BEGIN");

//     // 1️⃣ Create listing
//     const newListing = await pgRepo.createListing(client, { ...req.body });

//     // 2️⃣ Upload multiple images in parallel
//     const photos = uploadResults.map((result, i) => ({
//       listing_id: newListing.id,
//       url: result.secure_url,
//       public_id: result.public_id,
//       caption: req.body.caption || null,
//       is_cover: i === 0,
//       sort_order: i,
//     }));
//     const savedPhotos = await pgRepo.bulkInsertPhotos(client, photos);

//     await client.query("COMMIT");

//     return res.status(201).json({
//       success: true,
//       listing: newListing,
//       photos: savedPhotos,
//     });

//     // upload multiple imgaes paralle....
//   } catch (error) {
//     await client.query("ROLLBACK");
//     if (uploadResults && uploadResults.length > 0) {
//       await Promise.all(
//         uploadResults.map((r) => {
//           cloudinary.uploader.destroy(r.public_id);
//         }),
//       );
//     }
//     return res.status(500).json({
//       success: false,
//       message: error.message,
//     });
//   } finally {
//     client.release();
//   }
// };

exports.createPgListing = catchAsync(async (req, res, next) => {
  const client = await pool.connect();
  let uploadResults = [];

  try {
    if (!req.files || req.files.length < 3) {
      const error = new Error("You must upload at least 3 photos");
      error.statusCode = 400;
      throw error;
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

exports.createPgRoom = async (req, res, next) => {
  const client = await pool.connect();
  let uploadResults = [];

  try {
    if (!req.files || req.files.length < 3) {
      return res.status(400).json({
        success: false,
        message: "You must upload at least 3 photos",
      });
    }

    // upload image first (without transaction)
    uploadResults = await Promise.all(
      req.files.map((file) => streamUpload(file.buffer)),
    );

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
    }));
    const savedPhotos = await pgRepo.createRoomsPhotos(client, photos);

    await client.query("COMMIT");

    return res.status(201).json({
      success: true,
      message: "Room created successfully!!",
      data: newRoom,
      photos: savedPhotos,
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

    next(error); // Forward to Global error
  } finally {
    client.release();
  }
};

exports.deleteListing = catchAsync(async (req, res, next) => {
  const { id: listing_id } = req.params;
  const { host_id } = req.body;
  await pgRepo.deleteListingById({ listing_id, host_id });
  return res.status(201).json({
    success: true,
    message: "Succesfully deleted!!",
  });
});

// DELETE room
exports.deleteRoom = catchAsync(async (req, res) => {
  const { id: roomId } = req.params;
  const { listing_id } = req.body;
  await pgRepo.deleteRoomById({ roomId, listing_id });
  return res.status(201).json({
    success: true,
    message: "Succesfully deleted!!",
  });
});
