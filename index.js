const express = require("express");
const cors = require("cors");
require("dotenv").config();
const mongoose = require("mongoose");
const serverless = require("serverless-http");

const authRouter = require("./routes/authRoutes");
const clinicRouter = require("./routes/clinicRoutes");
const userRouter = require("./routes/userRoutes");
const adminRouter = require("./routes/adminRoutes");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: "50mb" }));

// mongoose
//   .connect(process.env.MONGODB_URI, {
//     dbName: process.env.MONGODB_DB,
//   })
//   .then(() => {
//     console.log("Connected to MongoDB");
//   })
//   .catch((err) => {
//     console.log("Error connecting to MongoDB", err);
//   });

// MongoDB connection (runs once)
let isDbConnected = false;
async function connectDb() {
  if (!isDbConnected) {
    try {
      await mongoose.connect(process.env.MONGODB_URI, {
        dbName: process.env.MONGODB_DB,
      });
      isDbConnected = true;
      console.log("✅ Connected to MongoDB");
    } catch (err) {
      console.log("❌ Error connecting to MongoDB", err);
    }
  }
}
connectDb();

app.get("/", (req, res) => {
  res.status(200).json({
    Warning: "This is a protected route. Unauthorized access is prohibited.",
  });
});

app.use("/auth", authRouter);
app.use("/clinic", clinicRouter);
app.use("/user", userRouter);
app.use("/admin", adminRouter);
app.use("/user/webhook/appointments", userRouter);

// app.listen(PORT, () => {
//   console.log(`Server is running on http://localhost:${PORT}`);
// });

// ✅ Export serverless handler
module.exports = serverless(app);
