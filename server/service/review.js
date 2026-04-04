const pool = require("../config/db");

class ReviewRepo {
  static async insertReview(values) {
    const query = `
      INSERT INTO reviews (
        booking_id,
        reviewer_id,
        reviewee_id,
        listing_id,
        overall_rating,
        cleanliness,
        accuracy,
        communication,
        location_score,
        value,
        comment
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11
      )
      RETURNING *;
    `;
    const { rows } = await pool.query(query, values);
    return rows[0];
  }

  static async getReview(id) {
    const query = `
       SELECT 
          COUNT(*) as total_reviews,
          ROUND(AVG(overall_rating), 1) as avg_overall
          
        FROM reviews
        WHERE listing_id = $1 AND is_public = TRUE;
    `;

    const { rows } = await pool.query(query, [id]);
    return rows[0];
  }
}

module.exports = ReviewRepo;
