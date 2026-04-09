const express = require("express");
const userController = require("../../controllers/userController/controller");
const authController = require("../../controllers/authController");
const { upload } = require("../../utils/cloudinary");
const router = express.Router();

router.param("id", (req, res, next, val) => {
  console.log(`Tour id is : ${val}`);
  next();
});

router.get("/getAllUser", authController.protect, userController.getAllUsers);

// router.post("/signUp", upload.single("image"), authController.signUp);
router.get("/login", authController.logIn);
router.post("/forgotPassword", authController.forgotPassword);
// router.post("/resetPassword/:token", authController.resetPassword);

router
  .route("/")
  .get(userController.getUser)
  .delete(
    authController.protect,
    authController.restrictTo("admin", "host"),
    userController.deleteUser,
  );

// router.get("/getUser/:id", userController.getUser);
// router.post("/deleteUser/:id", userController.deleteUser);

module.exports = router;
