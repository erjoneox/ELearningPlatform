const express = require("express");
const router = express.Router();

const {
  getCategories,
  createCategory,
} = require("../controllers/categoryController");
const {
  authenticateToken,
  authorizeRoles,
} = require("../middleware/authMiddleware");

router.get("/", getCategories);
router.post(
  "/",
  authenticateToken,
  authorizeRoles("Admin"),
  createCategory,
);

module.exports = router;
