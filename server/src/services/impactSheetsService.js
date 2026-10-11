const { google } = require("googleapis");
const ImpactEvent = require("../models/ImpactEvent");
const StudentImpact = require("../models/StudentImpact");

const EVENTS_SHEET_NAME =
  process.env.GOOGLE_SHEETS_EVENTS_SHEET_NAME || "Events & Initiatives";
const STUDENTS_SHEET_NAME =
  process.env.GOOGLE_SHEETS_STUDENTS_SHEET_NAME || "Student Impact";

const EVENTS_HEADERS = [
  "Event / Initiative Title",
  "Type",
  "Start Date",
  "End Date",
  "My Role",
  "Responsibilities",
  "Contributions",
  "Participants Count",
  "Participant Details",
  "Outcomes",
  "Achievements",
  "Evidence Links Count",
  "Google Drive Evidence Links",
  "Private",
  "Sync ID",
];

const STUDENTS_HEADERS = [
  "Student Name",
  "Batch / Cohort",
  "Date",
  "Initial Challenge",
  "How I Helped",
  "Achievement",
  "Private",
  "Evidence Links Count",
  "Google Drive Evidence Links",
  "Sync ID",
];

const isGoogleSheetsConfigured = () => {
  return !!(
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
    process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY &&
    process.env.GOOGLE_SHEETS_SPREADSHEET_ID
  );
};

const getSheetsClient = () => {
  if (!isGoogleSheetsConfigured()) {
    throw new Error("Google Sheets credentials are not configured in environment");
  }

  const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY.replace(
    /\\n/g,
    "\n",
  );

  const auth = new google.auth.JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: privateKey,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  return google.sheets({
    version: "v4",
    auth,
  });
};

const formatDate = (dateInput) => {
  if (!dateInput) return "";
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return "";
  return d.toISOString().split("T")[0];
};

/**
 * Ensure a specific tab exists with the specified header columns
 */
const ensureSheetTabWithHeaders = async (sheetName, headers) => {
  const sheets = getSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;

  const metadata = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: "sheets.properties",
  });

  let sheet = metadata.data.sheets?.find(
    (s) => s.properties.title === sheetName,
  );

  if (!sheet) {
    const addRes = await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      resource: {
        requests: [
          {
            addSheet: {
              properties: {
                title: sheetName,
              },
            },
          },
        ],
      },
    });
    sheet = addRes.data.replies?.[0]?.addSheet;
  }

  // Check header row (A1 to last column)
  const lastColLetter = String.fromCharCode(65 + headers.length - 1);
  const getRes = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `'${sheetName}'!A1:${lastColLetter}1`,
  });

  const existingHeaders = getRes.data.values?.[0];
  const isMatch =
    Array.isArray(existingHeaders) &&
    existingHeaders.length === headers.length &&
    headers.every((h, i) => existingHeaders[i] === h);

  if (!isMatch) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `'${sheetName}'!A1:${lastColLetter}1`,
      valueInputOption: "USER_ENTERED",
      resource: {
        values: [headers],
      },
    });
  }

  return sheet?.properties?.sheetId;
};

/**
 * Format an ImpactEvent into a Google Sheets row
 * Includes Google Drive evidence links with optional descriptions
 */
const formatEventRow = (event) => {
  const evidenceLinks = Array.isArray(event.evidenceLinks)
    ? event.evidenceLinks
    : [];
  const attachments = Array.isArray(event.attachments)
    ? event.attachments
    : [];
  const totalEvidenceCount = evidenceLinks.length + attachments.length;

  const linkSummaries = [
    ...evidenceLinks.map((l) =>
      l.description ? `${l.description}: ${l.url}` : l.url,
    ),
    ...attachments.map((a) =>
      a.originalName ? `${a.originalName} (${a.fileType || "File"})` : a.url || "",
    ),
  ]
    .filter(Boolean)
    .join("\n");

  return [
    event.title || "",
    event.eventType || "",
    formatDate(event.startDate),
    formatDate(event.endDate),
    event.myRole || "",
    event.responsibilities || "",
    event.contributions || "",
    event.participantsCount !== undefined ? event.participantsCount : 0,
    event.participantDetails || "",
    event.outcomes || "",
    event.achievements || "",
    totalEvidenceCount,
    linkSummaries,
    event.isPrivate ? "Yes" : "No",
    event._id ? event._id.toString() : "",
  ];
};

/**
 * Format a StudentImpact into a Google Sheets row
 */
