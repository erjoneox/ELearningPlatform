const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { findUserByEmail, createUser } = require("../models/userModel");

async function register(req, res) {
  try {
    const { firstName, lastName, email, password } = req.body;

    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({
        message: "All fields are required.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    if (password.length < 8) {
      return res.status(400).json({
        message: "Password must contain at least 8 characters.",
      });
    }

    const existingUser = await findUserByEmail(normalizedEmail);

    if (existingUser) {
      return res.status(409).json({
        message: "An account with this email already exists.",
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await createUser(
      firstName.trim(),
      lastName.trim(),
      normalizedEmail,
      passwordHash,
    );

    return res.status(201).json({
      message: "Registration successful.",
      user,
    });
  } catch (error) {
    console.error("Registration error:", error.message);

    return res.status(500).json({
      message: "Registration failed.",
    });
  }
}

async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await findUserByEmail(normalizedEmail);

    if (!user) {
      return res.status(401).json({
        message: "Invalid email or password.",
      });
    }

    if (user.Status !== "Active") {
      return res.status(403).json({
        message: "This account is not active.",
      });
    }

    const passwordMatches = await bcrypt.compare(password, user.PasswordHash);

    if (!passwordMatches) {
      return res.status(401).json({
        message: "Invalid email or password.",
      });
    }

    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET is not configured.");
    }

    const token = jwt.sign(
      {
        userId: user.UserID,
        role: user.Role,
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "1h" },
    );

    return res.status(200).json({
      message: "Login successful.",
      token,
      user: {
        userId: user.UserID,
        firstName: user.FirstName,
        lastName: user.LastName,
        email: user.Email,
        role: user.Role,
      },
    });
  } catch (error) {
    console.error("Login error:", error.message);

    return res.status(500).json({
      message: "Login failed.",
    });
  }
}

module.exports = { register, login };
