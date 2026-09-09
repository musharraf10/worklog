const { google } = require("googleapis");

const {
  SHEET_HEADERS,
  formatWorkLogRow,
} = require("./googleSheetsFormatter");

const getSheetsClient = () => {
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

const getSheetName = () => {
  return process.env.GOOGLE_SHEETS_SHEET_NAME;
};

let isFormatEnsured = false;

const ensureColumnFormatting = async (sheets, spreadsheetId, sheetName) => {
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
    isFormatEnsured = true;
  } catch (err) {
    console.error("Error ensuring Google Sheets column formatting:", err);
  }
};

const ensureHeaderRow = async () => {
  const sheets = getSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
  const sheetName = getSheetName();

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
  } else if (!isFormatEnsured) {
    await ensureColumnFormatting(sheets, spreadsheetId, sheetName);
  }
};

const appendWorkLog = async (workLog) => {
  await ensureHeaderRow();
  const sheets = getSheetsClient();

  const response = await sheets.spreadsheets.values.append({
    spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID,
    range: `'${getSheetName()}'!A:K`,
    valueInputOption: "USER_ENTERED",
    insertDataOption: "INSERT_ROWS",
    resource: {
      values: [formatWorkLogRow(workLog)],
    },
  });

  return response.data;
};

const updateWorkLogRow = async (workLog, rowNumber) => {
  await ensureHeaderRow();
  const sheets = getSheetsClient();

  const range = `'${getSheetName()}'!A${rowNumber}:K${rowNumber}`;

  const response = await sheets.spreadsheets.values.update({
    spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID,
    range,
    valueInputOption: "USER_ENTERED",
    resource: {
      values: [formatWorkLogRow(workLog)],
    },
  });

  return response.data;
};

const deleteWorkLogRow = async (rowNumber) => {
  const sheets = getSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;

  const metadata = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: "sheets.properties",
  });

  const sheet = metadata.data.sheets.find(
    (item) => item.properties.title === getSheetName(),
  );

  if (!sheet) {
    throw new Error(`Sheet "${getSheetName()}" not found`);
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

module.exports = {
  ensureHeaderRow,
  appendWorkLog,
  updateWorkLogRow,
  deleteWorkLogRow,
};
