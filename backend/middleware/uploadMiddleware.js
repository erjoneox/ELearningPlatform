const multer = require("multer");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const { isSupportedUploadExtension } = require("../utils/uploadValidation");

const uploadDirectory = path.join(__dirname, "../uploads/materials");

fs.mkdirSync(uploadDirectory, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, callback) => {
    callback(null, uploadDirectory);
  },

  filename: (req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();
    const uniqueName = `${Date.now()}-${crypto.randomBytes(8).toString("hex")}${extension}`;

    callback(null, uniqueName);
  },
});

const upload = multer({
  storage,

  limits: {
    fileSize: 10 * 1024 * 1024,
  },

  fileFilter: (req, file, callback) => {
    if (!isSupportedUploadExtension(file)) {
      const error = new Error("Unsupported file type.");
      error.status = 400;
      return callback(error);
    }

    callback(null, true);
  },
});

module.exports = upload;
