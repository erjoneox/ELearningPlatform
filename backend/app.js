require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const multer = require("multer");

const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const courseRoutes = require("./routes/courseRoutes");
const enrollmentRoutes = require("./routes/enrollmentRoutes");
const lessonRoutes = require("./routes/lessonRoutes");
const assignmentRoutes = require("./routes/assignmentRoutes");
const quizRoutes = require("./routes/quizRoutes");
const progressRoutes = require("./routes/progressRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const categoryRoutes = require("./routes/categoryRoutes");

const app = express();
const PORT = process.env.PORT || 5000;
const allowedOrigins = (process.env.CLIENT_URL || "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(helmet());
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      const error = new Error("Origin is not allowed.");
      error.status = 403;
      return callback(error);
    },
  }),
);

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/courses", courseRoutes);
app.use("/api/enrollments", enrollmentRoutes);
app.use("/api/lessons", lessonRoutes);
app.use("/api/assignments", assignmentRoutes);
app.use("/api/quizzes", quizRoutes);
app.use("/api/progress", progressRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/categories", categoryRoutes);

// Public API status
app.get("/", (req, res) => {
  res.json({
    message: "EduFlow API is running",
  });
});

app.get("/api/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    message: "Backend is working correctly",
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    message: "API endpoint not found.",
  });
});

// Global error handler
app.use((error, req, res, next) => {
  console.error("Application error:", error.message);

  if (res.headersSent) {
    return next(error);
  }

  let status = error.status || 500;
  let message = status < 500 ? error.message : "An unexpected server error occurred.";

  if (error instanceof multer.MulterError) {
    status = error.code === "LIMIT_FILE_SIZE" ? 413 : 400;
    message =
      error.code === "LIMIT_FILE_SIZE"
        ? "Each uploaded file must be 10 MB or smaller."
        : "The uploaded files exceed the allowed limits.";
  } else if (error.type === "entity.too.large") {
    status = 413;
    message = "Request body is too large.";
  } else if (error.type === "entity.parse.failed") {
    status = 400;
    message = "Request body contains invalid JSON.";
  }

  res.status(status).json({ message });
});

// Start server
app.listen(PORT, () => {
  console.log(`EduFlow server is running on http://localhost:${PORT}`);
});
