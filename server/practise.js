const filters = { sortBy: "ASC" };

const r = filters.sortBy;

const allowedSortFields = ["ASC", "DSC"];

console.log(allowedSortFields.includes(r) ? "Yes" : "no");
