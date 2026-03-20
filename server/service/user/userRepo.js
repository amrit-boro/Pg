const pool = require("../../config/db");

class UserRepo {
  static async findAllUser() {
    const query = `SELECT * FROM users `;
    const { rows } = await pool.query(query);
    return rows;
  }

  static async findUserByEmail(email) {
    const query = `SELECT * FROM users WHERE email = $1 AND deleted_at IS NULL`;
    const { rows } = await pool.query(query, [email]);
    return rows[0];
  }

  static async findUserById(id) {
    const query = `SELECT * FROM users WHERE id = $1 AND deleted_at IS NULL`;
    const { rows } = await pool.query(query, [id]);
    return rows[0];
  }

  static async createUser(userData) {
    console.log(userData);
    const columns = Object.keys(userData);
    const values = Object.values(userData);
    const placeholders = columns.map((_, idx) => `$${idx + 1}`).join(", ");
    const query = `INSERT INTO users(${columns.join(", ")}) VALUES(${placeholders}) RETURNING id, email,phone,role,first_name,last_name,avatar_url,bio`;

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
