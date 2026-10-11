const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const LOCAL_UPLOAD_DIR = path.join(__dirname, "../../uploads/impact");

// Ensure local upload directory exists
if (!fs.existsSync(LOCAL_UPLOAD_DIR)) {
  fs.mkdirSync(LOCAL_UPLOAD_DIR, { recursive: true });
}

/**
 * Determine high-level category of uploaded file
 */
const categorizeFile = (originalName = "", mimeType = "") => {
  const lowerName = originalName.toLowerCase();
  const lowerMime = mimeType.toLowerCase();

  if (
    lowerName.includes("certificate") ||
    lowerName.includes("cert") ||
    lowerName.includes("award")
  ) {
    return "Certificate";
  }
  if (
    lowerName.includes("screenshot") ||
    lowerName.includes("screen_shot") ||
    lowerName.includes("capture")
  ) {
    return "Screenshot";
  }
  if (lowerName.includes("report") || lowerName.includes("appraisal")) {
    return "Report";
  }
  if (
    lowerMime.startsWith("image/") ||
    /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(lowerName)
  ) {
    return "Photo";
  }
  if (lowerMime === "application/pdf" || lowerName.endsWith(".pdf")) {
    return "PDF";
  }
  return "Other";
};

/**
 * Upload file to Local Disk (fallback only; primary evidence is now Google Drive links)
 */
const uploadImpactFile = async (file, categoryHint = null) => {
  if (!file || !file.buffer) {
    throw new Error("Invalid file upload payload");
  }

  const fileId = crypto.randomUUID();
  const ext = path.extname(file.originalname) || "";
  const sanitizedBase = path
    .basename(file.originalname, ext)
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .substring(0, 50);
  const storedFileName = `${Date.now()}-${fileId.substring(0, 8)}-${sanitizedBase}${ext}`;
  const fileType = categoryHint || categorizeFile(file.originalname, file.mimetype);

  const localFilePath = path.join(LOCAL_UPLOAD_DIR, storedFileName);
  await fs.promises.writeFile(localFilePath, file.buffer);

  return {
    fileId,
    fileName: storedFileName,
    originalName: file.originalname,
    fileType,
    mimeType: file.mimetype,
    fileSize: file.size || file.buffer.length,
    storageProvider: "local",
    storageKey: storedFileName,
    url: `/api/impact/files/${fileId}`,
    uploadedAt: new Date(),
  };
};

/**
 * Retrieve file stream and metadata for downloading or streaming
 */
const getFileStream = async (attachment) => {
  const localPath = path.join(LOCAL_UPLOAD_DIR, attachment.storageKey || "");
  if (!fs.existsSync(localPath)) {
    throw new Error("File not found on server");
  }

  const stat = await fs.promises.stat(localPath);
  const stream = fs.createReadStream(localPath);

  return {
    stream,
    mimeType: attachment.mimeType || "application/octet-stream",
    contentLength: stat.size,
    originalName: attachment.originalName,
  };
};

/**
 * Delete file from local storage
 */
const deleteImpactFile = async (attachment) => {
  try {
    const localPath = path.join(LOCAL_UPLOAD_DIR, attachment.storageKey || "");
    if (fs.existsSync(localPath)) {
      await fs.promises.unlink(localPath);
    }
    return true;
  } catch (err) {
    console.error("Error deleting impact file:", err.message);
    return false;
  }
};

module.exports = {
  categorizeFile,
  uploadImpactFile,
  getFileStream,
  deleteImpactFile,
};
