const fs = require("fs/promises");
const path = require("path");
const { hasExpectedFileSignature } = require("../utils/uploadValidation");

async function verifyUploadedFiles(req, res, next) {
  const files = req.files || (req.file ? [req.file] : []);

  try {
    for (const file of files) {
      if (!(await hasExpectedFileSignature(file))) {
        await Promise.all(
          files.map(async (uploadedFile) => {
            await fs.unlink(uploadedFile.path);
            await fs.rmdir(path.dirname(uploadedFile.path)).catch((error) => {
              if (error.code !== "ENOENT" && error.code !== "ENOTEMPTY") {
                throw error;
              }
            });
          }),
        );
        return res.status(400).json({
          message: "The uploaded file contents do not match a supported file type.",
        });
      }
    }

    return next();
  } catch (error) {
    await Promise.all(
      files.map((file) =>
        fs.unlink(file.path)
          .then(() =>
            fs.rmdir(path.dirname(file.path)).catch((cleanupError) => {
              if (
                cleanupError.code !== "ENOENT" &&
                cleanupError.code !== "ENOTEMPTY"
              ) {
                console.error(
                  "Failed to remove invalid upload directory:",
                  cleanupError.message,
                );
              }
            }),
          )
          .catch((cleanupError) => {
            if (cleanupError.code !== "ENOENT") {
              console.error(
                "Failed to remove invalid upload:",
                cleanupError.message,
              );
            }
          }),
      ),
    );
    return next(error);
  }
}

module.exports = verifyUploadedFiles;
