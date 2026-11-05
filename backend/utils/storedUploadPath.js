const fs = require("fs/promises");
const path = require("path");

function resolveStoredUploadPath(fileReference, uploadDirectory) {
  if (typeof fileReference !== "string" || !fileReference.trim()) {
    return null;
  }

  const directory = path.resolve(uploadDirectory);
  const directoryName = path
    .basename(directory)
    .replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const normalizedReference = fileReference.replace(/\\/g, "/");
  const prefixPattern = new RegExp(`^(?:/)?uploads/${directoryName}/`, "i");
  const relativeReference = normalizedReference.replace(prefixPattern, "");
  const segments = relativeReference.split("/");

  if (
    !relativeReference ||
    segments.some(
      (segment) => !segment || segment === "." || segment === "..",
    )
  ) {
    return null;
  }

  const filePath = path.resolve(directory, ...segments);
  const relativePath = path.relative(directory, filePath);

  if (
    !relativePath ||
    relativePath.startsWith(`..${path.sep}`) ||
    relativePath === ".." ||
    path.isAbsolute(relativePath)
  ) {
    return null;
  }

  return filePath;
}

async function removeStoredUploadFile(fileReference, uploadDirectory) {
  const filePath = resolveStoredUploadPath(fileReference, uploadDirectory);
  if (!filePath) return false;

  try {
    await fs.unlink(filePath);
  } catch (error) {
    if (error.code !== "ENOENT") return false;
  }

  const parentDirectory = path.dirname(filePath);
  if (parentDirectory !== path.resolve(uploadDirectory)) {
    try {
      await fs.rmdir(parentDirectory);
    } catch (error) {
      if (error.code !== "ENOENT" && error.code !== "ENOTEMPTY") return false;
    }
  }

  return true;
}

module.exports = { removeStoredUploadFile, resolveStoredUploadPath };
