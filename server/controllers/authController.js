const { promisify } = require("util");
const userRepo = require("../service/user/userRepo");
const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync");
const hashPassword = require("../utils/hash");
const jwt = require("jsonwebtoken");

const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

exports.signUp = catchAsync(async (req, res, next) => {
  const {
    email,
    phone,
    password_hash: password,
    first_name,
    last_name,
  } = req.body;

  const existing = await userRepo.findUserByEmail(email);

  // Checking existing user
  if (existing) {
    return next(new AppError("Email already exists!"));
  }
  // hash password
  const password_hash = await hashPassword.hashPassword(password);

  // create user
  const newUser = await userRepo.createUser({
    email,
    phone,
    password_hash,
    first_name,
    last_name,
  });

  // send JWT
  const token = signToken(newUser.id);
  res.status(201).json({
    success: true,
    token: token,
    message: "successful",
    data: newUser,
  });
});

exports.logIn = catchAsync(async (req, res, next) => {
  const { email, password_hash: password } = req.body;

  console.log(email, password);
  // 1) Check if email and password exists
  if (!email || !password) {
    return next(new AppError("Please provide email or password", 400));
  }
  // 2) Check if users exists && password is correct
  const user = await userRepo.findUserByEmail(email);

  if (
    !user ||
    !(await hashPassword.comparePassword(password, user.password_hash))
  ) {
    return next(new AppError("Incorrect email or password", 401));
  }

  // If everything ok, send token to client
  console.log("user: ", user);
  const token = signToken(user.id);
  res.status(200).json({
    status: "success",
    token: token,
  });
});

exports.protect = catchAsync(async (req, res, next) => {
  // 1) Getting token and check of it's there
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }
  if (!token) {
    return next(
      new AppError("You are not logged in! Please log in to get access", 401),
    );
  }
  // 2) Verification token
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
  console.log(decoded);
  // 3) Check if user still exists
  const currentUser = await userRepo.findUserById(decoded.id);
  if (!currentUser) {
    return next(
      new AppError(
        "The token belonging to this user does no longer exists.",
        401,
      ),
    );
  }
  // 4) Check if user Changed password  after the token was issued

  //
  req.user = currentUser;
  next();
});
