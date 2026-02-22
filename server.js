require("dotenv").config();

const app = require("./app");
console.log("post: ", process.env.PORT);
const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log(`App is running on port ${PORT}`);
});
