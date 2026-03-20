// const { minPrice, maxPrice } = filter;

// const filterMap = {
//   price: {
//     type: "between",
//     column: "l.starting_price",
//     keys: ["minPrice", "maxPrice"],
//     transform: Number,
//   },
//   listing_type: {
//     type: "eq",
//     column: "l.listing_type",
//   },
// };

// Object.entries(filterMap).forEach(([key, config]) =>
//   console.log(key, "\n===============", config),
// );
// console.log(l);

function x(filter = {}) {
  const { minPrice, maxPrice } = filter;

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

  Object.entries(filterMap).forEach(([key, config]) => {
    console.log(filter[key]);
    switch (config.type) {
      case "between": {
        const [minKey, maxKey] = config.keys;
        const min = filter[minKey];
        const max = filter[maxKey];

        if (min && max) {
          values.push(config.transform ? config.transform(min) : min);
          const minIndex = values.length;

          values.push(config.transform ? config.transform(max) : max);
          const maxIndex = values.length;
          conditions.push(
            `${config.column} BETWEEN ${minIndex} AND ${maxIndex}`,
          );
        } else if (min) {
          values.push(config.transform ? config.transform(min) : min);
          conditions.push(`${config.column} >= ${values.length}`);
        } else if (max) {
          values.push(config.transform ? config.transform(max) : max);
          conditions.push(`${config.column} <= ${values.length}`);
        }
        break;
      }
      case "eq": {
        if (filter[key] !== undefined && filter[key] !== null) {
          const value = config.transform
            ? config.transform(filter[key])
            : filter[key];
          values.push(value);
          conditions.push(`${config.column} = $${values.length}`);
        }
      }
    }
  });
}

x({ price: 12, listing_type: "boys" });
