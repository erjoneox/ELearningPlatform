const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const http = require("node:http");
const path = require("node:path");
const express = require("express");
const test = require("node:test");
const submissionUpload = require("../middleware/submissionUploadMiddleware");
const verifyUploadedFiles = require("../middleware/verifyUploadedFiles");
const { resolveStoredUploadPath } = require("../utils/storedUploadPath");

test("accepts a single PDF multipart upload with a browser-specific MIME type", async () => {
  const app = express();
  app.post(
    "/submit",
    submissionUpload.array("files", 10),
    verifyUploadedFiles,
    async (req, res) => {
      try {
        const files = req.files.map((file) => ({
          filename: file.filename,
          directory: path.basename(path.dirname(file.path)),
        }));
        await Promise.all(
          req.files.map(async (file) => {
            await fs.unlink(file.path);
            await fs.rmdir(path.dirname(file.path));
          }),
        );
        res.status(200).json({ files });
      } catch (error) {
        res.status(500).json({ message: error.message });
      }
    },
  );

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));

  try {
    const form = new FormData();
    form.append(
      "files",
      new Blob(["%PDF-1.7\nsample"], { type: "application/x-pdf" }),
      "assignment.pdf",
    );

    const response = await fetch(
      `http://127.0.0.1:${server.address().port}/submit`,
      { method: "POST", body: form },
    );

    assert.equal(response.status, 200);
    const result = await response.json();
    assert.equal(result.files.length, 1);
    assert.equal(result.files[0].filename, "assignment.pdf");
    assert.match(result.files[0].directory, /^[a-f0-9]{32}$/);
  } finally {
    await new Promise((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
});

test("resolves original-name files and rejects path traversal", () => {
  const uploadDirectory = path.join(
    __dirname,
    "../uploads/submissions",
  );
  const storedPath = resolveStoredUploadPath(
    "/uploads/submissions/0123456789abcdef0123456789abcdef/my assignment.pdf",
    uploadDirectory,
  );

  assert.equal(path.basename(storedPath), "my assignment.pdf");
  assert.equal(
    resolveStoredUploadPath(
      "/uploads/submissions/../../outside.pdf",
      uploadDirectory,
    ),
    null,
  );
  assert.equal(
    path.basename(
      resolveStoredUploadPath(
        "/uploads/submissions/legacy-random-name.pdf",
        uploadDirectory,
      ),
    ),
    "legacy-random-name.pdf",
  );
});
