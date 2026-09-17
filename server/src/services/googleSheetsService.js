const { google } = require("googleapis");
const User = require("../models/User");
const {
  SHEET_HEADERS,
  formatWorkLogRow,
} = require("./googleSheetsFormatter");

const DEFAULT_WORK_LOG_TAB = "Work Logs";
const DEFAULT_MENTOR_LOG_TAB = "Mentor Logs";

const getSheetsClient = () => {
  const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(
    /\\n/g,
    "\n",
  );

  const auth = new google.auth.JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: privateKey,
    scopes: [
      "https://www.googleapis.com/auth/spreadsheets",
      "https://www.googleapis.com/auth/drive",
    ],
  });

  return google.sheets({
    version: "v4",
    auth,
  });
};

const getDriveClient = () => {
  const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(
    /\\n/g,
    "\n",
  );

  const auth = new google.auth.JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: privateKey,
    scopes: [
      "https://www.googleapis.com/auth/spreadsheets",
      "https://www.googleapis.com/auth/drive",
    ],
  });

  return google.drive({
    version: "v3",
    auth,
  });
};

const formatEnsuredSpreadsheets = new Set();

const resolveWorkLogSheetName = async (sheets, spreadsheetId) => {
  try {
    const metadata = await sheets.spreadsheets.get({
      spreadsheetId,
      fields: "sheets.properties.title",
    });
    const titles =
      metadata.data.sheets?.map((s) => s.properties.title) || [];

    if (
      process.env.GOOGLE_SHEETS_SHEET_NAME &&
      titles.includes(process.env.GOOGLE_SHEETS_SHEET_NAME)
    ) {
      return process.env.GOOGLE_SHEETS_SHEET_NAME;
    }
    if (titles.includes(DEFAULT_WORK_LOG_TAB)) {
      return DEFAULT_WORK_LOG_TAB;
    }
    return titles[0] || DEFAULT_WORK_LOG_TAB;
  } catch (err) {
    return process.env.GOOGLE_SHEETS_SHEET_NAME || DEFAULT_WORK_LOG_TAB;
  }
};

const ensureColumnFormatting = async (sheets, spreadsheetId, sheetName) => {
  const cacheKey = `${spreadsheetId}_${sheetName}`;
  if (formatEnsuredSpreadsheets.has(cacheKey)) return;

  try {
    const metadata = await sheets.spreadsheets.get({
      spreadsheetId,
      fields: "sheets.properties",
    });

    const sheet = metadata.data.sheets?.find(
      (item) => item.properties.title === sheetName,
    );

    if (!sheet) return;
    const sheetId = sheet.properties.sheetId;

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      resource: {
        requests: [
          {
            repeatCell: {
              range: {
                sheetId,
                startColumnIndex: 4, // Column E (Time From)
                endColumnIndex: 6,   // Column F (Time To)
                startRowIndex: 1,    // Row 2 downwards
              },
              cell: {
                userEnteredFormat: {
                  numberFormat: {
                    type: "TIME",
                    pattern: "hh:mm",
                  },
                },
              },
              fields: "userEnteredFormat.numberFormat",
            },
          },
        ],
      },
    });
    formatEnsuredSpreadsheets.add(cacheKey);
  } catch (err) {
    console.error("Error ensuring Google Sheets column formatting:", err.message);
  }
};

