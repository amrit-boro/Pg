const pool = require("../../config/db");

class BookingRepo {
  static async findBookingId(userId) {
    const query = `
            SELECT 
                b.id
            FROM bookings b
            WHERE b.guest_id = $1
                AND created_at IS NOT NULL;
        `;
    const { rows } = await pool.query(query, [userId]);
    return rows[0];
  }

  static async findRoom(id) {
    const query = `
      SELECT
          r.id, r.listing_id, r.status, r.available_beds, r.price_per_month,
          r.security_deposit, r.currency, r.deleted_at
       FROM rooms r
       WHERE r.id = $1
       FOR UPDATE
    `;

    const { rows } = await pool.query(query, [id]);
    return rows[0];
  }

  static async findBooking(bookingId) {
    const query = `
      SELECT id, guest_id, host_id, listing_id, status
      FROM bookings
      WHERE id = $1
      FOR UPDATE;
    `;
    const { rows } = await pool.query(query, [bookingId]);
    return rows[0];
  }
}

module.exports = BookingRepo;
