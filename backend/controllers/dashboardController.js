const dashboardModel = require("../models/dashboardModel");

async function getDashboard(req, res) {
  try {
    let dashboard;

    switch (req.user.role) {
      case "Admin":
        dashboard = await dashboardModel.getAdminDashboard();
        break;

      case "Instructor":
        dashboard = await dashboardModel.getInstructorDashboard(
          req.user.userId,
        );
        break;

      case "Student":
        dashboard = await dashboardModel.getStudentDashboard(req.user.userId);
        break;

      default:
        return res.status(403).json({
          message: "Roli nuk ka qasje në dashboard.",
        });
    }

    return res.status(200).json({
      role: req.user.role,
      ...dashboard,
    });
  } catch (error) {
    console.error("Dashboard error:", error);

    return res.status(500).json({
      message: "Nuk u arrit të merren statistikat e dashboard-it.",
    });
  }
}

module.exports = { getDashboard };
