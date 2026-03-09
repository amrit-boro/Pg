const catchAsync = require("../../utils/catchAsync");
const pool = require("../../config/db");
const PgRepo = require("../../service/pg/pgRepo");
const { cloudinary } = require("../../utils/cloudinary");
const AppError = require("../../utils/appError");
const streamUpload = require("../../utils/streamUpload");

exports.uploadListingPhoto = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const client = await pool.connect();

  try {
    if (!req.files || req.files.length < 3) {
      return next(new AppError("You must upload atleast 3 photos", 400));
    }
    uploadResults = await Promise.all(
      req.files.map((file) => streamUpload(file.buffer)),
    );

    const pglisting = await PgRepo.findListingById(id);
    if (!pglisting) {
      return next(new AppError(`There is no room with Id ${id}`, 400));
    }

    const photos = uploadResults.map((result, i) => ({
      listing_id: id,
      url: result.secure_url,
      public_id: result.public_id,
      caption: req.body.caption || null,
      is_cover: i === 0,
      sort_order: i,
    }));

    await PgRepo.bulkInsertPhotos(client, photos);
    res.status(201).json({
      success: true,
      message: "uploaded successfully",
    });
  } catch (err) {
    if (uploadResults.length > 0) {
      await Promise.all(
        uploadResults.map((r) => cloudinary.uploader.destroy(r.public_id)),
      );
    }
    next(err); // ✅ Forward to global error handler
  }
});

exports.deletePhoto = catchAsync(async (req, res, next) => {
  const client = await pool.connect();
  const { id: photoId } = req.params;
  const { room_id } = req.body;

  try {
    await client.query("BEGIN");

    // Get photo from the DB;
    const { data, total } = await PgRepo.getRoomPhotoById(
      client,
      photoId,
      room_id,
    );
    if (total === 0) {
      await client.query("ROLLBACK");
      return next(new AppError("Photo not found", 404));
    }

    // get the publicId of that photo----------
    const { public_id } = data;
    // 2️⃣ Delete from Cloudinary first
    const cloudinaryResult = await cloudinary.uploader.destroy(public_id);
    if (cloudinaryResult.result !== "ok") {
      throw new Error("cloudinary deletion failed!");
    }

    // Delete from DB-------------------------
    await client.query("DELETE FROM rooms_photos WHERE id = $1", [photoId]);

    await client.query("COMMIT");
    res.status(200).json({
      success: true,
      message: "Photo deleted successfully!!",
    });
  } catch (error) {
    await client.query("ROLLBACK");
    next(error);
  } finally {
    client.release();
  }
});

exports.deleteListingPhoto = catchAsync(async (req, res, next) => {
  const client = await pool.connect();

  const { id: photoId } = req.params;
  const { listing_id } = req.body;
  try {
    // Get photo from the DB listing
    const { data, total } = await PgRepo.getListingsPhotoById(
      client,
      photoId,
      listing_id,
    );

    if (total === 0) {
      await client.query("ROLLBACK");
      return next(new AppError("Photo not found", 404));
    }

    // get the public_id from that photo----------------
    const { public_id } = data;
    // Delete from the cloudinary-------------
    const cloudinaryResult = await cloudinary.uploader.destroy(public_id);
    if (cloudinaryResult.result !== "ok") {
      throw new Error("cloudinary deletion failed!");
    }
    // Delete from the database------------------------
    await client.query("DELETE FROM listing_photos WHERE id = $1", [photoId]);
    await client.query("COMMIT");

    res.status(200).json({
      success: true,
      message: "Photo deleted successfully!!",
    });
  } catch (error) {
    await client.query("ROLLBACK");
    next(error);
  } finally {
    client.release();
  }
});
