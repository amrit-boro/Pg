const filterRepo = require("../../service/filterRoom/filterRoom");
const catchAsync = require("../../utils/catchAsync");

exports.filterListings = catchAsync(async (req, res) => {
  const allowedFilters = ["listing_type", "maxPrice", "", "city"];

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

  if (filterData.maxPrice) {
    const price = Number(filterData.maxPrice);

    if (!Number.isInteger(price)) {
      return res.status(400).json({
        success: false,
        message: "maxPrice must be an integer",
      });
    }

    filterData.maxPrice = price;
  }

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
