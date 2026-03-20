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
}

module.exports = PriceRepo;
