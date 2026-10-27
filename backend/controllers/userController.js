const { getAllUsers, updateUserStatus } = require("../models/userModel");

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

module.exports = {
  getUsers,
  changeUserStatus,
};
