const categoryModel = require("../models/categoryModel");

async function getCategories(req, res) {
  try {
    const categories = await categoryModel.getAllCategories();

    res.json({ categories });
  } catch (error) {
    console.error("Get categories error:", error);

    res.status(500).json({
      message: "Nuk u arrit të ngarkohen kategoritë.",
    });
  }
}

module.exports = {
  getCategories,
};
