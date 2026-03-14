const pool = require("../../config/db");

class FilterRoom {
  static async filterListings(filters = {}) {
    const {
      minPrice,
      maxPrice,
      limit = 20,
      offset = 0,
      sortBy = "starting_price",
      sortOrder = "ASC",
    } = filters;

    const baseQuery = `
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
      u.first_name,
      u.last_name,
      loc.address_line1,
      loc.city,
      loc.state,

      (
        SELECT COALESCE(
          JSON_AGG(
            JSON_BUILD_OBJECT(
              'url', ph.url,
              'caption', ph.caption
            )
          ), '[]'
        )
        FROM listing_photos ph
        WHERE ph.listing_id = l.id
      ) AS photos

    FROM listings l
    JOIN users u ON l.host_id = u.id
    JOIN locations loc ON l.location_id = loc.id
  `;

    const conditions = [`l.status = 'active'`, `l.deleted_at IS NULL`];

    const values = [];

    /**
     * Filter Configuration
     */
    const filterMap = {
      price: {
        type: "between",
        column: "l.starting_price",
        keys: ["minPrice", "maxPrice"],
        transform: Number,
      },

      city: {
        type: "eq",
        column: "loc.city",
      },

      listing_type: {
        type: "eq",
        column: "l.listing_type",
      },

      max_occupants: {
        type: "eq",
        column: "l.max_occupants",
        transform: Number,
      },

      availableFrom: {
        type: "gte",
        column: "l.available_from",
      },
    };

    /**
     * Dynamic Filter Builder
     */
    Object.entries(filterMap).forEach(([key, config]) => {
      switch (config.type) {
        case "between": {
          const [minKey, maxKey] = config.keys;
          const min = filters[minKey];
          const max = filters[maxKey];

          if (min && max) {
            values.push(config.transform ? config.transform(min) : min);
            const minIndex = values.length;

            values.push(config.transform ? config.transform(max) : max);
            const maxIndex = values.length;

            conditions.push(
              `${config.column} BETWEEN $${minIndex} AND $${maxIndex}`,
            );
          } else if (min) {
            values.push(config.transform ? config.transform(min) : min);
            conditions.push(`${config.column} >= $${values.length}`);
          } else if (max) {
            values.push(config.transform ? config.transform(max) : max);
            conditions.push(`${config.column} <= $${values.length}`);
          }

          break;
        }

        case "eq": {
          if (filters[key] !== undefined && filters[key] !== null) {
            const value = config.transform
              ? config.transform(filters[key])
              : filters[key];

            values.push(value);
            conditions.push(`${config.column} = $${values.length}`);
          }

          break;
        }

        case "gte": {
          if (filters[key]) {
            values.push(filters[key]);
            conditions.push(`${config.column} >= $${values.length}`);
          }

          break;
        }

        case "in": {
          if (filters[key]) {
            const arr = Array.isArray(filters[key])
              ? filters[key]
              : filters[key].split(",");

            const placeholders = arr.map((_, i) => `$${values.length + i + 1}`);

            values.push(...arr);

            conditions.push(`${config.column} IN (${placeholders.join(",")})`);
          }

          break;
        }
      }
    });

    /**
     * Safe Sorting
     */
    // console.log("conditions; ", conditions);
    const allowedSortColumns = [
      "created_at",
      "starting_price",
      "available_from",
    ];

    const allowedSortOrders = ["ASC", "DESC"];

    const safeSortBy = allowedSortColumns.includes(sortBy)
      ? sortBy
      : "created_at";

    const safeSortOrder = allowedSortOrders.includes(sortOrder.toUpperCase())
      ? sortOrder.toUpperCase()
      : "DESC";

    /**
     * Pagination
     */

    values.push(Number(limit));
    const limitIndex = values.length;

    values.push(Number(offset));
    const offsetIndex = values.length;

    /**
     * Final Query
     */

    const finalQuery = `
    ${baseQuery}
    WHERE ${conditions.join(" AND ")}
    ORDER BY l.${safeSortBy} ${safeSortOrder}
    LIMIT $${limitIndex}
    OFFSET $${offsetIndex}
  `;

    // console.log("SQL:", finalQuery);
    // console.log("Values:", values);

    try {
      const { rows } = await pool.query(finalQuery, values);
      console.log("rows: ", rows);
      return rows;
    } catch (error) {
      console.error("Filter query error:", error);
      throw new Error("Failed to filter listings");
    }
  }
  // static async filterListings(filters = {}) {
  //   console.log("filters: ", filters);
  //   const {
  //     minPrice,
  //     maxPrice,
  //     city,
  //     type,
  //     max_occupants,
  //     availableFrom,
  //     limit = 20,
  //     offset = 0,
  //     sortBy = "created_at",
  //     sortOrder = "DESC",
  //   } = filters;
  //   const baseQuery = `
  //     SELECT
  //       r.id,
  //       r.listing_id,
  //       r.room_number,
  //       r.room_type,
  //       r.title,
  //       r.description,
  //       r.capacity,
  //       r.available_beds,
  //       r.price_per_month,
  //       r.price_per_week,
  //       r.price_per_day,
  //       r.security_deposit,
  //       r.currency,
  //       r.floor_number,
  //       r.floor_area_sqm,
  //       r.is_furnished,
  //       r.utility_details,
  //       r.status,
  //       r.available_from,
  //       r.available_to,
  //       r.extra_info,
  //       r.avg_rating,
  //       r.review_count,
  //       r.view_count,

