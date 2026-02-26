const pgRepo = require("../../service/pg/pgRepo");
const streamifier = require("streamifier");
const { cloudinary } = require("../../utils/cloudinary");
const pool = require("../../config/db");
const streamUpload = require("../../utils/streamUpload");

exports.getAllpg = async (req, res) => {
  try {
    const rooms = await pgRepo.findAllPg();
    return res.status(200).json({
      total: rooms.length,
      success: true,
      data: rooms,
    });
  } catch (error) {
    console.log("Error: ", error.message);
    throw new Error(error);
  }
};

exports.getAllRoomsByPgId = async (req, res) => {
  try {
    const { id } = req.params;
    const allRooms = await pgRepo.getAllRoomsById(id);
    return res.status(200).json({
      total_room: allRooms.length,
      success: true,
      data: allRooms,
    });
  } catch (error) {
    console.log("Error: ", error.message);
    throw new Error(error);
  }
};

exports.reviewRoom = async (req, res) => {
  // console.log(req.body);
  try {
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
  } catch (error) {
    console.log("Error: ", error.message);
    throw new Error(error);
  }
};

exports.updateRoom = async (req, res) => {
  try {
    const updateFields = { ...req.body };
    const { id } = req.params;
    console.log(updateFields, id);
    const updatedRoom = await pgRepo.updateRoomById(updateFields, id);
    return res.status(201).json({
      success: true,
      data: updatedRoom,
    });
  } catch (err) {
    console.log("Error: ", err.message);
    throw new Error(err);
  }
};

exports.getRoom = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pgRepo.getRoomById(id);

    // 1. Check if the result is empty or null
    if (!result || (Array.isArray(result) && result.length === 0)) {
      return res.status(404).json({
        success: false,
        message: `Room with ID ${id} not found`,
      });
    }

    // 2. Success case
    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Error fetching room:", error.message);

    // 3. Proper error response instead of throwing
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

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
//       image_public_id: publicId,
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

exports.createPgListing = async (req, res) => {
  const client = await pool.connect();

  let uploadResults = [];

  try {
    if (!req.files || req.files.length < 3) {
      return res.status(400).json({
        success: false,
        message: "You must upload at least 3 photos",
      });
    }

    // uplload images FIRST (outside transaction)
    uploadResults = await Promise.all(
      req.files.map((file) => streamUpload(file.buffer)),
    );

    await client.query("BEGIN");

    // 1️⃣ Create listing
    const newListing = await pgRepo.createListing(client, { ...req.body });

    // 2️⃣ Upload multiple images in parallel
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

    return res.status(201).json({
      success: true,
      listing: newListing,
      photos: savedPhotos,
    });

    // upload multiple imgaes paralle....
  } catch (error) {
    await client.query("ROLLBACK");
    if (uploadResults && uploadResults.length > 0) {
      await Promise.all(
        uploadResults.map((r) => {
          cloudinary.uploader.destroy(r.public_id);
        }),
      );
    }
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  } finally {
    client.release();
  }
};

exports.createPgRoom = async (req, res) => {
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
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  } finally {
    client.release();
  }
};

exports.deleteRoom = async (req, res) => {
  try {
    const { id: listing_id } = req.params;
    const { host_id } = req.body;
    await pgRepo.deleteRoom({ listing_id, host_id });
    return res.status(201).json({
      success: true,
      message: "Succesfully deleted!!",
    });
  } catch (error) {
    console.log("Error:", error.message);
    throw new Error(error);
  }
};
