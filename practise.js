//  filterByPrice(filters) {
//   try {
//     const baseQuery = `
//       SELECT l.*, loc.city
//       FROM listings l
//       JOIN locations loc ON l.location_id = loc.id
//       WHERE l.status = 'active' AND l.deleted_at IS NULL
//     `;

//     // Define how to handle each filter
//     const filterMap = {
//       minPrice: { column: 'l.price_per_month', operator: '>=' },
//       maxPrice: { column: 'l.price_per_month', operator: '<=' },
//       city:     { column: 'loc.city',          operator: '=' },
//       type:     { column: 'l.listing_type',    operator: '=' }
//     };

//     const conditions = [];
//     const values = [];

//     // Loop through the map and check if the filter exists in the input
//     Object.keys(filterMap).forEach((key) => {
//       if (filters[key] !== undefined && filters[key] !== null) {
//         const { column, operator } = filterMap[key];
//         values.push(filters[key]);
//         conditions.push(`${column} ${operator} $${values.length}`);
//       }
//     });

//     const whereClause = conditions.length > 0 ? ` AND ${conditions.join(' AND ')}` : '';
//     const finalQuery = `${baseQuery} ${whereClause} ORDER BY l.created_at DESC`;

//     const { rows } = await pool.query(finalQuery, values);
//     return rows;
//   } catch (error) {
//     console.error("Database Filter Error:", error.message);
//     throw new Error("Could not retrieve filtered listings.");
//   }
// }

function filterByPrice(filter) {
  console.log(filter);
  const columns = Object.keys(filter);
  console.log(columns);
  const values = Object.values(filter);

  const setClause = columns
    .map((col, idx) => `${col} = $${idx + 1}`)
    .join(",  ");
  console.log(setClause);
  console.log(typeof values);
  const query = `UPDATE users SET  `;
}

const valus = { price: 20, abc: "Amrit" };

filterByPrice(valus);
