const fs = require("fs/promises");
const path = require("path");

const supportedExtensions = new Set([
  ".pdf",
  ".doc",
  ".docx",
  ".ppt",
  ".pptx",
  ".jpg",
  ".jpeg",
  ".png",
]);

const oleSignature = Buffer.from([
  0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1,
]);
const pngSignature = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);

function isSupportedUploadExtension(file) {
  const extension = path.extname(file.originalname).toLowerCase();
  return supportedExtensions.has(extension);
}

async function hasExpectedFileSignature(file) {
  const extension = path.extname(file.originalname).toLowerCase();
  const handle = await fs.open(file.path, "r");

  try {
    const header = Buffer.alloc(8);
    const { bytesRead } = await handle.read(header, 0, header.length, 0);
    const signature = header.subarray(0, bytesRead);

    switch (extension) {
      case ".pdf":
        return signature.subarray(0, 5).toString() === "%PDF-";
      case ".doc":
      case ".ppt":
        return (
          signature.length >= oleSignature.length &&
          signature.subarray(0, oleSignature.length).equals(oleSignature)
        );
      case ".docx":
      case ".pptx":
        return (
          signature[0] === 0x50 &&
          signature[1] === 0x4b &&
          signature[2] === 0x03 &&
          signature[3] === 0x04
        );
      case ".jpg":
      case ".jpeg":
        return (
          signature[0] === 0xff &&
          signature[1] === 0xd8 &&
          signature[2] === 0xff
        );
      case ".png":
        return (
          signature.length >= pngSignature.length &&
          signature.subarray(0, pngSignature.length).equals(pngSignature)
        );
      default:
        return false;
    }
  } finally {
    await handle.close();
  }
}

module.exports = { hasExpectedFileSignature, isSupportedUploadExtension };
