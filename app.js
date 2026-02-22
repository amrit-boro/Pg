const express = require("express");
const morgan = require("morgan");

const userRouter = require("./router/userRouter/router");
const pgRouter = require("./router/pgRouter/router");
const filterRouter = require("./router/filterRouter/pgFilterRouter");

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

//filter-pg
app.use("/api/v1/listings", filterRouter);

module.exports = app;
