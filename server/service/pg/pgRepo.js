const pool = require("../../config/db");
const AppError = require("../../utils/appError");

class PgRepo {
  // search bar filter
  static async searchListing(q) {
    const query = `
    SELECT 
      l.id,
      l.title,
      l.description,
      l.starting_price,
      l.avg_rating,
      (
          SELECT lp.url
          FROM listing_photos lp
          WHERE lp.listing_id = l.id
          LIMIT 1
      ) AS photo_url
    FROM listings l
    WHERE l.title ILIKE '%' || $1 || '%'
    ORDER BY l.avg_rating DESC
    LIMIT 6;
    `;
    const { rows } = await pool.query(query, [`%${q}%`]);
    return rows;
  }

  static async findListings() {
    const limit = 4;
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

      loc.address_line1,
      loc.city,
      loc.state,
      loc.country_code,
      loc.latitude,
      loc.longitude,
      loc.geog,

      COALESCE(ph_agg.photos, '[]'::json) AS photos

    FROM listings l
    JOIN locations loc ON l.location_id = loc.id

    LEFT JOIN LATERAL (
      SELECT JSON_AGG(
        JSON_BUILD_OBJECT(
          'listing_id', ph.listing_id,
          'photoid', ph.id,
          'url', ph.url,
          'caption', ph.caption,
          'is_cover', ph.is_cover
        )
      ) AS photos
      FROM (
        SELECT *
        FROM listing_photos
        WHERE listing_id = l.id
        LIMIT 1
      ) ph
    ) ph_agg ON true -- Always true because the condition is handled inside the WHERE of the subquery

    WHERE l.status = 'active'
      AND l.deleted_at IS NULL
    ORDER BY l.avg_rating DESC
    LIMIT $1;
    `;
    const { rows } = await pool.query(query, [limit]);
    return rows;
  }

  static async geAllpg() {
    const query = `
    SELECT  
      l.id,
      l.host_id,
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
      l.total_rooms

    FROM listings l
    LIMIT 2;
      
      `;

    const { rows } = await pool.query(query);
    return rows;
  }

  static async findAllPg(filters = {}) {
    const { listing_type } = filters;
    // by defalut jiska ratings sabse hoga ooska pahle aayega..
    console.log(listing_type);
    const query = `
    SELECT
      l.id,
      l.host_id,
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
    ORDER BY l.avg_rating DESC
    LIMIT 6;
  `;

    const { rows } = await pool.query(query, [listing_type]); // ✅ PASS PARAM HERE
    return rows;
  }

  static async getListingById(id, currentUserId) {
    const query = `
    SELECT 
  l.id,
  l.host_id,
  l.location_id,
  l.title,
  l.description,
  l.listing_type,
  l.status,
  l.total_rooms,
  l.available_rooms,
  l.max_occupants,
  l.allows_smoking,
  l.starting_price,
  l.security_deposit,
  l.utilities_included,
  l.utility_details,
  l.house_rules,
  l.extra_info,
  l.avg_rating,
  l.review_count,
  l.view_count,

  EXISTS (
    SELECT 1 
    FROM saved_listings sl
    WHERE sl.listing_id = l.id
      AND sl.user_id = $2
  ) AS "isSaved",

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
          'listing_id', ph.listing_id,
          'photoid', ph.id,
          'url', ph.url,
          'caption', ph.caption,
          'is_cover', ph.is_cover
        )
      ), '[]'
    )
    FROM listing_photos ph
    WHERE ph.listing_id = l.id
  ) AS photos

