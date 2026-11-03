const bcrypt = require("bcrypt");
const {
  getAllUsers,
  getUserById,
  updateUserStatus,
  updateUser,
  deactivateUser,
} = require("../models/userModel");

async function getUsers(req, res) {
  try {
    const users = await getAllUsers();

    return res.status(200).json({
      message: "Users retrieved successfully.",
      users,
    });
  } catch (error) {
    console.error("Get users error:", error.message);

    return res.status(500).json({
      message: "Failed to retrieve users.",
    });
  }
}

async function changeUserStatus(req, res) {
  try {
    const userId = Number(req.params.id);
    const { status } = req.body;

    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(400).json({
        message: "Invalid user ID.",
      });
    }

    if (!["Active", "Inactive"].includes(status)) {
      return res.status(400).json({
        message: "Status must be Active or Inactive.",
      });
    }

    if (userId === req.user.userId) {
      return res.status(400).json({
        message: "You cannot change your own account status.",
      });
    }

    const user = await updateUserStatus(userId, status);

    if (!user) {
      return res.status(404).json({
        message: "User not found.",
      });
    }

    return res.status(200).json({
      message: "User status updated successfully.",
      user,
    });
  } catch (error) {
    console.error("Update user status error:", error.message);

    return res.status(500).json({
      message: "Failed to update user status.",
    });
  }
}

async function editUser(req, res) {
  try {
    const userId = Number(req.params.id);
    const { firstName, lastName, email, role, status, password } = req.body;

    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(400).json({ message: "Invalid user ID." });
    }

    if (
      typeof firstName !== "string" ||
      !firstName.trim() ||
      typeof lastName !== "string" ||
      !lastName.trim() ||
      typeof email !== "string" ||
      !email.trim() ||
      !["Admin", "Instructor", "Student"].includes(role) ||
      !["Active", "Inactive"].includes(status) ||
      (password != null && (typeof password !== "string" || password.length < 8))
    ) {
      return res.status(400).json({
        message:
          "Valid name, email, role, status and (if provided) an 8-character password are required.",
      });
    }

    const existingUser = await getUserById(userId);

    if (!existingUser) {
      return res.status(404).json({ message: "User not found." });
    }

    if (
      userId === Number(req.user.userId) &&
      (role !== existingUser.Role || status !== existingUser.Status)
    ) {
      return res.status(400).json({
        message: "You cannot change your own role or account status.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const passwordHash = password
      ? await bcrypt.hash(password, 12)
      : null;
    const user = await updateUser(userId, {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: normalizedEmail,
      role,
      status,
      passwordHash,
    });

    return res.status(200).json({
      message: "User updated successfully.",
      user,
    });
  } catch (error) {
    if (error.number === 2601 || error.number === 2627) {
      return res.status(409).json({
        message: "An account with this email already exists.",
      });
    }

    console.error("Update user error:", error.message);
    return res.status(500).json({ message: "Failed to update user." });
  }
}

async function removeUser(req, res) {
  try {
    const userId = Number(req.params.id);

    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(400).json({ message: "Invalid user ID." });
    }

    if (userId === Number(req.user.userId)) {
      return res.status(400).json({
        message: "You cannot deactivate your own account.",
      });
    }

    const user = await deactivateUser(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    return res.status(200).json({
      message: "User deactivated successfully.",
      user,
    });
  } catch (error) {
    console.error("Deactivate user error:", error.message);
    return res.status(500).json({ message: "Failed to deactivate user." });
  }
}

module.exports = {
  getUsers,
  changeUserStatus,
  editUser,
  removeUser,
};
