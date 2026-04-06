const AppError = require("../../utils/appError");
const catchAsync = require("../../utils/catchAsync");
const db = require("../../config/db");
const BookingRepo = require("../../service/Booking/booking");

exports.createBooking = catchAsync(async (req, res, next) => {
  const guest_id = req.user.id;

  // In a PG model, we usually just need a move-in date.
  const { listing_id, room_id, num_occupants, check_in_date, guest_message } =
    req.body;

  // ─── 1. Validate required fields ──────────────────────────────────────────
  if (!listing_id || !room_id || !check_in_date) {
    return next(
      new AppError("listing_id, room_id, and check_in_date are required.", 400),
    );
  }

  const moveIn = new Date(check_in_date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (isNaN(moveIn.getTime())) {
    return next(new AppError("Invalid date format.", 400));
  }
  if (moveIn < today) {
    return next(new AppError("check_in_date cannot be in the past.", 400));
  }

  // ─── 2. Open transaction ──────────────────────────────────────────────────
  const client = await db.connect();

  try {
    await client.query("BEGIN");

    // ─── 3. Fetch & lock room row (Crucial for the 10-student race condition) ─
    const room = await BookingRepo.findRoom(room_id);
    if (!room || room.deleted_at !== null) {
      await client.query("ROLLBACK");
      return next(new AppError("Room not found.", 404));
    }

    // ─── 4. Verify relationships & Status ───────────────────────────────────
    if (room.listing_id !== listing_id) {
      await client.query("ROLLBACK");
      return next(
        new AppError("Room does not belong to the specified listing.", 400),
      );
    }

    const { rows: listingRows } = await client.query(
      `SELECT id, host_id, status, deleted_at FROM listings WHERE id = $1 FOR UPDATE`,
      [listing_id],
    );

    if (!listingRows.length || listingRows[0].deleted_at !== null) {
      await client.query("ROLLBACK");
      return next(new AppError("Listing not found.", 404));
    }

    const listing = listingRows[0];

    // ─── 5. PG Business Rules ───────────────────────────────────────────────
    if (listing.status !== "active") {
      await client.query("ROLLBACK");
      return next(
        new AppError("This PG is not currently accepting students.", 400),
      );
    }
    if (listing.host_id === guest_id) {
      await client.query("ROLLBACK");
      return next(new AppError("You cannot book your own PG.", 403));
    }

    // This is the only inventory check you need for a PG!
    if (room.available_beds < 1) {
      await client.query("ROLLBACK");
      return next(
        new AppError(
          "There are no beds currently available in this room.",
          409,
        ),
      );
    }

    // ─── 7. Insert Booking ──────────────────────────────────────────────────
    // Notice: no check_out_date is inserted.
    const { rows: bookingRows } = await client.query(
      `INSERT INTO bookings (
          listing_id, room_id, guest_id, host_id, check_in_date, num_occupants, 
          price_per_month, security_deposit, guest_message 
        )
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING *`,
      [
        listing_id,
        room_id,
        guest_id,
        listing.host_id,
        check_in_date,
        num_occupants,
        room.price_per_month,
        room.security_deposit,
        guest_message || null,
      ],
    );

    // ─── 8. Decrement available_beds (Permanently, until they move out) ────
    await client.query(
      `UPDATE rooms
       SET available_beds = available_beds - ${num_occupants},
           updated_at = NOW()
       WHERE id = $1`,
      [room_id],
    );

    // ─── 9. Commit ──────────────────────────────────────────────────────────
    await client.query("COMMIT");

    return res.status(201).json({
      status: "success",
      data: { booking: bookingRows[0] },
    });
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
});
