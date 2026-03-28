const pool = require("../../config/db");
const AppError = require("../../utils/appError");

class PriceRepo {
  static async getRoomPrice(id) {
    const query = `
        SELECT 
            r.starting_price,
            r.security_deposit,
            r.room_number,
            r.type,
            

    `;
  }

  static async findPriceByRoomId(id) {
    const query = `
      SELECT 
        id,
        room_type,
        room_number,
        price_per_month,
        security_deposit
      FROM rooms
      WHERE id = $1
        AND status = 'available'
        AND deleted_at IS NULL;
    `;
    const { rows } = await pool.query(query, [id]);
    console.log("data: ", rows);
    return rows[0];
  }
}

module.exports = PriceRepo;
