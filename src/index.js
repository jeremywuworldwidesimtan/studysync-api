const express = require("express");
const cors = require("cors");
const app = express();
const env = require("dotenv");
const routes = require("./routes");
const generative = require("./generativeRoutes");
const test = require("./testRoutes");
app.use(
  cors({
    origin: "http://localhost:3000",
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type"],
    credentials: true,
  })
);

app.use(express.json());
app.use("/api", routes);
app.use("/api/generative", generative);
//app.use('/api/test', test);

env.config(); // just load the .env file

const PORT = process.env.PORT || 3420;

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
