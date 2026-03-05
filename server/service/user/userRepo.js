const pool = require("../../config/db");

class UserRepo {
  static async findAllUser() {
    const query = `SELECT * FROM users `;
    const { rows } = await pool.query(query);
    return rows;
  }

  static async findUser(id) {
    const query = `SELECT * FROM users WHERE id = $1`;
    const { rows } = await pool.query(query, [id]);
    return rows;
  }

  static async createUser(userData) {
    const columns = Object.keys(userData);
    const values = Object.values(userData);
    const placeholders = columns.map((_, idx) => `$${idx + 1}`).join(", ");
    const query = `INSERT INTO users(${columns.join(", ")}) VALUES(${placeholders}) RETURNING *`;

    const { rows } = await pool.query(query, values);
    return rows[0];
  }

  static async deleteUserById(id) {
    const query = `DELETE FROM users WHERE id = $1 RETURNING *`;
    const { rows } = await pool.query(query, [id]);
    return rows[0]; // undefind if not found!!
  }
}

module.exports = UserRepo;
