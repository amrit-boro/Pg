const filterRepo = require("../../service/filterRoom/filterRoom");

exports.filterListings = async (req, res) => {
  try {
    const filterData = { ...req.query };
    const { minPrice, maxPrice, city, type } = filterData;
    const filterValues = await filterRepo.filterByPrice({
      minPrice,
      maxPrice,
      city,
      type,
    });

    if (!filterValues || filterValues.length === 0) {
      return res.status(200).json({
        success: true,
        message: "Ooops product not found ):",
        total: 0,
        data: [],
      });
    }

    return res.status(200).json({
      total: filterValues.length,
      success: true,
      data: filterValues,
    });
  } catch (error) {
    console.log("Error: ", error.message);
    throw new Error(error);
  }
};
