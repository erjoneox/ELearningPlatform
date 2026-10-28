const multer = require("multer");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

const uploadDirectory = path.join(__dirname, "../uploads/submissions");

fs.mkdirSync(uploadDirectory, { recursive: true });

const allowedExtensions = [".pdf", ".doc", ".docx", ".ppt", ".pptx"];

const storage = multer.diskStorage({
  destination: (req, file, callback) => {
    callback(null, uploadDirectory);
  },

  filename: (req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();

    const uniqueName = `${Date.now()}-${crypto
      .randomBytes(8)
      .toString("hex")}${extension}`;

    callback(null, uniqueName);
  },
});

const upload = multer({
  storage,

  limits: {
    fileSize: 10 * 1024 * 1024,
  },

  fileFilter: (req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();

    if (!allowedExtensions.includes(extension)) {
      return callback(
        new Error(
          "Formati i skedarit nuk mbështetet. Lejohen PDF, DOC, DOCX, PPT dhe PPTX.",
        ),
      );
    }

    callback(null, true);
  },
});

module.exports = upload;
