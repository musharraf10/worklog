const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const workLogRoutes = require("./routes/workLogRoutes");
const authRoutes = require("./routes/authRoutes");
const reportRoutes = require("./routes/reportRoutes");
const connectDB = require("./config/db");
const errorHandler = require("./middleware/errorMiddleware");

dotenv.config();

connectDB();

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    message: "Work Log API is running",
  });
});

app.use("/api/auth", authRoutes);

app.use("/api/worklogs/summary", reportRoutes);

app.use("/api/worklogs", workLogRoutes);

app.use(errorHandler);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
