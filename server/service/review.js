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

  static async getReview(id, limit, offset) {
    const query = `
    SELECT 
      l.id,
      u.avatar_url,
      CONCAT(u.first_name,' ', u.last_name) AS name,
      r.created_at,
      r.comment,
      COUNT(*) OVER() as total_reviews,
      ROUND(AVG(r.overall_rating) OVER(), 1) as avg_overall
    FROM users u 
    JOIN reviews r ON r.reviewer_id = u.id
    JOIN listings l ON r.listing_id = l.id
    WHERE l.id = $1
    LIMIT $2 OFFSET $3;
  `;

    const { rows } = await pool.query(query, [id, limit, offset]);
    return rows;
  }
}

module.exports = ReviewRepo;
