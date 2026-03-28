const filterRepo = require("../../service/filterRoom/filterRoom");
const catchAsync = require("../../utils/catchAsync");

exports.filterListings = catchAsync(async (req, res) => {
  const allowedFilters = [
    "listing_type",
    "maxPrice",
    "minPrice",
    "city",
    "page",
  ];

  const filterData = {};

  for (const key of Object.keys(req.query)) {
    if (!allowedFilters.includes(key)) {
      return res.status(400).json({
        success: false,
        message: `Invalid query parameter: ${key}`,
      });
    }
    filterData[key] = req.query[key];
  }

  if (filterData.minPrice || filterData.maxPrice) {
    const min = Number(filterData.minPrice);
    const max = Number(filterData.maxPrice);

    if (filterData.minPrice && !Number.isInteger(min)) {
      return res.status(400).json({
        success: false,
        message: "Min price must be an integer",
      });
    }

    if (filterData.maxPrice && !Number.isInteger(max)) {
      return res.status(400).json({
        success: false,
        message: "Max price must be an integer",
      });
    }

    if (filterData.minPrice) filterData.minPrice = min;
    if (filterData.maxPrice) filterData.maxPrice = max;
  }

  console.log("filterdata: ", filterData);
  const filterValues = await filterRepo.filterListings(filterData);

  if (!filterValues || filterValues.length === 0) {
    return res.status(200).json({
      success: true,
      message: "Ooops room not found ):",
      total: 0,
      data: [],
    });
  }

  res.status(200).json({
    total: filterValues.length,
    success: true,
    data: filterValues,
  });
});
