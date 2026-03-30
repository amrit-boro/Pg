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
    console.log("==============");
    const { rows } = await pool.query(query, [userId]);
    return rows[0];
  }
}

module.exports = BookingRepo;
