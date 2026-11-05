const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const {
  hasExpectedFileSignature,
  isSupportedUploadExtension,
} = require("../utils/uploadValidation");

test("accepts a PDF based on its content signature regardless of browser MIME type", async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "eduflow-upload-"));
  const file = {
    originalname: "assignment.pdf",
    mimetype: "application/x-pdf",
    path: path.join(directory, "assignment.pdf"),
  };

  try {
    await fs.writeFile(file.path, Buffer.from("%PDF-1.7\nsample"));
    assert.equal(isSupportedUploadExtension(file), true);
    assert.equal(await hasExpectedFileSignature(file), true);
    await fs.writeFile(file.path, Buffer.from("not a PDF"));
    assert.equal(await hasExpectedFileSignature(file), false);
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
});

test("accepts only supported filename extensions", () => {
  assert.equal(
    isSupportedUploadExtension({
      originalname: "assignment.exe",
    }),
    false,
  );
  assert.equal(
    isSupportedUploadExtension({
      originalname: "assignment.PDF",
    }),
    true,
  );
});
