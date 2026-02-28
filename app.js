const express = require("express");
const morgan = require("morgan");

const userRouter = require("./router/userRouter/router");
const pgRouter = require("./router/pgRouter/router");
const filterRouter = require("./router/filterRouter/pgFilterRouter");
const AppError = require("./utils/appError");
const globalError = require("./controllers/errorController");

const app = express();
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}
//middlewares
app.use(express.json());
app.use(express.static(`${__dirname}/public`));

// users
app.use("/api/v1/users", userRouter);

// pg
app.use("/api/v1/pg", pgRouter);
app.use("/api/v1/getAllPgs", pgRouter);

//filter-pg
app.use("/api/v1/filterlistings", filterRouter);

app.use((req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server`, 400));
});

app.use(globalError);

module.exports = app;
