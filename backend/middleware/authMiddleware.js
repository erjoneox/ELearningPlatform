const jwt = require("jsonwebtoken");
const sql = require("mssql");
const { connectDB } = require("../config/db");

async function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      message: "Authentication token is required.",
    });
  }

  const token = authHeader.split(" ")[1];

  try {
    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET is not configured.");
    }

    // Verify JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!decoded.userId) {
      return res.status(401).json({
        message: "Invalid authentication token.",
      });
    }

    // Verify current user information from database
    const pool = await connectDB();

    const result = await pool.request().input("userId", sql.Int, decoded.userId)
      .query(`
                SELECT UserID, Role, Status
                FROM Users
                WHERE UserID = @userId
            `);

    const user = result.recordset[0];

    // Check if user exists
    if (!user) {
      return res.status(401).json({
        message: "User account no longer exists.",
      });
    }

    // Check if account is active
    if (user.Status !== "Active") {
      return res.status(403).json({
        message: "Your account is inactive.",
      });
    }

    // Use current database role, not the old JWT role
    req.user = {
      userId: user.UserID,
      role: user.Role,
    };

    next();
  } catch (error) {
    if (
      error.name === "JsonWebTokenError" ||
      error.name === "TokenExpiredError"
    ) {
      return res.status(401).json({
        message: "Invalid or expired token.",
      });
    }

    console.error("Authentication error:", error.message);

    return res.status(500).json({
      message: "Authentication verification failed.",
    });
  }
}

function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        message: "Authentication required.",
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        message: "You do not have permission to access this resource.",
      });
    }

    next();
  };
}

module.exports = {
  authenticateToken,
  authorizeRoles,
};
