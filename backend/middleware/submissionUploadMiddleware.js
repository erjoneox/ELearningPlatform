const multer = require("multer");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const { isSupportedUploadExtension } = require("../utils/uploadValidation");

const uploadDirectory = path.join(__dirname, "../uploads/submissions");
const allowedExtensions = new Set([".pdf", ".doc", ".docx", ".ppt", ".pptx"]);

fs.mkdirSync(uploadDirectory, { recursive: true });

function getSafeOriginalFilename(originalname) {
  const normalizedName = originalname.replace(/\\/g, "/").split("/").pop();
  const sanitizedName = normalizedName
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, "_")
    .replace(/[. ]+$/g, "")
    .trim();
  const extension = path.extname(sanitizedName);
  const baseName = path.basename(sanitizedName, extension);
  const safeName = `${baseName.slice(0, 170)}${extension.slice(0, 10)}`;

  return safeName &&
    !/^(con|prn|aux|nul|com[0-9]|lpt[0-9])(?:\.|$)/i.test(safeName)
    ? safeName
    : `submission${extension.toLowerCase()}`;
}

const storage = multer.diskStorage({
  destination: (req, file, callback) => {
    const fileDirectory = path.join(
      uploadDirectory,
      crypto.randomBytes(16).toString("hex"),
    );

    fs.mkdir(fileDirectory, { recursive: false }, (error) => {
      callback(error, fileDirectory);
    });
  },

  filename: (req, file, callback) => {
    callback(null, getSafeOriginalFilename(file.originalname));
  },
});

const upload = multer({
  storage,

  limits: {
    fileSize: 10 * 1024 * 1024,
    files: 10,
    parts: 12,
    fieldSize: 1024 * 1024,
  },

  fileFilter: (req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();
    if (!allowedExtensions.has(extension) || !isSupportedUploadExtension(file)) {
      const error = new Error(
        "Unsupported file extension. PDF, DOC, DOCX, PPT, and PPTX are allowed.",
      );
      error.status = 400;
      return callback(error);
    }

    callback(null, true);
  },
});

module.exports = upload;
