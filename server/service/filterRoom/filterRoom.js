const pool = require("../../config/db");

class FilterRoom {
  static async filterListings(filters = {}) {
    const {
      minPrice,
      maxPrice,
      limit = 6,
      page = 1,
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

      COALESCE(
        JSON_AGG(
          JSON_BUILD_OBJECT(
            'url',ph.url,
            'caption',ph.caption
          )
        ),'[]'
      ) AS photos

    FROM listings l
    JOIN users u ON l.host_id = u.id
    JOIN locations loc ON l.location_id = loc.id
    LEFT JOIN listing_photos ph ON ph.listing_id = l.id
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
      listing_type: {
        type: "eq",
        column: "l.listing_type",
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

    const sageLimit = Number(limit) || 6;
    const safePage = Number(page) || 1;
    const offset = (safePage - 1) * sageLimit;

    values.push(sageLimit);
    const limitIndex = values.length;

    values.push(offset);
    const offsetIndex = values.length;

    /**
     * Final Query
     */

    const finalQuery = `
    ${baseQuery}
    WHERE ${conditions.join(" AND ")}
    GROUP BY l.id, u.id, loc.id
    ORDER BY l.${safeSortBy} ${safeSortOrder}
    LIMIT $${limitIndex}
    OFFSET $${offsetIndex}
  `;

    console.log("SQL:", finalQuery);
    // console.log("Values:", values);

    const { rows } = await pool.query(finalQuery, values);
    return rows;
  }
}

module.exports = FilterRoom;
