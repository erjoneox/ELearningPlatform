const express = require("express");
const router = express.Router();

const { getDashboard } = require("../controllers/dashboardController");

const {
  authenticateToken,
  authorizeRoles,
} = require("../middleware/authMiddleware");

router.get(
  "/",
  authenticateToken,
  authorizeRoles("Admin", "Instructor", "Student"),
  getDashboard,
);

module.exports = router;
