const pool = require("../../config/db");

class UserRepo {
  static async findAllUser() {
    const query = `SELECT * FROM users `;

    try {
      const { rows } = await pool.query(query);
      return rows;
    } catch (err) {
      console.log("Database Error: ", err);
      throw new Error("Error from the databse for getting all users");
    }
  }

  static async findUser(id) {
    const query = `SELECT * FROM users WHERE id = $1`;
    try {
      const { rows } = await pool.query(query, [id]);
      return rows;
    } catch (error) {
      throw new Error("Error from the database for getting user");
    }
  }

  static async createUser(userData) {
    const columns = Object.keys(userData);
    const values = Object.values(userData);
    const placeholders = columns.map((_, idx) => `$${idx + 1}`).join(", ");
    const query = `INSERT INTO users(${columns.join(", ")}) VALUES(${placeholders}) RETURNING *`;
    console.log("query:", query);
    try {
      const { rows } = await pool.query(query, values);
      return rows[0];
    } catch (error) {
      console.log(error.message);
      throw new Error("Error from the database for creating new users...");
    }
  }

  static async deleteUserById(id) {
    const query = `DELETE FROM users WHERE id = $1 RETURNING *`;
    try {
      const { rows } = await pool.query(query, [id]);
      return rows[0]; // undefind if not found!!
    } catch (error) {
      throw new Error("Error from the database for deleting user ");
    }
  }
}

module.exports = UserRepo;
