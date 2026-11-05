const express = require("express");
const { rateLimit } = require("express-rate-limit");

const { register, login } = require("../controllers/authController");

const {
  authenticateToken,
  authorizeRoles,
} = require("../middleware/authMiddleware");

const router = express.Router();
const loginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { message: "Too many login attempts. Please try again later." },
});

router.post("/register", authenticateToken, authorizeRoles("Admin"), register);
router.post("/login", loginRateLimit, login);

router.get("/me", authenticateToken, (req, res) => {
  res.json({
    message: "Authenticated successfully.",
    user: req.user,
  });
});

router.get(
  "/admin-test",
  authenticateToken,
  authorizeRoles("Admin"),
  (req, res) => {
    res.json({
      message: "Admin access granted.",
      user: req.user,
    });
  },
);

module.exports = router;
