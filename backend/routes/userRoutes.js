const express = require("express");

const { getUsers, changeUserStatus } = require("../controllers/userController");

const {
  authenticateToken,
  authorizeRoles,
} = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/", authenticateToken, authorizeRoles("Admin"), getUsers);

router.patch(
  "/:id/status",
  authenticateToken,
  authorizeRoles("Admin"),
  changeUserStatus,
);

module.exports = router;