const ensureHeaderRow = async (spreadsheetId) => {
  if (!spreadsheetId) {
    throw new Error("Spreadsheet ID is required to ensure header row");
  }

  const sheets = getSheetsClient();
  const sheetName = await resolveWorkLogSheetName(sheets, spreadsheetId);

  // Check if the sheet exists, create if missing
  const metadata = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: "sheets.properties",
  });

  let sheet = metadata.data.sheets?.find(
    (s) => s.properties.title === sheetName,
  );

  if (!sheet) {
    await sheets.spreadsheets.batchUpdate({
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
  }

  const getRes = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `'${sheetName}'!A1:K1`,
  });

  const existingHeaders = getRes.data.values?.[0];

  const isMatch =
    Array.isArray(existingHeaders) &&
    existingHeaders.length === SHEET_HEADERS.length &&
    SHEET_HEADERS.every((h, i) => existingHeaders[i] === h);

  if (!isMatch) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `'${sheetName}'!A1:K1`,
      valueInputOption: "USER_ENTERED",
      resource: {
        values: [SHEET_HEADERS],
      },
    });
    await ensureColumnFormatting(sheets, spreadsheetId, sheetName);
  } else {
    await ensureColumnFormatting(sheets, spreadsheetId, sheetName);
  }

  return sheetName;
};

const appendWorkLog = async (spreadsheetId, workLog) => {
  if (!spreadsheetId) {
    throw new Error("Spreadsheet ID is required to append work log");
  }

  const sheetName = await ensureHeaderRow(spreadsheetId);
  const sheets = getSheetsClient();

  const response = await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `'${sheetName}'!A:K`,
    valueInputOption: "USER_ENTERED",
    insertDataOption: "INSERT_ROWS",
    resource: {
      values: [formatWorkLogRow(workLog)],
    },
  });

  return response.data;
};

const updateWorkLogRow = async (spreadsheetId, workLog, rowNumber) => {
  if (!spreadsheetId) {
    throw new Error("Spreadsheet ID is required to update work log row");
  }

  const sheetName = await ensureHeaderRow(spreadsheetId);
  const sheets = getSheetsClient();

  const range = `'${sheetName}'!A${rowNumber}:K${rowNumber}`;

  const response = await sheets.spreadsheets.values.update({
    spreadsheetId,
    range,
    valueInputOption: "USER_ENTERED",
    resource: {
      values: [formatWorkLogRow(workLog)],
    },
  });

  return response.data;
};

const deleteWorkLogRow = async (spreadsheetId, rowNumber) => {
  if (!spreadsheetId) {
    throw new Error("Spreadsheet ID is required to delete work log row");
  }

  const sheets = getSheetsClient();
  const sheetName = await resolveWorkLogSheetName(sheets, spreadsheetId);

  const metadata = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: "sheets.properties",
  });

  const sheet = metadata.data.sheets?.find(
    (item) => item.properties.title === sheetName,
  );

  if (!sheet) {
    throw new Error(`Sheet "${sheetName}" not found in spreadsheet ${spreadsheetId}`);
  }

  const sheetId = sheet.properties.sheetId;

  const response = await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    resource: {
      requests: [
        {
          deleteDimension: {
            range: {
              sheetId,
              dimension: "ROWS",
              startIndex: rowNumber - 1,
              endIndex: rowNumber,
            },
          },
        },
      ],
    },
  });

  return response.data;
};

const ensureSpreadsheetTabsAndHeaders = async (spreadsheetId) => {
  if (!spreadsheetId) return;

  const sheets = getSheetsClient();
  const metadata = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: "sheets.properties",
  });

  const existingTitles =
    metadata.data.sheets?.map((s) => s.properties.title) || [];

  const requests = [];

  if (!existingTitles.includes(DEFAULT_WORK_LOG_TAB)) {
    requests.push({
      addSheet: { properties: { title: DEFAULT_WORK_LOG_TAB } },
    });
  }

  if (!existingTitles.includes(DEFAULT_MENTOR_LOG_TAB)) {
    requests.push({
      addSheet: { properties: { title: DEFAULT_MENTOR_LOG_TAB } },
    });
  }

  if (requests.length > 0) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      resource: { requests },
    });
  }

  // If a default "Sheet1" exists alongside our tabs, delete Sheet1
  const refreshedMetadata = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: "sheets.properties",
  });
  const sheet1 = refreshedMetadata.data.sheets?.find(
    (s) => s.properties.title === "Sheet1",
  );
  if (
    sheet1 &&
    refreshedMetadata.data.sheets?.length > 1
  ) {
    try {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        resource: {
          requests: [
            {
              deleteSheet: {
                sheetId: sheet1.properties.sheetId,
              },
            },
          ],
        },
      });
    } catch (cleanErr) {
      // Non-fatal if Sheet1 cannot be removed
    }
  }

  // Ensure headers and formatting on Work Logs
  await ensureHeaderRow(spreadsheetId);
};

