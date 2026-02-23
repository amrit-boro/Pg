const filterRepo = require("../../service/filterRoom/filterRoom");

exports.filterListings = async (req, res) => {
  try {
    const filterData = { ...req.query };
    const filterValues = await filterRepo.filterListings(filterData);

    if (!filterValues || filterValues.length === 0) {
      return res.status(200).json({
        success: true,
        message: "Ooops room not found ):",
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
