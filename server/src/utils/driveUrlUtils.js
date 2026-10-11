/**
 * Utility to validate and classify Google Drive and web evidence URLs
 */

const validateAndClassifyDriveUrl = (url, description = "") => {
  if (!url || typeof url !== "string") {
    return {
      isValid: false,
      error: "URL is required",
    };
  }

  const trimmed = url.trim();

  // Validate basic web URL
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return {
        isValid: false,
        error: "URL must begin with http:// or https://",
      };
    }
  } catch (err) {
    return {
      isValid: false,
      error: "Invalid URL format. Please provide a valid web address (e.g. https://drive.google.com/...)",
    };
  }

  const lower = trimmed.toLowerCase();
  let driveType = "other";
  let title = description ? description.trim() : "";

  if (
    lower.includes("drive.google.com/drive/folders/") ||
    lower.includes("drive.google.com/drive/u/") ||
    lower.includes("drive.google.com/folders/")
  ) {
    driveType = "folder";
    if (!title) title = "Google Drive Folder";
  } else if (lower.includes("docs.google.com/document/")) {
    driveType = "docs";
    if (!title) title = "Google Doc";
  } else if (lower.includes("docs.google.com/spreadsheets/")) {
    driveType = "sheets";
    if (!title) title = "Google Sheet";
  } else if (lower.includes("docs.google.com/presentation/")) {
    driveType = "slides";
    if (!title) title = "Google Slides";
  } else if (
    lower.includes("drive.google.com/file/") ||
    lower.includes("drive.google.com/open") ||
    lower.includes("drive.google.com/uc")
  ) {
    driveType = "file";
    if (!title) title = "Google Drive File";
  } else if (lower.includes("drive.google.com")) {
    driveType = "folder";
    if (!title) title = "Google Drive";
  } else {
    driveType = "other";
    if (!title) title = "Evidence Link";
  }

  const isGoogleDrive =
    lower.includes("drive.google.com") || lower.includes("docs.google.com");

  return {
    isValid: true,
    url: trimmed,
    description: description ? description.trim() : "",
    title,
    driveType,
    isGoogleDrive,
  };
};

module.exports = {
  validateAndClassifyDriveUrl,
};