const createUserSpreadsheet = async (user) => {
  if (!user) {
    throw new Error("User is required to create dedicated spreadsheet");
  }

  const title = `Work Log - ${user.name || user.email}`;
  let spreadsheetId = null;

  try {
    if (process.env.GOOGLE_DRIVE_FOLDER_ID) {
      const drive = getDriveClient();
      const res = await drive.files.create({
        resource: {
          name: title,
          mimeType: "application/vnd.google-apps.spreadsheet",
          parents: [process.env.GOOGLE_DRIVE_FOLDER_ID],
        },
        supportsAllDrives: true,
        fields: "id",
      });
      spreadsheetId = res.data.id;
    } else {
      const sheets = getSheetsClient();
      const res = await sheets.spreadsheets.create({
        resource: {
          properties: {
            title,
          },
          sheets: [
            { properties: { title: DEFAULT_WORK_LOG_TAB } },
            { properties: { title: DEFAULT_MENTOR_LOG_TAB } },
          ],
        },
      });
      spreadsheetId = res.data.spreadsheetId;
    }

    if (!spreadsheetId) {
      throw new Error("Failed to obtain spreadsheet ID from Google Sheets API");
    }

    await ensureSpreadsheetTabsAndHeaders(spreadsheetId);
    return spreadsheetId;
  } catch (err) {
    console.error(`Error creating spreadsheet for user ${user.email}:`, err.message);
    const isQuotaError =
      err.message?.includes("storage quota") || err.code === 403;
    const detail = isQuotaError
      ? `Google API permission or storage quota error (${err.message}). Google Service Accounts have 0 personal storage quota in Google Drive. Configure GOOGLE_DRIVE_FOLDER_ID (pointing to a Shared Drive) or assign a pre-created Google Spreadsheet ID to user.spreadsheetId in MongoDB.`
      : err.message;
    throw new Error(`Unable to create Google Spreadsheet for user: ${detail}`);
  }
};

const getOrCreateUserSpreadsheet = async (user) => {
  if (!user) {
    throw new Error("Authenticated user is required to resolve spreadsheet");
  }

  // 1. Return cached spreadsheetId if already present on the user object
  if (user.spreadsheetId) {
    return user.spreadsheetId;
  }

  // 2. Fetch fresh user from DB to guard against race conditions
  const userId = user._id || user.id;
  const freshUser = await User.findById(userId);

  if (!freshUser) {
    throw new Error("User record not found in database");
  }

  if (freshUser.spreadsheetId) {
    if (user.spreadsheetId !== undefined) {
      user.spreadsheetId = freshUser.spreadsheetId;
    }
    return freshUser.spreadsheetId;
  }

  // 3. Create dedicated spreadsheet for this user
  const newSpreadsheetId = await createUserSpreadsheet(freshUser);

  // 4. Save to user in MongoDB
  freshUser.spreadsheetId = newSpreadsheetId;
  await freshUser.save();

  if (user.spreadsheetId !== undefined) {
    user.spreadsheetId = newSpreadsheetId;
  }

  return newSpreadsheetId;
};

module.exports = {
  getSheetsClient,
  getDriveClient,
  DEFAULT_WORK_LOG_TAB,
  DEFAULT_MENTOR_LOG_TAB,
  resolveWorkLogSheetName,
  ensureHeaderRow,
  appendWorkLog,
  updateWorkLogRow,
  deleteWorkLogRow,
  ensureSpreadsheetTabsAndHeaders,
  createUserSpreadsheet,
  getOrCreateUserSpreadsheet,
};
