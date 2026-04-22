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

exports.deleteUser = catchAsync(async (req, res) => {
  const { id } = req.user;
  console.log("id:", id);
  const deleteuser = await userRepo.deleteUserById(id);

  if (!deleteuser) {
    return res.status(404).json({
      success: false,
      message: "user not found",
    });
  }

  res.status(200).json({
    success: true,
    message: "User deleted successfully",
    data: deleteuser,
  });
});

// USER-DETAILS
exports.details = catchAsync(async (req, res) => {
  // const { id } = req.user;
  const id = "088ce851-f89e-400f-8e51-c32c7d6d2eaa";
  console.log("user id", id);
  const userDetails = await userRepo.userDetails(id);

  res.status(200).json({
    success: true,
    data: userDetails,
  });
});
