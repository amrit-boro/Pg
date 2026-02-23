const pool = require("../../config/db");

class PgRepo {
  static async findAllPg() {
    const query = `
     SELECT
      l.id,
      l.title,
      l.description,
      l.listing_type,
      l.price_per_month,
      l.currency,
      l.available_from,
      l.max_occupants,
      l.utility_details,
      l.avg_rating,
      l.review_count,
      l.view_count,

      u.first_name,
      u.last_name,

      loc.address_line1,
      loc.city,
      loc.state,
      loc.country_code,
      loc.latitude,
      loc.longitude,
      loc.geog,

      (
        SELECT COALESCE(
          JSON_AGG(
            JSON_BUILD_OBJECT(
              'photoid',ph.id,
              'url', ph.url,
              'public_ic',ph.public_id,
              'caption',ph.caption
            )
          ),'[]'
        )
        FROM listing_photos ph
        WHERE ph.listing_id = l.id
      ) AS photos,

      (
        SELECT COALESCE(
          JSON_AGG(
            JSON_BUILD_OBJECT(
                      'reviewer_id', re.reviewer_id,
                      'reviewer_name', ru.first_name || ' ' || ru.last_name,
                      'comment', re.comment,
                      'rating', re.overall_rating,
                      'created_at', re.created_at
            ) ORDER BY re.created_at DESC
          ),
          '[]'
        )
        FROM reviews re
        JOIN users ru ON ru.id = re.reviewer_id
        WHERE re.listing_id = l.id
      ) AS reviews

      FROM listings l
      JOIN users u ON l.host_id = u.id
      JOIN locations loc ON l.location_id = loc.id
      WHERE l.status = 'active'
        AND l.deleted_at IS NULL;
            
    `;
    try {
      const { rows } = await pool.query(query);
      return rows;
    } catch (err) {
      throw new Error("Error from the databaes for getting all the Pgrooms");
    }
  }
  static async getRoomById(id) {
    const query = `          
      SELECT
      l.id,
      l.title,
      l.description,
      l.listing_type,
      l.price_per_month,
      l.currency,
      l.available_from,
      l.max_occupants,
      l.utility_details,
      l.avg_rating,
      l.review_count,

      loc.address_line1,
      loc.city,
      loc.state,
      loc.country_code,
      loc.latitude,
      loc.longitude,
      loc.geog,

      (
        SELECT COALESCE(
          JSON_AGG(
            JSON_BUILD_OBJECT(
              'url', ph.url,
              'caption',ph.caption
            )
          ),'[]'
        )
        FROM listing_photos ph
        WHERE ph.listing_id = l.id
      ) AS photos,

      (
        SELECT COALESCE(
            JSON_AGG(
                JSON_BUILD_OBJECT(
                    'reviewer_id', re.reviewer_id,
                    'reviewer_name', ru.first_name || ' ' || ru.last_name,
                    'comment', re.comment,
                    'rating', re.overall_rating,
                    'created_at', re.created_at
                )
                ORDER BY re.created_at DESC
            ),
            '[]'
        )
        FROM reviews re
        LEFT JOIN users ru ON ru.id = re.reviewer_id
        WHERE re.listing_id = l.id
    ) AS reviews

    FROM listings l
    JOIN locations loc ON l.location_id = loc.id
    WHERE l.id = $1
      AND l.deleted_at IS NULL;
          
    `;

    try {
      const { rows } = await pool.query(query, [id]);
      return rows[0];
    } catch (error) {
      console.log("Error from the database: ", error);
      throw new Error("Error from the database for getting single pg room");
    }
  }
  static async createListing(client, pgData) {
    const columns = Object.keys(pgData);
    const values = Object.values(pgData);

    const placeholders = columns.map((_, idx) => `$${idx + 1}`).join(", ");
    const query = `INSERT INTO listings(${columns.join(", ")}) VALUES(${placeholders}) RETURNING *`;
    try {
      const { rows } = await client.query(query, values);
      return rows[0];
    } catch (error) {
      console.log("Error: ", error.message);
      throw new Error("Error from the database for creating new listing...");
    }
  }

