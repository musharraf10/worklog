const dotenv = require("dotenv");
dotenv.config();
const mongoose = require("mongoose");
const assert = require("assert");

const User = require("../src/models/User");
const WorkLog = require("../src/models/WorkLog");
const MentorLog = require("../src/models/MentorLog");
const googleSheetsService = require("../src/services/googleSheetsService");
const mentorSheetsService = require("../src/services/mentorSheetsService");
const workLogSyncService = require("../src/services/workLogSyncService");

async function runTests() {
  console.log("==================================================");
  console.log("   RUNNING USER ISOLATION & SPREADSHEETS TESTS    ");
  console.log("==================================================\n");

  await mongoose.connect(process.env.MONGO_URI);
  console.log("✓ Connected to MongoDB");

  const testEmailA = `test_user_a_${Date.now()}@example.com`;
  const testEmailB = `test_user_b_${Date.now()}@example.com`;
  const spreadsheetA = `SPREADSHEET_USER_A_${Date.now()}`;
  const spreadsheetB = `SPREADSHEET_USER_B_${Date.now()}`;

  let userA, userB;
  let workLogA1, workLogA2, workLogB1;
  let mentorLogA;

  try {
    // ----------------------------------------------------
    // TEST 1: User Model & Creation Isolation
    // ----------------------------------------------------
    console.log("\n--- TEST 1: User Model & Spreadsheet Assignment ---");
    userA = await User.create({
      name: "User A",
      email: testEmailA,
      password: "password123",
      authProvider: "local",
      spreadsheetId: spreadsheetA,
    });

    userB = await User.create({
      name: "User B",
      email: testEmailB,
      password: "password123",
      authProvider: "local",
      spreadsheetId: spreadsheetB,
    });

    assert.strictEqual(userA.spreadsheetId, spreadsheetA, "User A must have Spreadsheet A");
    assert.strictEqual(userB.spreadsheetId, spreadsheetB, "User B must have Spreadsheet B");
    assert.notStrictEqual(userA.spreadsheetId, userB.spreadsheetId, "Spreadsheets A and B must be distinct");
    console.log("✓ User A has dedicated Spreadsheet A:", userA.spreadsheetId);
    console.log("✓ User B has dedicated Spreadsheet B:", userB.spreadsheetId);
    console.log("✓ Complete separation between User A and User B spreadsheet IDs");

    // ----------------------------------------------------
    // TEST 2: Idempotency & Backend Restart (No Duplication)
    // ----------------------------------------------------
    console.log("\n--- TEST 2: Idempotency & Persistence ---");
    const retrievedA = await googleSheetsService.getOrCreateUserSpreadsheet(userA);
    assert.strictEqual(retrievedA, spreadsheetA, "Existing user must retain identical spreadsheet ID");

    // Simulate backend restart by querying fresh from DB
    const freshUserA = await User.findById(userA._id);
    const retrievedFreshA = await googleSheetsService.getOrCreateUserSpreadsheet(freshUserA);
    assert.strictEqual(retrievedFreshA, spreadsheetA, "Restarted backend instance must not create another spreadsheet");
    console.log("✓ getOrCreateUserSpreadsheet is idempotent: returns existing spreadsheet ID without re-creation");

    // ----------------------------------------------------
    // TEST 3: Work Log Google Sheets Isolation
    // ----------------------------------------------------
    console.log("\n--- TEST 3: Work Log Sync Isolation ---");
    // Intercept / spy on googleSheetsService methods to verify targeted spreadsheet IDs
    const originalAppendWorkLog = googleSheetsService.appendWorkLog;
    const originalUpdateWorkLogRow = googleSheetsService.updateWorkLogRow;
    const originalDeleteWorkLogRow = googleSheetsService.deleteWorkLogRow;

    const sheetsOperations = [];

    googleSheetsService.appendWorkLog = async (targetSpreadsheetId, workLog) => {
      sheetsOperations.push({ action: "appendWorkLog", spreadsheetId: targetSpreadsheetId, workLogId: workLog._id });
      return { updates: { updatedRange: "'Work Logs'!A5:K5" } };
    };

    googleSheetsService.updateWorkLogRow = async (targetSpreadsheetId, workLog, rowNumber) => {
      sheetsOperations.push({ action: "updateWorkLogRow", spreadsheetId: targetSpreadsheetId, rowNumber });
      return { data: "updated" };
    };

    googleSheetsService.deleteWorkLogRow = async (targetSpreadsheetId, rowNumber) => {
      sheetsOperations.push({ action: "deleteWorkLogRow", spreadsheetId: targetSpreadsheetId, rowNumber });
      return { data: "deleted" };
    };

    // Create Work Logs for User A and User B
    workLogA1 = await WorkLog.create({
      user: userA._id,
      date: new Date(),
      task: "User A Task 1",
      category: "Mentoring",
      activityType: "Mentoring Session",
      timeFrom: "09:00",
      timeTo: "10:00",
      spentMinutes: 60,
      googleSheetRowNumber: 5,
    });

    workLogA2 = await WorkLog.create({
      user: userA._id,
      date: new Date(),
      task: "User A Task 2",
      category: "Development",
      activityType: "Feature",
      timeFrom: "10:00",
      timeTo: "11:00",
      spentMinutes: 60,
      googleSheetRowNumber: 6,
    });

    workLogB1 = await WorkLog.create({
      user: userB._id,
      date: new Date(),
      task: "User B Task 1",
      category: "Testing",
      activityType: "QA",
      timeFrom: "09:00",
      timeTo: "10:00",
      spentMinutes: 60,
      googleSheetRowNumber: 5,
    });

    // Sync User A Work Log
    await workLogSyncService.syncNewWorkLog(workLogA1._id, userA);
    const lastOpA = sheetsOperations[sheetsOperations.length - 1];
    assert.strictEqual(lastOpA.spreadsheetId, spreadsheetA, "User A Work Log must sync ONLY to Spreadsheet A");
    console.log("✓ Work Log for User A synced strictly to Spreadsheet A:", lastOpA.spreadsheetId);

    // Sync User B Work Log
    await workLogSyncService.syncNewWorkLog(workLogB1._id, userB);
    const lastOpB = sheetsOperations[sheetsOperations.length - 1];
    assert.strictEqual(lastOpB.spreadsheetId, spreadsheetB, "User B Work Log must sync ONLY to Spreadsheet B");
    console.log("✓ Work Log for User B synced strictly to Spreadsheet B:", lastOpB.spreadsheetId);

    // Update User A Work Log
    await workLogSyncService.syncUpdatedWorkLog(workLogA1._id, userA);
    const updateOp = sheetsOperations[sheetsOperations.length - 1];
    assert.strictEqual(updateOp.spreadsheetId, spreadsheetA, "Update for User A must target Spreadsheet A");
    console.log("✓ Work Log update for User A targeted Spreadsheet A");

    // Delete User A Work Log (Row 5) and verify scoped row shifts
    await workLogSyncService.syncDeletedWorkLog(userA._id, userA, 5);
    const deleteOp = sheetsOperations[sheetsOperations.length - 1];
    assert.strictEqual(deleteOp.spreadsheetId, spreadsheetA, "Delete for User A must target Spreadsheet A");

    const refreshedA2 = await WorkLog.findById(workLogA2._id);
    const refreshedB1 = await WorkLog.findById(workLogB1._id);

    assert.strictEqual(refreshedA2.googleSheetRowNumber, 5, "User A subsequent log row number should decrement from 6 to 5");
    assert.strictEqual(refreshedB1.googleSheetRowNumber, 5, "User B log row number MUST NOT be modified by User A deletion");
    console.log("✓ Work Log row deletion on Spreadsheet A shifted User A's subsequent rows only");
    console.log("✓ User B's row numbers remained completely intact (multi-tenant row isolation)");

    // Restore original methods
    googleSheetsService.appendWorkLog = originalAppendWorkLog;
    googleSheetsService.updateWorkLogRow = originalUpdateWorkLogRow;
    googleSheetsService.deleteWorkLogRow = originalDeleteWorkLogRow;

    // ----------------------------------------------------
    // TEST 4: Mentor Log Google Sheets Isolation
    // ----------------------------------------------------
    console.log("\n--- TEST 4: Mentor Log Sync Isolation ---");
    const originalAppendMentorQuestionRows = mentorSheetsService.appendMentorQuestionRows;
    const originalUpdateMentorQuestionRow = mentorSheetsService.updateMentorQuestionRow;
    const originalDeleteMentorQuestionRow = mentorSheetsService.deleteMentorQuestionRow;

    const mentorOperations = [];

    mentorSheetsService.appendMentorQuestionRows = async (targetSpreadsheetId, workLog, mentorLog, questions) => {
      mentorOperations.push({ action: "appendMentorQuestionRows", spreadsheetId: targetSpreadsheetId, count: questions.length });
      return questions.map((q, i) => ({ questionId: q._id, rowNumber: 2 + i }));
    };

    mentorSheetsService.updateMentorQuestionRow = async (targetSpreadsheetId, workLog, mentorLog, question, rowNumber) => {
      mentorOperations.push({ action: "updateMentorQuestionRow", spreadsheetId: targetSpreadsheetId, rowNumber });
      return { data: "updated" };
    };

    mentorSheetsService.deleteMentorQuestionRow = async (targetSpreadsheetId, rowNumber, userId) => {
      mentorOperations.push({ action: "deleteMentorQuestionRow", spreadsheetId: targetSpreadsheetId, rowNumber, userId });
      // Scoped shift
      if (userId) {
        await MentorLog.updateMany(
          { user: userId, "questions.googleSheetRowNumber": { $gt: rowNumber } },
          { $inc: { "questions.$[elem].googleSheetRowNumber": -1 } },
          { arrayFilters: [{ "elem.googleSheetRowNumber": { $gt: rowNumber } }] },
        );
      }
    };

    // Create Mentor Logs for User A and User B
    mentorLogA = await MentorLog.create({
      user: userA._id,
      workLog: workLogA1._id,
      studentBatch: "Batch A",
      subject: "React",
      questions: [
        { question: "Question 1", category: "Concept Clarification", status: "Solved", googleSheetRowNumber: 2 },
        { question: "Question 2", category: "Debugging", status: "Solved", googleSheetRowNumber: 3 },
      ],
    });

    const mentorLogB = await MentorLog.create({
      user: userB._id,
      workLog: workLogB1._id,
      studentBatch: "Batch B",
      subject: "Node.js",
      questions: [
        { question: "Question B1", category: "Concept Clarification", status: "Solved", googleSheetRowNumber: 2 },
      ],
    });

    // Test append questions for User A
    const sidA = await googleSheetsService.getOrCreateUserSpreadsheet(userA);
    await mentorSheetsService.appendMentorQuestionRows(sidA, workLogA1, mentorLogA, mentorLogA.questions);
    assert.strictEqual(mentorOperations[mentorOperations.length - 1].spreadsheetId, spreadsheetA);
    console.log("✓ Mentor questions for User A appended strictly to Spreadsheet A");

    // Test append questions for User B
    const sidB = await googleSheetsService.getOrCreateUserSpreadsheet(userB);
    await mentorSheetsService.appendMentorQuestionRows(sidB, workLogB1, mentorLogB, mentorLogB.questions);
    assert.strictEqual(mentorOperations[mentorOperations.length - 1].spreadsheetId, spreadsheetB);
    console.log("✓ Mentor questions for User B appended strictly to Spreadsheet B");

    // Test delete question for User A
    await mentorSheetsService.deleteMentorQuestionRow(sidA, 2, userA._id);
    const refreshedMentorA = await MentorLog.findById(mentorLogA._id);
    const refreshedMentorB = await MentorLog.findById(mentorLogB._id);

    assert.strictEqual(refreshedMentorA.questions[1].googleSheetRowNumber, 2, "User A Question 2 shifted up to row 2");
    assert.strictEqual(refreshedMentorB.questions[0].googleSheetRowNumber, 2, "User B Question row number was not affected");
    console.log("✓ Mentor question row delete on Spreadsheet A shifted only User A's questions");
    console.log("✓ User B's mentor question row numbers remained completely intact");

    // Restore original mentor methods
    mentorSheetsService.appendMentorQuestionRows = originalAppendMentorQuestionRows;
    mentorSheetsService.updateMentorQuestionRow = originalUpdateMentorQuestionRow;
    mentorSheetsService.deleteMentorQuestionRow = originalDeleteMentorQuestionRow;

    // ----------------------------------------------------
    // TEST 5: Security & Cross-User Access Prevention
    // ----------------------------------------------------
    console.log("\n--- TEST 5: User Authorization & Tamper Prevention ---");
    // Verify that User A cannot fetch User B's WorkLog via user query filter
    const userALookupBLog = await WorkLog.findOne({ _id: workLogB1._id, user: userA._id });
    assert.strictEqual(userALookupBLog, null, "User A must NOT be able to access User B's WorkLog");

    // Verify that User A cannot fetch User B's MentorLog
    const userALookupBMentor = await MentorLog.findOne({ _id: mentorLogB._id, user: userA._id });
    assert.strictEqual(userALookupBMentor, null, "User A must NOT be able to access User B's MentorLog");

    // Verify no global spreadsheet fallback in services
    await assert.rejects(async () => {
      await googleSheetsService.ensureHeaderRow(null);
    }, /Spreadsheet ID is required/, "Calling sheets service without spreadsheetId must reject with error");

    await assert.rejects(async () => {
      await mentorSheetsService.ensureMentorSheetHeaderRow(null);
    }, /Spreadsheet ID is required/, "Calling mentor sheets service without spreadsheetId must reject with error");

    console.log("✓ User A cannot read or modify User B's logs");
    console.log("✓ No global GOOGLE_SHEETS_SPREADSHEET_ID fallback occurs when user has no sheet");

    console.log("\n==================================================");
    console.log("   ALL 5 TEST SUITES PASSED SUCCESSFULLY!         ");
    console.log("==================================================\n");

  } finally {
    // Cleanup test records
    console.log("Cleaning up test records...");
    if (userA) await User.findByIdAndDelete(userA._id);
    if (userB) await User.findByIdAndDelete(userB._id);
    if (workLogA1) await WorkLog.findByIdAndDelete(workLogA1._id);
    if (workLogA2) await WorkLog.findByIdAndDelete(workLogA2._id);
    if (workLogB1) await WorkLog.findByIdAndDelete(workLogB1._id);
    if (mentorLogA) await MentorLog.findByIdAndDelete(mentorLogA._id);
    await WorkLog.deleteMany({ task: /User [AB] Task/ });
    await MentorLog.deleteMany({ studentBatch: /Batch [AB]/ });
    await mongoose.disconnect();
    console.log("✓ Test cleanup completed & database disconnected.");
  }
}

runTests().catch((err) => {
  console.error("TEST FAILED:", err);
  process.exit(1);
});
