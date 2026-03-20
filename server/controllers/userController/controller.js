const userRepo = require("../../service/user/userRepo");
const catchAsync = require("../../utils/catchAsync");

exports.getAllUsers = catchAsync(async (req, res) => {
  console.log("user credential: ", req.user);
  const users = await userRepo.findAllUser();
  return res.status(200).json({
    total: users.length,
    users,
  });
});

exports.getUser = async (req, res) => {
  const { id } = req.params;
  try {
    const user = await userRepo.findUser(id);
    return res.status(200).json({
      user,
    });
  } catch (error) {
    throw new Error(error);
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const deleteuser = await userRepo.deleteUserById(id);

    if (!deleteuser) {
      return res.status(404).json({
        success: false,
        message: "user not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "User deleted successfully",
      data: deleteuser,
    });
  } catch (error) {
    throw new Error("Error:", error);
  }
};