  // static async createListing(client, pgData) {
  //   const columns = Object.keys(pgData);
  //   const values = Object.values(pgData);
  //   const placeholders = columns.map((_, i) => `$${i + 1}`).join(", ");

  //   const query = `
  //     INSERT INTO listings(${columns.join(", ")})
  //     VALUES(${placeholders})
  //     RETURNING *
  //   `;

  //   try {
  //     const { rows } = client.query(query, values);
  //     return rows[0];
  //   } catch (error) {
  //     console.log("Error from the database.", error.message);
  //     throw new Error(error);
  //   }
  //   // const { rows } = await client.query(query, values);
  //   // return rows[0];
  // }
  //==============================================================================
  static async addPhoto(client, photoData) {
    const query = `
      INSERT INTO listing_photos
      (listing_id, url, public_id, caption, is_cover, sort_order)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;

    const values = [
      photoData.listing_id,
      photoData.url,
      photoData.public_id,
      photoData.caption,
      photoData.is_cover,
      photoData.sort_order,
    ];

    const { rows } = await client.query(query, values);
    return rows[0];
  }

  static async bulkInsertPhotos(client, photos) {
    if (!photos || photos.length === 0) return [];

    const columns = [
      "listing_id",
      "url",
      "public_id",
      "caption",
      "is_cover",
      "sort_order",
    ];

    const values = [];
    const placeholders = photos.map((photo, i) => {
      const offset = i * columns.length;

      values.push(
        photo.listing_id,
        photo.url,
        photo.public_id,
        photo.caption,
        photo.is_cover,
        photo.sort_order,
      );

      return `(${columns.map((_, j) => `$${offset + j + 1}`).join(", ")})`;
    });

    const query = `
    INSERT INTO listing_photos (${columns.join(", ")})
    VALUES ${placeholders.join(", ")}
    RETURNING *;
  `;

    const { rows } = await client.query(query, values);
    return rows;
  }

  static async createReview({
    reviewer_id,
    listing_id,
    overall_rating,
    comment,
  }) {
    const query = `
      INSERT INTO reviews (
        reviewer_id,
        listing_id,
        overall_rating,
        comment
      )
      VALUES ($1, $2, $3, $4)
      RETURNING *;
    `;

    const values = [reviewer_id, listing_id, overall_rating, comment];
    console.log(query, values);
    try {
      const { rows } = await pool.query(query, values);
      return rows;
    } catch (error) {
      console.log("Error; ", error.message);
      throw new Error(error);
    }
  }

  static async updateRoomById(updateFields, id) {
    const columns = Object.keys(updateFields);
    const values = Object.values(updateFields);
    console.log("columns: ", columns);

    const placeholders = columns
      .map((val, idx) => `${val} = $${idx + 1}`)
      .join(", ");
    const query = `UPDATE listings SET ${placeholders} WHERE id = $${columns.length + 1} RETURNING *`;
    console.log(query);
    try {
      const { rows } = await pool.query(query, [...values, id]);
      return rows[0];
    } catch (error) {
      console.log(
        "Error from the database for getting updated values",
        error.message,
      );
      throw new Error(error.message);
    }
  }

  // SOFT delete Room ------------------
  // static async deleteRoom({ listing_id, host_id }) {
  //   const query = `
  //     UPDATE listings
  //     SET
  //         deleted_at = NOW(),
  //         updated_at = NOW(),
  //         status = 'deactivated'
  //     WHERE id = $1
  //       AND host_id = $2
  //       AND deleted_at IS NULL
  //     RETURNING *;
  //   `;
  //   const values = [listing_id, host_id];
  //   try {
  //     const rows = await pool.query(query, values);
  //     return rows[0];
  //   } catch (error) {
  //     console.log("Error: ", error.message);
  //     throw new Error("Error from the database for deleting Room..");
  //   }
  // }

  // HARD DELETE
  static async deleteRoom({ listing_id, host_id }) {
    const query = `
      DELETE FROM listings
      WHERE id = $1
        AND host_id = $2
      ;
    `;
    const values = [listing_id, host_id];
    try {
      const rows = await pool.query(query, values);
      return rows[0];
    } catch (error) {
      console.log("Error: ", error.message);
      throw new Error("Error from the database for deleting Room..");
    }
  }
}

module.exports = PgRepo;
