const pool = require("../../config/db");

class FilterRoom {
  static async filterByPrice({ minPrice, maxPrice, city, type }) {
    console.log("type: ", type);
    try {
      let query = `
        SELECT       
          l.title,
          l.description,
          l.listing_type,
          l.price_per_month,
          l.currency,
          l.available_from,
          l.max_occupants,
          l.utility_details,

          u.first_name,
          u.last_name,

          loc.address_line1,
          loc.city,
          loc.state

        FROM listings l
        JOIN users u
            ON l.host_id = u.id
        JOIN locations loc
            ON l.location_id = loc.id
        WHERE l.status = 'active'
          AND l.deleted_at IS NULL
      `;
      const values = [];
      let index = 1;
      if (minPrice) {
        query += `AND l.price_per_month >= $${index++}`;
        values.push(minPrice);
      }
      if (maxPrice) {
        query += ` AND l.price_per_month <= $${index++}`;
        values.push(maxPrice);
      }
      if (city) {
        query += ` AND loc.city = $${index++}`;
        values.push(city);
      }
      if (type) {
        query += ` AND l.listing_type = $${index++}`;
        values.push(type);
      }

      query += ` ORDER BY l.created_at DESC`;
      const { rows } = await pool.query(query, values);
      return rows;
    } catch (error) {
      console.log(
        "Error from the database for getting filter values ",
        error.message,
      );
      throw new Error("Error from the database for getting filter values");
    }
  }
}

module.exports = FilterRoom;
