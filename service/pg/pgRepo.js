const pool = require("../../config/db");

class PgRepo {
  // static async findAllPg(filters = {}) {
  //   const { listing_type } = filters;
  //   const query = `
  //    SELECT
  //     l.id,
  //     l.title,
  //     l.description,
  //     l.listing_type,
  //     l.price_per_month,
  //     l.currency,
  //     l.available_from,
  //     l.max_occupants,
  //     l.utility_details,
  //     l.avg_rating,
  //     l.review_count,
  //     l.view_count,

  //     u.first_name,
  //     u.last_name,

  //     loc.address_line1,
  //     loc.city,
  //     loc.state,
  //     loc.country_code,
  //     loc.latitude,
  //     loc.longitude,
  //     loc.geog,

  //     (
  //       SELECT COALESCE(
  //         JSON_AGG(
  //           JSON_BUILD_OBJECT(
  //             'listing_id',l.id,
  //             'photoid',ph.id,
  //             'url', ph.url,
  //             'caption',ph.caption,
  //             'is_cover',ph.is_cover
  //           )
  //         ),'[]'
  //       )
  //       FROM listing_photos ph
  //       WHERE ph.listing_id = l.id
  //     ) AS photos,

  //     (
  //       SELECT COALESCE(
  //         JSON_AGG(
  //           JSON_BUILD_OBJECT(
  //                     'reviewer_id', re.reviewer_id,
  //                     'reviewer_name', ru.first_name || ' ' || ru.last_name,
  //                     'comment', re.comment,
  //                     'rating', re.overall_rating,
  //                     'created_at', re.created_at
  //           ) ORDER BY re.created_at DESC
  //         ),
  //         '[]'
  //       )
  //       FROM reviews re
  //       JOIN users ru ON ru.id = re.reviewer_id
  //       WHERE re.listing_id = l.id
  //     ) AS reviews

  //     FROM listings l
  //     JOIN users u ON l.host_id = u.id
  //     JOIN locations loc ON l.location_id = loc.id
  //     WHERE l.listing_type = $1
  //       AND l.status = 'active'
  //       AND l.deleted_at IS NULL
  //     ORDER BY l.avg_rating DESC;
  //   `;
  //   try {
  //     const { rows } = await pool.query(query);
  //     return rows;
  //   } catch (err) {
  //     throw new Error("Error from the databaes for getting all the Pgrooms");
  //   }
  // }
  static async findAllPg(filters = {}) {
    const { listing_type } = filters;
    // by defalut jiska ratings sabse hoga ooska pahle aayega..
    const query = `
    SELECT
      l.id,
      l.title,
      l.description,
      l.listing_type,
      l.starting_price,
      l.currency,
      l.available_from,
      l.max_occupants,
      l.utility_details,
      l.avg_rating,
      l.review_count,
      l.view_count,
      l.total_rooms,

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
              'listing_id', l.id,
              'photoid', ph.id,
              'url', ph.url,
              'caption', ph.caption,
              'is_cover', ph.is_cover
            )
          ), '[]'
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
        JOIN users ru ON ru.id = re.reviewer_id
        WHERE re.listing_id = l.id
      ) AS reviews

    FROM listings l
    JOIN users u ON l.host_id = u.id
    JOIN locations loc ON l.location_id = loc.id
    WHERE l.listing_type = $1
      AND l.status = 'active'
      AND l.deleted_at IS NULL
    ORDER BY l.avg_rating DESC;
  `;
    console.log(query);
    console.log(listing_type);

    const { rows } = await pool.query(query, [listing_type]); // ✅ PASS PARAM HERE
    return rows;
  }
  static async getRoomById(id) {
    const query = `          
      SELECT
        r.id,
        r.listing_id,
        r.room_number,
        r.room_type,
        r.title,
        r.description,
        r.capacity,
        r.available_beds,
        r.price_per_month,
        r.price_per_week,
        r.price_per_day,
        r.security_deposit,
        r.currency,
        r.floor_number,
        r.floor_area_sqm,
        r.is_furnished,
        r.utility_details,
        r.status,
        r.available_from,
        r.available_to,
        r.extra_info,
        r.avg_rating,
        r.review_count,
        r.view_count,
        r.capacity,

        (
          SELECT COALESCE(
            JSON_AGG(
              JSON_BUILD_OBJECT(
                'photo_id',rp.id,
                'room_id',rp.room_id,
                'url',rp.url,
                'caption',rp.caption,
                'is_cover',rp.is_cover
              )
            ),'[]'
          )
          FROM rooms_photos rp
          WHERE rp.room_id = r.id
        ) AS room_photo

      FROM rooms r
      WHERE r.id = $1
        AND r.deleted_at IS NULL;

    `;

    const { rows } = await pool.query(query, [id]);
    return rows[0];
  }

