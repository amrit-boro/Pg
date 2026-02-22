const userRepo = require("../../service/user/userRepo");

exports.getAllUsers = async (req, res) => {
  try {
    const users = await userRepo.findAllUser();
    return res.status(200).json({
      total: users.length,
      users,
    });
  } catch (error) {
    throw new Error(error);
  }
};

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

exports.createUser = async (req, res) => {
  try {
    const userData = req.body;
    const newUser = await userRepo.createUser(userData);
    return res.status(201).json({
      success: true,
      message: "successful",
      data: newUser,
    });
  } catch (error) {
    throw new Error("Error :", error);
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