const formatStudentRow = (student) => {
  const evidenceLinks = Array.isArray(student.evidenceLinks)
    ? student.evidenceLinks
    : [];
  const attachments = Array.isArray(student.attachments)
    ? student.attachments
    : [];
  const totalEvidenceCount = evidenceLinks.length + attachments.length;

  const linkSummaries = [
    ...evidenceLinks.map((l) =>
      l.description ? `${l.description}: ${l.url}` : l.url,
    ),
    ...attachments.map((a) =>
      a.originalName ? `${a.originalName} (${a.fileType || "File"})` : a.url || "",
    ),
  ]
    .filter(Boolean)
    .join("\n");

  return [
    student.studentName || "",
    student.studentBatch || "",
    formatDate(student.date),
    student.initialChallenge || "",
    student.howIHelped || "",
    student.achievement || "",
    student.isPrivate ? "Yes" : "No",
    totalEvidenceCount,
    linkSummaries,
    student._id ? student._id.toString() : "",
  ];
};

/**
 * Find existing row index by Sync ID to prevent duplicates
 */
const findRowBySyncId = async (sheetName, syncId, idColLetter = "O") => {
  try {
    const sheets = getSheetsClient();
    const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;

    const res = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `'${sheetName}'!${idColLetter}2:${idColLetter}`,
    });

    const values = res.data.values || [];
    for (let i = 0; i < values.length; i++) {
      if (values[i] && values[i][0] === syncId) {
        return i + 2; // Row number (2-indexed due to header)
      }
    }
    return null;
  } catch (err) {
    console.error("Error finding row by Sync ID:", err.message);
    return null;
  }
};

/**
 * Synchronize ImpactEvent to Google Sheets with duplicate prevention
 */
const syncEventToSheets = async (eventId) => {
  if (!isGoogleSheetsConfigured()) {
    await ImpactEvent.findByIdAndUpdate(eventId, {
      googleSheetSyncStatus: "failed",
      googleSheetSyncError: "Google Sheets credentials not configured",
    });
    return;
  }

  try {
    const event = await ImpactEvent.findById(eventId);
    if (!event) return;

    await ensureSheetTabWithHeaders(EVENTS_SHEET_NAME, EVENTS_HEADERS);
    const sheets = getSheetsClient();
    const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;

    // Check if row already exists by stored row number or Sync ID
    let targetRow = event.googleSheetRowNumber;
    if (!targetRow) {
      targetRow = await findRowBySyncId(
        EVENTS_SHEET_NAME,
        event._id.toString(),
        "O",
      );
    }

    const rowData = formatEventRow(event);

    if (targetRow && targetRow >= 2) {
      // Update existing row
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `'${EVENTS_SHEET_NAME}'!A${targetRow}:O${targetRow}`,
        valueInputOption: "USER_ENTERED",
        resource: {
          values: [rowData],
        },
      });

      await ImpactEvent.findByIdAndUpdate(eventId, {
        googleSheetRowNumber: targetRow,
        googleSheetSyncStatus: "synced",
        googleSheetLastSyncedAt: new Date(),
        googleSheetSyncError: null,
      });
    } else {
      // Append new row
      const appendRes = await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: `'${EVENTS_SHEET_NAME}'!A:O`,
        valueInputOption: "USER_ENTERED",
        insertDataOption: "INSERT_ROWS",
        resource: {
          values: [rowData],
        },
      });

      const updatedRange = appendRes.data.updates?.updatedRange;
      let newRowNumber = null;
      if (updatedRange) {
        const cellPart = updatedRange.includes("!")
          ? updatedRange.split("!").pop()
          : updatedRange;
        const match = cellPart.match(/^[A-Za-z]+(\d+)/);
        if (match) newRowNumber = Number(match[1]);
      }

      await ImpactEvent.findByIdAndUpdate(eventId, {
        googleSheetRowNumber: newRowNumber,
        googleSheetSyncStatus: "synced",
        googleSheetLastSyncedAt: new Date(),
        googleSheetSyncError: null,
      });
    }
  } catch (err) {
    console.error("ImpactEvent Google Sheets sync failed:", err.message);
    await ImpactEvent.findByIdAndUpdate(eventId, {
      googleSheetSyncStatus: "failed",
      googleSheetSyncError: err.message,
      $inc: { googleSheetSyncRetryCount: 1 },
    });
  }
};

/**
 * Delete ImpactEvent row from Google Sheets and decrement higher rows
 */