  //       l.listing_type,

  //       (
  //         SELECT COALESCE(
  //           JSON_AGG(
  //             JSON_BUILD_OBJECT(
  //               'photo_id',rp.id,
  //               'room_id',rp.room_id,
  //               'url',rp.url,
  //               'caption',rp.caption,
  //               'is_cover',rp.is_cover
  //             )
  //           ),'[]'
  //         )
  //         FROM rooms_photos rp
  //         WHERE rp.room_id = r.id
  //       ) AS room_photo

  //     FROM rooms r
  //     JOIN listings l ON r.listing_id = l.id

  //   `;

  //   const conditions = [`r.status = 'available'`, `r.deleted_at IS NULL`];

  //   const values = [];

  //   /**
  //    * Filter Configuration Map
  //    * key → incoming filter key
  //    * column → db column
  //    * operator → SQL operator
  //    * transform → optional sanitizer / transformer
  //    */
  //   const filterMap = {
  //     minPrice: {
  //       column: "r.price_per_month",
  //       operator: ">=",
  //       transform: Number,
  //     },
  //     maxPrice: {
  //       column: "r.price_per_month",
  //       operator: "<=",
  //       transform: Number,
  //     },
  //     city: {
  //       column: "loc.city",
  //       operator: "=",
  //     },
  //     type: {
  //       column: "r.room_type",
  //       operator: "=",
  //     },
  //     max_occupants: {
  //       column: "r.capacity",
  //       operator: "=",
  //       transform: Number,
  //     },
  //     availableFrom: {
  //       column: "r.available_from",
  //       operator: ">=",
  //     },
  //   };

  //   // Build dynamic filters
  //   Object.entries(filterMap).forEach(([key, config]) => {
  //     if (filters[key] !== undefined && filters[key] !== null) {
  //       const value = config.transform
  //         ? config.transform(filters[key])
  //         : filters[key];
  //       values.push(value);
  //       conditions.push(
  //         `${config.column} ${config.operator} $${values.length}`,
  //       );
  //     }
  //   });

  //   // Prevent SQL injection in ORDER BY
  //   const allowedSortColumns = [
  //     "created_at",
  //     "price_per_month",
  //     "available_from",
  //   ];

  //   const allowedSortOrders = ["ASC", "DESC"];

  //   const safeSortBy = allowedSortColumns.includes(sortBy)
  //     ? sortBy
  //     : "created_at";

  //   const safeSortOrder = allowedSortOrders.includes(sortOrder.toUpperCase())
  //     ? sortOrder.toUpperCase()
  //     : "DESC";

  //   values.push(Number(limit));
  //   const limitIndex = values.length;

  //   values.push(Number(offset));
  //   const offsetIndex = values.length;

  //   const finalQuery = `
  //   ${baseQuery}
  //   WHERE ${conditions.join(" AND ")}
  //   ORDER BY r.${safeSortBy} ${safeSortOrder}
  //   LIMIT $${limitIndex}
  //   OFFSET $${offsetIndex}
  // `;
  //   console.log("final query: ")
  //   try {
  //     const { rows } = await pool.query(finalQuery, values);
  //     return rows;
  //   } catch (error) {
  //     console.error("Filter query error:", error);
  //     throw new Error("Failed to filter listings");
  //   }
  // }
}

module.exports = FilterRoom;