  // GET ALL ROOMS WITH A SPECIFIC ID-------------------------
  static async getAllRoomsById(id) {
    const query = `          
      SELECT
      l.id,

      (
        SELECT COALESCE(
          JSON_AGG(
            JSON_BUILD_OBJECT(
              'listing_id',l.id,
              'room_id',r.id,
              'status',r.status,
              'room_no',r.room_number,
              'beds',r.available_beds,
              'price_per_month',r.price_per_month,
              'price_per_week',r.price_per_week,
              'price_per_day',r.price_per_day,
              'security_deposit',r.security_deposit,
              'currency',r.currency,
              'floor',r.floor_number,
              'floor_area',r.floor_area_sqm,
              'furnished',r.is_furnished,
              'utility_details', r.utility_details,
              'available_from',r.available_from,
              'available_to',r.available_to,
              'extra_info',r.extra_info,
              'avg_rating',r.avg_rating,
              'review_count',r.review_count,
              'view_count',r.view_count,
              'capacity',r.capacity,

              'room_photo',(
                SELECT COALESCE(
                  JSON_AGG(
                    JSON_BUILD_OBJECT(
                      'photo_id',rp.id,
                      'room_id',rp.room_id,
                      'url',rp.url,
                      'caption',rp.caption
                    )
                  ),'[]'
                )
                FROM rooms_photos rp
                WHERE rp.room_id = r.id 
              )
            ) ORDER BY r.avg_rating DESC,
                       r.price_per_month
          ),'[]'
        )
        FROM rooms r
        WHERE r.listing_id = l.id
         
      ) AS rooms

    FROM listings l
    WHERE l.id = $1
      AND l.deleted_at IS NULL;
          
    `;

    const { rows } = await pool.query(query, [id]);
    return rows[0];
  }

  static async createRoom(client, roomData) {
    const columns = Object.keys(roomData);
    const value = Object.values(roomData);
    const placeholders = columns.map((_, idx) => `$${idx + 1}`).join(", ");
    const query = `INSERT INTO rooms(${columns.join(", ")}) VALUES(${placeholders}) RETURNING *`;

    const { rows } = await client.query(query, value);
    return rows[0];
  }

  static async createListing(client, pgData) {
    const columns = Object.keys(pgData);
    const values = Object.values(pgData);
    const placeholders = columns.map((_, idx) => `$${idx + 1}`).join(", ");
    const query = `INSERT INTO listings(${columns.join(", ")}) VALUES(${placeholders}) RETURNING *`;

    const { rows } = await client.query(query, values);
    return rows[0];
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

  static async createRoomsPhotos(client, photos) {
    if (!photos || photos.length === 0) return [];

    const columns = [
      "room_id",
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
        photo.room_id,
        photo.url,
        photo.public_id,
        photo.caption,
        photo.is_cover,
        photo.sort_order,
      );

      return `(${columns.map((_, j) => `$${offset + j + 1}`).join(", ")})`;
    });

    const query = `
    INSERT INTO rooms_photos (${columns.join(", ")})
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

    const { rows } = await pool.query(query, values);
    return rows;
  }

  // UPDATE LISTINGS-------------------------------------------------
  static async updatePgListingsById(updateFields, id) {
    const columns = Object.keys(updateFields);
    const values = Object.values(updateFields);

    const placeholders = columns
      .map((val, idx) => `${val} = $${idx + 1}`)
      .join(", ");
    const query = `UPDATE listings SET ${placeholders} WHERE id = $${columns.length + 1} RETURNING *`;
    console.log(query);

    const { rows } = await pool.query(query, [...values, id]);
    return rows[0];
  }

  // UPDATE ROOM----------------------------------------------------
  static async updateRoomById(updateFields, id) {
    // ✅ Only these fields are allowed to be updated manually
    const ALLOWED_FIELDS = [
      "room_number",
      "room_type",
      "title",
      "description",
      "capacity",
      "available_beds",
      "price_per_month",
      "price_per_week",
      "price_per_day",
      "security_deposit",
      "avg_rating",
      "currency",
      "floor_number",
      "floor_area_sqm",
      "is_furnished",
      "utility_details",
      "status",
      "available_from",
      "available_to",
      "extra_info",
    ];

    const filteredFields = Object.keys(updateFields)
      .filter((key) => ALLOWED_FIELDS.includes(key))
      .reduce((obj, key) => {
        obj[key] = updateFields[key];
        return obj;
      }, {});

    if (Object.keys(filteredFields).length === 0) {
      throw new Error("No valid fields provided for update");
    }

    const columns = Object.keys(filteredFields);
    const values = Object.values(filteredFields);

    const setClause = columns
      .map((col, idx) => `${col} = $${idx + 1}`)
      .join(", ");

    const query = `
      UPDATE rooms
      SET ${setClause},
        updated_at = NOW()
      WHERE id = $${columns.length + 1}
        AND deleted_at is NULL
      RETURNING *;
    `;

    const { rows } = await pool.query(query, [...values, id]);
    return rows[0];
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
  // DELETE LISTING BY ID
  static async deleteListingById({ roomId, host_id }) {
    const query = `
      DELETE FROM listings
      WHERE id = $1
        AND host_id = $2
      ;
    `;
    const values = [roomId, host_id];
    const rows = await pool.query(query, values);
    return rows[0];
  }

  // DELETE ROOM BY ID

  static async deleteRoomById({ roomId, listing_id }) {
    const query = `
      DELETE FROM rooms
      WHERE id = $1
        AND listing_id = $2
      ;
    `;
    const values = [roomId, listing_id];
    const rows = await pool.query(query, values);
    return rows[0];
  }
}

module.exports = PgRepo;
