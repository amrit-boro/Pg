const pool = require("../../config/db");

class FilterRoom {
  static async filterListings(filters = {}) {
    const {
      minPrice,
      maxPrice,
      city,
      type,
      max_occupants,
      availableFrom,
      limit = 20,
      offset = 0,
      sortBy = "created_at",
      sortOrder = "DESC",
    } = filters;
    console.log(minPrice, maxPrice, city, type, max_occupants);
    const baseQuery = `
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
              'caption',ph.caption
            )
          ),'[]'
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
     * Filter Configuration Map
     * key → incoming filter key
     * column → db column
     * operator → SQL operator
     * transform → optional sanitizer / transformer
     */
    const filterMap = {
      minPrice: {
        column: "l.price_per_month",
        operator: ">=",
        transform: Number,
      },
      maxPrice: {
        column: "l.price_per_month",
        operator: "<=",
        transform: Number,
      },
      city: {
        column: "loc.city",
        operator: "=",
      },
      type: {
        column: "l.listing_type",
        operator: "=",
      },
      max_occupants: {
        column: "l.max_occupants",
        operator: "=",
        transform: Number,
      },
      availableFrom: {
        column: "l.available_from",
        operator: ">=",
      },
    };

    // Build dynamic filters
    Object.entries(filterMap).forEach(([key, config]) => {
      if (filters[key] !== undefined && filters[key] !== null) {
        const value = config.transform
          ? config.transform(filters[key])
          : filters[key];
        values.push(value);
        conditions.push(
          `${config.column} ${config.operator} $${values.length}`,
        );
      }
    });

    // Prevent SQL injection in ORDER BY
    const allowedSortColumns = [
      "created_at",
      "price_per_month",
      "available_from",
    ];

    const allowedSortOrders = ["ASC", "DESC"];

    const safeSortBy = allowedSortColumns.includes(sortBy)
      ? sortBy
      : "created_at";

    const safeSortOrder = allowedSortOrders.includes(sortOrder.toUpperCase())
      ? sortOrder.toUpperCase()
      : "DESC";

    values.push(Number(limit));
    const limitIndex = values.length;

    values.push(Number(offset));
    const offsetIndex = values.length;

    const finalQuery = `
    ${baseQuery}
    WHERE ${conditions.join(" AND ")}
    ORDER BY l.${safeSortBy} ${safeSortOrder}
    LIMIT $${limitIndex}
    OFFSET $${offsetIndex}
  `;
    try {
      const { rows } = await pool.query(finalQuery, values);
      return rows;
    } catch (error) {
      console.error("Filter query error:", error);
      throw new Error("Failed to filter listings");
    }
  }
}

module.exports = FilterRoom;
