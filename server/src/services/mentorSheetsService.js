const { google } = require("googleapis");
const MentorLog = require("../models/MentorLog");

const MENTOR_SHEET_HEADERS = [
  "Date",
  "Work Log Task",
  "Student / Batch",
  "Subject",
  "Question Category",
  "Question / Problem",
  "Status",
  "Resolution / Explanation",
  "Remarks",
];

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

const getMentorSheetName = () => {
  return process.env.GOOGLE_SHEETS_MENTOR_SHEET_NAME || "Mentor Logs";
};

const formatDateValue = (dateInput) => {
  if (!dateInput) return "";
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return "";
  return d.toISOString().split("T")[0];
};

const formatQuestionRow = (workLog, mentorLog, question) => {
  return [
    formatDateValue(workLog.date),
    workLog.task || "",
    mentorLog.studentBatch || "",
    mentorLog.subject || "",
    question.category || "",
    question.question || "",
    question.status || "Solved",
    question.resolution || "",
    question.remarks || "",
  ];
};

const ensureMentorSheetHeaderRow = async (spreadsheetId) => {
  if (!spreadsheetId) {
    throw new Error("Spreadsheet ID is required to ensure mentor sheet header");
  }

  const sheets = getSheetsClient();
  const sheetName = getMentorSheetName();

  // 1. Check if sheet exists; if not, create it
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

  const sheetId = sheet?.properties?.sheetId;

  // 2. Check header row
  const getRes = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `'${sheetName}'!A1:I1`,
  });

  const existingHeaders = getRes.data.values?.[0];
  const isMatch =
    Array.isArray(existingHeaders) &&
    existingHeaders.length === MENTOR_SHEET_HEADERS.length &&
    MENTOR_SHEET_HEADERS.every((h, i) => existingHeaders[i] === h);

  if (!isMatch) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `'${sheetName}'!A1:I1`,
      valueInputOption: "USER_ENTERED",
      resource: {
        values: [MENTOR_SHEET_HEADERS],
      },
    });

    if (sheetId !== undefined) {
      try {
        await sheets.spreadsheets.batchUpdate({
          spreadsheetId,
          resource: {
            requests: [
              {
                repeatCell: {
                  range: {
                    sheetId,
                    startColumnIndex: 0,
                    endColumnIndex: 1,
                    startRowIndex: 1,
                  },
                  cell: {
                    userEnteredFormat: {
                      numberFormat: {
                        type: "DATE",
                        pattern: "yyyy-mm-dd",
                      },
                    },
                  },
                  fields: "userEnteredFormat.numberFormat",
                },
              },
            ],
          },
        });
      } catch (err) {
        console.error("Error setting Mentor Logs date formatting:", err.message);
      }
    }
  }

  return sheetName;
};

const appendMentorQuestionRows = async (
  spreadsheetId,
  workLog,
  mentorLog,
  questions = [],
) => {
  if (!spreadsheetId) {
    throw new Error("Spreadsheet ID is required to append mentor question rows");
  }

  if (!questions || questions.length === 0) return [];

  const sheetName = await ensureMentorSheetHeaderRow(spreadsheetId);
  const sheets = getSheetsClient();

  const rows = questions.map((q) => formatQuestionRow(workLog, mentorLog, q));

  const response = await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `'${sheetName}'!A:I`,
    valueInputOption: "USER_ENTERED",
    insertDataOption: "INSERT_ROWS",
    resource: {
      values: rows,
    },
  });

  const updatedRange = response.data.updates?.updatedRange;
  let startRowNumber = null;

  if (updatedRange) {
    const cellPart = updatedRange.includes("!")
      ? updatedRange.split("!").pop()
      : updatedRange;
    const match = cellPart.match(/^[A-Za-z]+(\d+)/);
    if (match) {
      startRowNumber = Number(match[1]);
    }
  }

  // Return mapped row numbers for each question
  return questions.map((q, idx) => ({
    questionId: q._id,
    rowNumber: startRowNumber !== null ? startRowNumber + idx : null,
  }));
};

const updateMentorQuestionRow = async (
  spreadsheetId,
  workLog,
  mentorLog,
  question,
  rowNumber,
) => {
  if (!spreadsheetId) {
    throw new Error("Spreadsheet ID is required to update mentor question row");
  }

  if (!rowNumber || rowNumber < 2) return null;

  const sheetName = await ensureMentorSheetHeaderRow(spreadsheetId);
  const sheets = getSheetsClient();

  const row = formatQuestionRow(workLog, mentorLog, question);

  const response = await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `'${sheetName}'!A${rowNumber}:I${rowNumber}`,
    valueInputOption: "USER_ENTERED",
    resource: {
      values: [row],
    },
  });

  return response.data;
};

const deleteMentorQuestionRow = async (spreadsheetId, rowNumber, userId) => {
  if (!spreadsheetId) {
    throw new Error("Spreadsheet ID is required to delete mentor question row");
  }

  if (!rowNumber || rowNumber < 2) return;

  const sheets = getSheetsClient();
  const sheetName = getMentorSheetName();

  const metadata = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: "sheets.properties",
  });

  const sheet = metadata.data.sheets?.find(
    (s) => s.properties.title === sheetName,
  );

  if (!sheet) {
    throw new Error(`Sheet "${sheetName}" not found in spreadsheet ${spreadsheetId}`);
  }

  const sheetId = sheet.properties.sheetId;

  await sheets.spreadsheets.batchUpdate({
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

  // When a row is deleted, all question rows in MongoDB that were below this row shift up by 1
  // Scoped strictly to this authenticated user!
  const filter = { "questions.googleSheetRowNumber": { $gt: rowNumber } };
  if (userId) {
    filter.user = userId;
  }

  await MentorLog.updateMany(
    filter,
    { $inc: { "questions.$[elem].googleSheetRowNumber": -1 } },
    { arrayFilters: [{ "elem.googleSheetRowNumber": { $gt: rowNumber } }] },
  );
};

module.exports = {
  MENTOR_SHEET_HEADERS,
  getMentorSheetName,
  ensureMentorSheetHeaderRow,
  appendMentorQuestionRows,
  updateMentorQuestionRow,
  deleteMentorQuestionRow,
};
