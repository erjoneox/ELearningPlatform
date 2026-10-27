const express = require("express");

const { register, login } = require("../controllers/authController");

const {
  authenticateToken,
  authorizeRoles,
} = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/register", register);
router.post("/login", login);

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