FROM listings l
JOIN locations loc ON l.location_id = loc.id
WHERE l.id = $1
  AND l.status = 'active'
  AND l.deleted_at IS NULL;
  `;

    const { rows } = await pool.query(query, [id, currentUserId]);
    return rows[0];
  }

  static async findListingById(id) {
    const query = `SELECT id FROM listings WHERE id = $1 AND deleted_at IS NULL`;
    const { rowCount } = await pool.query(query, [id]);
    return rowCount;
  }

  static async findRoomById(id) {
    const query = `SELECT id FROM rooms WHERE id = $1 AND status = 'available'`;
    const { rowCount } = await pool.query(query, [id]);
    return rowCount;
  }

  static async updatePgListingById(id, updateFields = {}) {
    const ALLOWED_FIELDS = [
      "title",
      "description",
      "listing_type",
      "status",
      "total_rooms",
      "available_rooms",
      "max_occupants",
      "floor_area_sqm",
      "floor_number",
      "total_floors",
      "is_furnished",
      "allows_pets",
      "allows_smoking",
      "gender_preference",
      "starting_price",
      "price_per_week",
      "price_per_day",
      "security_deposit",
      "utility_details",
      "available_from",
      "available_to",
      "min_stay_days",
      "max_stay_days",
      "house_rules",
      "extra_info",
    ];

    const requestKeys = Object.keys(updateFields);

    if (requestKeys.length === 0) {
      throw new AppError("No fields provided for update", 400);
    }

    // 🔒 Reject invalid fields explicitly
    const invalidFields = requestKeys.filter(
      (key) => !ALLOWED_FIELDS.includes(key),
    );

    if (invalidFields.length > 0) {
      throw new AppError(
        `Can't update fields: ${invalidFields.join(", ")}`,
        400,
      );
    }

    const setClause = requestKeys
      .map((col, idx) => `${col} = $${idx + 1}`)
      .join(", ");

    const query = `
    UPDATE listings
    SET ${setClause},
        updated_at = NOW()
    WHERE id = $${requestKeys.length + 1}
      AND deleted_at IS NULL
    RETURNING *;
  `;

    const { rows, rowCount } = await pool.query(query, [
      ...requestKeys.map((key) => updateFields[key]),
      id,
    ]);

    if (rowCount === 0) {
      return null; // let controller return 404
    }

    return rows[0];
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
        r.security_deposit,
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
        COALESCE(media.images, '[]') AS images,
        COALESCE(media.videos, '[]') AS video
      FROM rooms r
      LEFT JOIN LATERAL (
        SELECT 
            JSON_AGG(
                JSON_BUILD_OBJECT(
                    'photo_id', rp.id,
                    'room_id', rp.room_id,
                    'url', rp.url,
                    'caption', rp.caption,
                    'is_cover', rp.is_cover
                )
            ) FILTER (WHERE rp.media_type = 'image') AS images,
            JSON_AGG(
                JSON_BUILD_OBJECT(
                    'id', rp.id,
                    'url', rp.url,
                    'caption', rp.caption
                )
            ) FILTER (WHERE rp.media_type = 'video') AS videos
        FROM rooms_photos rp
        WHERE rp.room_id = r.id
      ) media ON true
      WHERE r.id = $1
        AND r.deleted_at IS NULL;
    `;

    const { rows } = await pool.query(query, [id]);
    return rows[0];
  }

  // GET ALL ROOMS WITH A SPECIFIC ID-------------------------
  static async getAllRoomsById(filters = {}, currentUser) {
    const {
      listingId: pgId,
      type,
      page = 1,
      sortBy = "price_per_month",
      sortOrder = "ASC",
    } = filters;

    const allowedSortOrders = ["ASC", "DESC"];
    const safeSortOrder = allowedSortOrders.includes(sortOrder.toUpperCase())
      ? sortOrder.toUpperCase()
      : "ASC";

    const allowedSortColumns = ["price_per_month", "avg_rating", "created_at"];
    const safeSortBy = allowedSortColumns.includes(sortBy)
      ? sortBy
      : "price_per_month";

    const pageLimit = 5;
    const safePage = Number(page) || 1;
    const offset = (safePage - 1) * pageLimit;

    const values = [pgId];

    // Conditionally add room type filter
    let roomTypeCondition = "";
    if (type) {
      values.push(type);
      roomTypeCondition = `AND r.room_type = $${values.length}`;
    }

    values.push(pageLimit);
    const limitIndex = values.length;

    values.push(offset);
    const offsetIndex = values.length;

    values.push(currentUser);
    const currentUserIndex = values.length;

    const query = `
    SELECT
      l.id,
      (
        SELECT COALESCE(JSON_AGG(room_data), '[]')
        FROM (
          SELECT JSON_BUILD_OBJECT(
            'listing_id', l.id,
            'room_id', r.id,
            'room_type', r.room_type,
            'status', r.status,
            'room_no', r.room_number,
            'beds', r.available_beds,
            'price_per_month', r.price_per_month,
            'price_per_week', r.price_per_week,
            'price_per_day', r.price_per_day,
            'security_deposit', r.security_deposit,
            'currency', r.currency,
            'floor', r.floor_number,
            'floor_area', r.floor_area_sqm,
            'furnished', r.is_furnished,
            'utility_details', r.utility_details,
            'available_from', r.available_from,
            'available_to', r.available_to,
            'extra_info', r.extra_info,
            'avg_rating', r.avg_rating,
            'review_count', r.review_count,
            'view_count', r.view_count,
            'capacity', r.capacity,
            'isSaved', EXISTS (
              SELECT 1 
              FROM saved_rooms sr
              WHERE sr.room_id = r.id
                AND sr.user_id = $${currentUserIndex}
              ),

            'room_photo', (
              SELECT JSON_BUILD_OBJECT(
                'photo_id', rp.id,
                'room_id', rp.room_id,
                'url', rp.url,
                'caption', rp.caption
              )
              FROM rooms_photos rp
              WHERE rp.room_id = r.id
              LIMIT 1
            )
          ) AS room_data
          FROM rooms r
          WHERE r.listing_id = l.id
            AND r.status = 'available'
            AND r.available_beds > 0
            AND r.deleted_at IS NULL
            ${roomTypeCondition}
          ORDER BY r.${safeSortBy} ${safeSortOrder}
          LIMIT $${limitIndex} OFFSET $${offsetIndex}
        ) sub
      ) AS rooms
    FROM listings l
    WHERE l.id = $1
      AND l.status = 'active'
      AND l.deleted_at IS NULL;
  `;

    // console.log("quey: ", query);
    // console.log("vlues; ", values);
    const { rows } = await pool.query(query, values);
    return rows[0] || null;
  }

  static async createRoom(client, roomData) {
    const allowedFields = [
      "listing_id",
      "room_number",
      "room_type",
      "title",
      "description",
      "capacity",
      "available_beds",
      "price_per_month",
      "price_per_week",
      "price_per_day",
      "security_deposite",
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
    const payload = Object.keys(roomData)
      .filter((key) => allowedFields.includes(key))
      .reduce((obj, val) => {
        obj[val] = roomData[val];
        return obj;
      }, {});

    if (Object.keys(payload).length === 0) {
      throw new Error("No valid fields provided");
    }

    const columns = Object.keys(payload);
    const value = Object.values(payload);
    const placeholders = columns.map((_, idx) => `$${idx + 1}`).join(", ");
    const query = `INSERT INTO rooms(${columns.join(", ")}) VALUES(${placeholders}) RETURNING *`;

    const { rows } = await client.query(query, value);
    return rows[0];
  }

  static async createListing(client, pgData) {
    const allowedFields = [
      "host_id",
      "location_id",
      "title",
      "description",
      "listing_type",
      "total_rooms",
      "available_rooms",
      "max_occupants",
      "status",
      "floor_area_sqm",
      "floor_number",
      "total_floors",
      "is_furnished",
      "allows_pets",
      "allows_smoking",
      "gender_preference",
      "starting_price",
      "price_per_week",
      "price_per_day",
      "currency",
      "security_deposit",
      "utilities_included",
      "utility_details",
      "available_from",
      "available_to",
      "min_stay_days",
      "max_stay_days",
      "house_rules",
      "extra_info",
    ];

    const payload = Object.keys(pgData)
      .filter((key) => allowedFields.includes(key))
      .reduce((obj, val) => {
        obj[val] = pgData[val];
        return obj;
      }, {});

    if (Object.keys(payload).length === 0) {
      throw new Error("No valid fields provided!");
    }
    const columns = Object.keys(payload);
    const values = Object.values(payload);

    const placeholders = columns.map((_, idx) => `$${idx + 1}`).join(", ");
    const query = `INSERT INTO listings(${columns.join(", ")}) VALUES(${placeholders}) RETURNING *`;

    const { rows } = await client.query(query, values);
    return rows[0];
  }

  static async getTotaltype(id) {
    console.log(id);
    const query = `
      SELECT 
        room_type AS type,
        COUNT(*) AS total,
        MIN(price_per_month) as price
      FROM rooms
      WHERE listing_id = $1
        AND status = 'available'
        AND available_beds > 0
        AND deleted_at IS NULL
      GROUP BY room_type;

  `;

    const { rows } = await pool.query(query, [id]);
    return rows;
  }

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
      "media_type",
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
        photo.media_type,
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

  // UPDATE LISTINGS-------------------------------------------------
  static async updatePgListingsById(updateFields, id) {
    const columns = Object.keys(updateFields);
    const values = Object.values(updateFields);

    const placeholders = columns
      .map((val, idx) => `${val} = $${idx + 1}`)
      .join(", ");
    const query = `UPDATE listings SET ${placeholders} WHERE id = $${columns.length + 1} RETURNING *`;

    const { rows } = await pool.query(query, [...values, id]);
    return rows[0];
  }

  // UPDATE ROOM----------------------------------------------------
  static async updateRoomById(updateFields, id) {
    // ✅ Only these fields are allowed to be updated manually
    const values = Object.values(updateFields);
    const ALLOWED_FIELDS = [
      "room_number",
      "room_type",
      "title",
      "description",
      "capacity",
      "available_beds",
      "price_per_month",
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
    const requestKeys = Object.keys(updateFields);
    if (requestKeys.length === 0) {
      throw new AppError("No fields provided for update", 400);
    }
    // 🔒 Reject invalid fields explicitly
    const invalidFields = requestKeys.filter(
      (key) => !ALLOWED_FIELDS.includes(key),
    );

    if (invalidFields.length > 0) {
      throw new AppError(
        `Can't update fields: ${invalidFields.join(", ")}`,
        400,
      );
    }

    const setClause = requestKeys
      .map((col, idx) => `${col} = $${idx + 1}`)
      .join(", ");

    const query = `
      UPDATE rooms
      SET ${setClause},
        updated_at = NOW()
      WHERE id = $${requestKeys.length + 1}
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

  static async getRoomPhotoById(client, id, room_id) {
    const query =
      "SELECT public_id FROM rooms_photos WHERE id = $1 AND room_id = $2";
    const { rows, rowCount } = await client.query(query, [id, room_id]);
    // console.log("result: ", rows);
    return { data: rows[0], total: rowCount };
  }

  static async getListingsPhotoById(client, pohtoID, listing_id) {
    console.log(pohtoID, listing_id);
    const query = `SELECT public_id FROM listing_photos WHERE id= $1 AND listing_id =$2`;
    const { rows, rowCount } = await client.query(query, [pohtoID, listing_id]);
    console.log("rowss:  ", rows);
    return { data: rows[0], total: rowCount };
  }
  // =======================================================
  // SAVED LISTING---------------------------------
  // =======================================================

  static async saveListing(userId, listingId) {
    const query = `
      INSERT INTO saved_listings(user_id, listing_id)
      VALUES($1,$2)
      ON CONFLICT (user_id, listing_id) DO NOTHING
      RETURNING *;
    `;
    const { rows } = await pool.query(query, [userId, listingId]);
    return rows[0];
  }

  // ========================
  // SAVE ROOM
  static async saveRooms(userId, roomId, listingId) {
    const query = `
      INSERT INTO saved_rooms(user_id, room_id,listing_id)
      VALUES($1,$2,$3)
      ON CONFLICT (user_id, room_id) DO NOTHING
      RETURNING *;
    `;
    const { rows } = await pool.query(query, [userId, roomId, listingId]);
    return rows[0];
  }

  static async getSaveListing(userId) {
    const page = 1;
    const limit = 6;
    const offset = (page - 1) * limit;

    const query = `
      SELECT 
        l.id,
        l.title,
        l.starting_price,
        l.description,
        l.avg_rating,
        p.url ,
        s.saved_at

      FROM saved_listings s
      JOIN listings l 
        ON l.id = s.listing_id

      LEFT JOIN LATERAL(
        SELECT 
          url
        FROM listing_photos p
        WHERE p.listing_id = l.id
        LIMIT 1
      ) p ON true
      WHERE s.user_id = $1
      ORDER BY s.saved_at DESC
      LIMIT $2 OFFSET $3
    `;

    const { rows } = await pool.query(query, [userId, limit, offset]);
    return rows;
  }

  static async removeSavedListing(id, listingId) {
    const query = `
      DELETE FROM saved_listings 
      WHERE user_id = $1
        AND listing_id = $2;
    `;
    return await pool.query(query, [id, listingId]);
  }

  static async removeRoom(userId, roomId) {
    const query = `
      DELETE FROM saved_rooms
      WHERE user_id = $1
        AND room_id = $2;
    `;

    return await pool.query(query, [userId, roomId]);
  }

  // ================================================
  // SAVED ROOMS
  // ================================================

  static async getSavedRooms(userId) {
    const query = `
      SELECT 
        r.id,
        r.title,
        r.room_number,
        r.room_type,
        r.price_per_month,
        r.description,
        rp.url

      FROM saved_rooms sr 
      JOIN rooms r
        ON r.id = sr.room_id
      LEFT JOIN LATERAL(
        SELECT
          url
        FROM rooms_photos rp
        WHERE rp.room_id = r.id
        LIMIT 1
      ) rp ON true
      WHERE sr.user_id = $1
      ORDER BY sr.saved_at DESC
      LIMIT 6;
    `;

    const { rows } = await pool.query(query, [userId]);
    return rows;
  }

  // ================================
  // REVIEW
  // ================================
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

    const { rows } = await pool.query(query, values);
    return rows[0];
  }

  static async getAllReviews() {
    const query = `
      SELECT * FROM reviews
    `;

    const { rows } = await pool.query(query);
    return rows[0];
  }

  static async getAllPgReviewsById(id) {
    const query = `
      SELECT 
        reviewer_id,
        listing_id,
        overall_rating,
        comment

      WHERE id = $1
    `;

    const { rows } = await pool.query(query, [id]);
    return rows;
  }

  static async upDateReview(listing_id) {
    const query = `
      UPDATE listings 
      SET 
        review_count = (
          SELECT COUNT(*) FROM reviews WHERE listing_id = $1
        ),
        avg_rating = (
          SELECT COALESCE(AVG(overall_rating),0)
          FROM reviews
          WHERE listing_id = $1
        )
      WHERE id = $1;
    `;
    const { rows } = await pool.query(query, [listing_id]);
    console.log(rows);
    return rows;
  }
}

module.exports = PgRepo;
