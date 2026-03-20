const express = require("express");
const morgan = require("morgan");
const cors = require("cors");

const userRouter = require("./router/userRouter/router");
const pgRouter = require("./router/pgRouter/router");
const priceRouter = require("./router/priceRouter/router");
const filterRouter = require("./router/filterRouter/pgFilterRouter");
const AppError = require("./utils/appError");
const globalError = require("./controllers/errorController");

const app = express();
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}
//middlewares
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true, // only if using cookies/auth
  }),
);
app.use(express.json());
app.use(express.static(`${__dirname}/public`));

app.use((req, res, next) => {
  console.log(req.headers);
  next();
});

// users
app.use("/api/v1/users", userRouter);

// pg
app.use("/api/v1/pg", pgRouter);
app.use("/api/v1/pg/price", priceRouter);

//filter-pg
app.use("/api/v1/filterlistings", filterRouter);

app.use((req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server`, 400));
});

app.use(globalError);

module.exports = app;
