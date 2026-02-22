const express = require("express");
const userController = require("../../controllers/userController/controller");

const router = express.Router();

router.param("id", (req, res, next, val) => {
  console.log(`Tour id is : ${val}`);
  next();
});

router.get("/getAllUser", userController.getAllUsers);
router.get("/getUser/:id", userController.getUser);

router.post("/createUser", userController.createUser);
router.post("/deleteUser/:id", userController.deleteUser);

module.exports = router;
