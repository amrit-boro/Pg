// ==================== IMPORTS ====================
const express = require("express");
const morgan = require("morgan");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const hpp = require("hpp");
const { xss } = require("express-xss-sanitizer");

const userRouter = require("./router/userRouter/router");
const listingRouter = require("./router/pgRouter/router");
const priceRouter = require("./router/priceRouter/router");
const reviewRouter = require("./router/reviewRouter/router");

const AppError = require("./utils/appError");
const globalError = require("./controllers/errorController");

// ==================== APP INIT ====================
const app = express();

// ==================== SECURITY MIDDLEWARES ====================

// Secure HTTP headers
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  }),
);

// Rate limiting (basic protection)
const limiter = rateLimit({
  max: 100,
  windowMs: 60 * 60 * 1000, // 1 hour
  message: "Too many requests from this IP, Please try again in an hour",
});
app.use("/api", limiter);

// ==================== GENERAL MIDDLEWARES ====================

// Enable CORS
app.use(
  cors({
    origin: "http://localhost:5173", // change in production
    credentials: true,
  }),
);

// Logging (dev only)
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

// Body parser (limit payload size)
app.use(express.json());

// Prevent XSS attacks
app.use(xss());

// Prevent HTTP parameter pollution
app.use(hpp());
// Compress responses

// Serve static files
app.use(express.static(`${__dirname}/public`));

// Debug middleware (dev only)
if (process.env.NODE_ENV === "development") {
  app.use((req, res, next) => {
    next();
  });
}

// ==================== ROUTES ====================

// Users
app.use("/api/v1/users", userRouter);

// Listings
app.use("/api/v1/listings", listingRouter);

// Filters
// app.use("/api/v1/filterlistings", filterRouter);

// Review
app.use("/api/v1/reviews", reviewRouter);
// PRICE
app.use("/api/v1/price", priceRouter);

// ==================== ERROR HANDLING ====================

// Handle unknown routes
app.all("/", (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server`, 404));
});

// Global error handler
app.use(globalError);

// ==================== EXPORT ====================
module.exports = app;
