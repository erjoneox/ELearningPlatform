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

async function createCategory(req, res) {
  const { name, description } = req.body;

  if (typeof name !== "string" || !name.trim() || name.trim().length > 100) {
    return res.status(400).json({
      message: "A category name of 1 to 100 characters is required.",
    });
  }

  if (description != null && typeof description !== "string") {
    return res.status(400).json({
      message: "Category description must be text.",
    });
  }

  try {
    const category = await categoryModel.createCategory(
      name.trim(),
      description?.trim() || "",
    );

    if (!category) {
      return res.status(409).json({
        message: "A category with this name already exists.",
      });
    }

    return res.status(201).json({
      message: "Category created successfully.",
      category,
    });
  } catch (error) {
    console.error("Create category error:", error);

    return res.status(500).json({
      message: "The category could not be created.",
    });
  }
}

module.exports = {
  getCategories,
  createCategory,
};
