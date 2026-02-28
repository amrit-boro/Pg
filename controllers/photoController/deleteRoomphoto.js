const catchAsync = require("../../utils/catchAsync");
const pool = require("../../config/db");
const PgRepo = require("../../service/pg/pgRepo");
const { cloudinary } = require("../../utils/cloudinary");
const AppError = require("../../utils/appError");

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