const deleteEventFromSheets = async (rowNumber) => {
  if (!isGoogleSheetsConfigured() || !rowNumber || rowNumber < 2) return;

  try {
    const sheets = getSheetsClient();
    const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;

    const metadata = await sheets.spreadsheets.get({
      spreadsheetId,
      fields: "sheets.properties",
    });

    const sheet = metadata.data.sheets?.find(
      (s) => s.properties.title === EVENTS_SHEET_NAME,
    );
    if (!sheet) return;

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      resource: {
        requests: [
          {
            deleteDimension: {
              range: {
                sheetId: sheet.properties.sheetId,
                dimension: "ROWS",
                startIndex: rowNumber - 1,
                endIndex: rowNumber,
              },
            },
          },
        ],
      },
    });

    // Decrement higher row numbers in MongoDB
    await ImpactEvent.updateMany(
      { googleSheetRowNumber: { $gt: rowNumber } },
      { $inc: { googleSheetRowNumber: -1 } },
    );
  } catch (err) {
    console.error("ImpactEvent row delete failed:", err.message);
  }
};

/**
 * Synchronize StudentImpact to Google Sheets with duplicate prevention
 */
const syncStudentToSheets = async (studentId) => {
  if (!isGoogleSheetsConfigured()) {
    await StudentImpact.findByIdAndUpdate(studentId, {
      googleSheetSyncStatus: "failed",
      googleSheetSyncError: "Google Sheets credentials not configured",
    });
    return;
  }

  try {
    const student = await StudentImpact.findById(studentId);
    if (!student) return;

    await ensureSheetTabWithHeaders(STUDENTS_SHEET_NAME, STUDENTS_HEADERS);
    const sheets = getSheetsClient();
    const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;

    let targetRow = student.googleSheetRowNumber;
    if (!targetRow) {
      targetRow = await findRowBySyncId(
        STUDENTS_SHEET_NAME,
        student._id.toString(),
        "J",
      );
    }

    const rowData = formatStudentRow(student);

    if (targetRow && targetRow >= 2) {
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `'${STUDENTS_SHEET_NAME}'!A${targetRow}:J${targetRow}`,
        valueInputOption: "USER_ENTERED",
        resource: {
          values: [rowData],
        },
      });

      await StudentImpact.findByIdAndUpdate(studentId, {
        googleSheetRowNumber: targetRow,
        googleSheetSyncStatus: "synced",
        googleSheetLastSyncedAt: new Date(),
        googleSheetSyncError: null,
      });
    } else {
      const appendRes = await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: `'${STUDENTS_SHEET_NAME}'!A:J`,
        valueInputOption: "USER_ENTERED",
        insertDataOption: "INSERT_ROWS",
        resource: {
          values: [rowData],
        },
      });

      const updatedRange = appendRes.data.updates?.updatedRange;
      let newRowNumber = null;
      if (updatedRange) {
        const cellPart = updatedRange.includes("!")
          ? updatedRange.split("!").pop()
          : updatedRange;
        const match = cellPart.match(/^[A-Za-z]+(\d+)/);
        if (match) newRowNumber = Number(match[1]);
      }

      await StudentImpact.findByIdAndUpdate(studentId, {
        googleSheetRowNumber: newRowNumber,
        googleSheetSyncStatus: "synced",
        googleSheetLastSyncedAt: new Date(),
        googleSheetSyncError: null,
      });
    }
  } catch (err) {
    console.error("StudentImpact Google Sheets sync failed:", err.message);
    await StudentImpact.findByIdAndUpdate(studentId, {
      googleSheetSyncStatus: "failed",
      googleSheetSyncError: err.message,
      $inc: { googleSheetSyncRetryCount: 1 },
    });
  }
};

/**
 * Delete StudentImpact row from Google Sheets and decrement higher rows
 */
const deleteStudentFromSheets = async (rowNumber) => {
  if (!isGoogleSheetsConfigured() || !rowNumber || rowNumber < 2) return;

  try {
    const sheets = getSheetsClient();
    const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;

    const metadata = await sheets.spreadsheets.get({
      spreadsheetId,
      fields: "sheets.properties",
    });

    const sheet = metadata.data.sheets?.find(
      (s) => s.properties.title === STUDENTS_SHEET_NAME,
    );
    if (!sheet) return;

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      resource: {
        requests: [
          {
            deleteDimension: {
              range: {
                sheetId: sheet.properties.sheetId,
                dimension: "ROWS",
                startIndex: rowNumber - 1,
                endIndex: rowNumber,
              },
            },
          },
        ],
      },
    });

    await StudentImpact.updateMany(
      { googleSheetRowNumber: { $gt: rowNumber } },
      { $inc: { googleSheetRowNumber: -1 } },
    );
  } catch (err) {
    console.error("StudentImpact row delete failed:", err.message);
  }
};

module.exports = {
  EVENTS_SHEET_NAME,
  STUDENTS_SHEET_NAME,
  isGoogleSheetsConfigured,
  syncEventToSheets,
  deleteEventFromSheets,
  syncStudentToSheets,
  deleteStudentFromSheets,
};
