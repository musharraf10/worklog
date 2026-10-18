const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");
const http = require("http");
const express = require("express");

dotenv.config({ path: path.join(__dirname, "../../.env") });

const User = require("../models/User");
const WorkLog = require("../models/WorkLog");
const MentorLog = require("../models/MentorLog");
const ShareLink = require("../models/ShareLink");
const ManagerRemark = require("../models/ManagerRemark");

const workLogRoutes = require("../routes/workLogRoutes");
const mentorLogRoutes = require("../routes/mentorLogRoutes");
const shareLinkRoutes = require("../routes/shareLinkRoutes");
const sharedPortalRoutes = require("../routes/sharedPortalRoutes");
const authRoutes = require("../routes/authRoutes");
const reportRoutes = require("../routes/reportRoutes");
const errorHandler = require("../middleware/errorMiddleware");

const app = express();
app.use(express.json());
app.use("/api/auth", authRoutes);
app.use("/api/worklogs/summary", reportRoutes);
app.use("/api/worklogs", workLogRoutes);
app.use("/api/mentor-logs", mentorLogRoutes);
app.use("/api/share-links", shareLinkRoutes);
app.use("/api/shared", sharedPortalRoutes);
app.use(errorHandler);

let server;
let baseUrl;

const runTests = async () => {
  console.log("=== STARTING MANAGER VIEW & 0M OVERVIEW VERIFICATION SUITE ===");

  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB for testing.");

  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  baseUrl = `http://localhost:${port}/api`;

  let testUser;
  let authToken;
  let shareToken;
  let shareLinkId;

  try {
    // 1. Setup User and ShareLink
    const email = `manager_test_${Date.now()}@example.com`;
    const regRes = await fetch(`${baseUrl}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Professor Sharma",
        email,
        password: "password123",
      }),
    });
    const regData = await regRes.json();
    testUser = regData.data.user;
    authToken = regData.data.token;
    const userId = testUser.id || testUser._id;

    // Create a share link
    const linkRes = await fetch(`${baseUrl}/share-links`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        expiryHours: 48,
        label: "Manager Portal Access",
      }),
    });
    const linkData = await linkRes.json();
    shareToken = linkData.data.rawToken;
    shareLinkId = linkData.data._id;
    console.log("✓ Test Setup: Created user and share link.");

    // 2. Setup Work Logs across Today, Earlier This Week, and End of Month
    // Today in Asia/Kolkata
    const now = new Date();
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    const todayStr = formatter.format(now);
    const [currY, currM, currD] = todayStr.split("-").map(Number);

    // Compute Monday of this week in Asia/Kolkata
    const dt = new Date(Date.UTC(currY, currM - 1, currD));
    const dayOfWeek = dt.getUTCDay();
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    dt.setUTCDate(dt.getUTCDate() + diffToMonday);
    const mondayStr = dt.toISOString().split("T")[0];

    // Last day of current month in UTC
    const lastDayOfMonth = new Date(Date.UTC(currY, currM, 0));
    const lastDayStr = lastDayOfMonth.toISOString().split("T")[0];

    console.log(`Dates for test -> Today: ${todayStr}, Monday: ${mondayStr}, LastDay: ${lastDayStr}`);

    // Create 1: Today log (60 mins = 1h 0m)
    const logToday = await WorkLog.create({
      user: userId,
      date: new Date(`${todayStr}T00:00:00.000Z`),
      task: "Algorithm Lecture & Lab",
      category: "Teaching",
      activityType: "Class",
      timeFrom: "09:00",
      timeTo: "10:00",
      spentMinutes: 60,
      hallSection: "Room 101",
      status: "Completed",
      priority: "Highest",
      remarks: "Covered Graph BFS/DFS",
    });

    // Create 2: Another today log (30 mins)
    const logToday2 = await WorkLog.create({
      user: userId,
      date: new Date(`${todayStr}T00:00:00.000Z`),
      task: "Student Doubt Clearing",
      category: "Student Support",
      activityType: "Doubt Clarification",
      timeFrom: "11:00",
      timeTo: "11:30",
      spentMinutes: 30,
      hallSection: "Faculty Cabin",
      status: "Completed",
      priority: "High",
      remarks: "Solved pointers question",
    });

    // Create 3: Week log (on Monday, 90 mins = 1h 30m) - if monday is not today
    let logWeek = null;
    if (mondayStr !== todayStr) {
      logWeek = await WorkLog.create({
        user: userId,
        date: new Date(`${mondayStr}T00:00:00.000Z`),
        task: "Curriculum Planning Meeting",
        category: "Administrative",
        activityType: "Meeting",
        timeFrom: "14:00",
        timeTo: "15:30",
        spentMinutes: 90,
        hallSection: "Conference Hall",
        status: "In Progress",
        priority: "Medium",
        remarks: "Syllabus revision discussion",
      });
    }

    // Create 4: Last day of month log (45 mins) - specifically verifying the fix for last day of month
    let logEndOfMonth = null;
    if (lastDayStr !== todayStr && lastDayStr !== mondayStr) {
      logEndOfMonth = await WorkLog.create({
        user: userId,
        date: new Date(`${lastDayStr}T00:00:00.000Z`),
        task: "Monthly Progress Submission",
        category: "Documentation",
        activityType: "Preparation",
        timeFrom: "16:00",
        timeTo: "16:45",
        spentMinutes: 45,
        hallSection: "Office",
        status: "Completed",
        priority: "Medium",
        remarks: "Submitted monthly work tracker",
      });
    }

    // Create MentorLog for User
    const mentorLog1 = await MentorLog.create({
      user: userId,
      workLog: logToday._id,
      studentBatch: "CSE 2026 Batch A",
      subject: "Data Structures & Algorithms",
      questions: [
        {
          question: "How to detect a cycle in a directed graph using DFS?",
          category: "DSA / Problem Solving",
          status: "Solved",
          resolution: "Explained recursion stack array vs visited array.",
          remarks: "Student implemented successfully.",
        },
        {
          question: "How to handle negative cycles in Bellman-Ford?",
          category: "DSA / Problem Solving",
          status: "Carry Forward",
          resolution: "Needs next session to review implementation.",
          remarks: "To be resumed on Wednesday.",
        },
      ],
    });

    // TEST 1: Verify Daily Summary matches today's exact logs (60 + 30 = 90 mins -> 1h 30m)
    const dailyRes = await fetch(`${baseUrl}/shared/${shareToken}/reports/daily?date=${todayStr}`);
    const dailyData = await dailyRes.json();
    if (!dailyData.success) {
      throw new Error(`Test 1 Failed: ${JSON.stringify(dailyData)}`);
    }
    const expectedTodayMinutes = 90;
    if (dailyData.data.totalWorkedMinutes !== expectedTodayMinutes) {
      throw new Error(
        `Test 1 Failed: Expected ${expectedTodayMinutes}m today, got ${dailyData.data.totalWorkedMinutes}m`
      );
    }
    if (dailyData.data.totalWorkedHours !== "1h 30m") {
      throw new Error(
        `Test 1 Failed: Expected '1h 30m', got ${dailyData.data.totalWorkedHours}`
      );
    }
    if (dailyData.data.totalTasks !== 2) {
      throw new Error(
        `Test 1 Failed: Expected 2 tasks today, got ${dailyData.data.totalTasks}`
      );
    }
    console.log("✓ Test 1 Passed: Daily Summary correctly totals 90m (1h 30m) with 2 tasks.");

    // TEST 2: Verify Weekly Summary includes today + monday
    const weeklyRes = await fetch(`${baseUrl}/shared/${shareToken}/reports/weekly?startDate=${mondayStr}`);
    const weeklyData = await weeklyRes.json();
    if (!weeklyData.success) {
      throw new Error(`Test 2 Failed: ${JSON.stringify(weeklyData)}`);
    }
    const expectedWeekMinutes = 90 + (logWeek ? 90 : 0);
    if (weeklyData.data.totalWorkedMinutes !== expectedWeekMinutes) {
      throw new Error(
        `Test 2 Failed: Expected ${expectedWeekMinutes}m for week, got ${weeklyData.data.totalWorkedMinutes}m`
      );
    }
    console.log(`✓ Test 2 Passed: Weekly Summary correctly totals ${expectedWeekMinutes}m.`);

    // TEST 3: Verify Monthly Summary includes the last day of the month (fixing the 0m / cutoff bug)
    const monthlyRes = await fetch(`${baseUrl}/shared/${shareToken}/reports/monthly?year=${currY}&month=${currM}`);
    const monthlyData = await monthlyRes.json();
    if (!monthlyData.success) {
      throw new Error(`Test 3 Failed: ${JSON.stringify(monthlyData)}`);
    }
    const expectedMonthMinutes =
      90 + (logWeek ? 90 : 0) + (logEndOfMonth ? 45 : 0);
    if (monthlyData.data.totalWorkedMinutes !== expectedMonthMinutes) {
      throw new Error(
        `Test 3 Failed: Expected ${expectedMonthMinutes}m for month (including last day), got ${monthlyData.data.totalWorkedMinutes}m`
      );
    }
    console.log(`✓ Test 3 Passed: Monthly Summary correctly includes all records including end of month (${expectedMonthMinutes}m).`);

    // TEST 4: Manager View Filtering by Category
    const catFilterRes = await fetch(`${baseUrl}/shared/${shareToken}/worklogs?category=Teaching`);
    const catFilterData = await catFilterRes.json();
    if (!catFilterData.success || catFilterData.count !== 1 || catFilterData.data[0].category !== "Teaching") {
      throw new Error(`Test 4 Failed: Category filtering failed: ${JSON.stringify(catFilterData)}`);
    }
    console.log("✓ Test 4 Passed: Manager View category filtering returns only Teaching logs.");

    // TEST 5: Manager View Filtering by Status
    const statusFilterRes = await fetch(`${baseUrl}/shared/${shareToken}/worklogs?status=In%20Progress`);
    const statusFilterData = await statusFilterRes.json();
    if (!statusFilterData.success) {
      throw new Error(`Test 5 Failed: Status filtering failed: ${JSON.stringify(statusFilterData)}`);
    }
    if (logWeek && statusFilterData.count !== 1) {
      throw new Error(`Test 5 Failed: Expected 1 In Progress task, got ${statusFilterData.count}`);
    }
    console.log("✓ Test 5 Passed: Manager View status filtering works as expected.");

    // TEST 6: Manager View Search Functionality
    const searchRes = await fetch(`${baseUrl}/shared/${shareToken}/worklogs?search=Algorithm`);
    const searchData = await searchRes.json();
    if (!searchData.success || searchData.count !== 1 || !searchData.data[0].task.includes("Algorithm")) {
      throw new Error(`Test 6 Failed: Search query failed: ${JSON.stringify(searchData)}`);
    }
    console.log("✓ Test 6 Passed: Manager View search returns matching task descriptions.");

    // TEST 7: Review Mentor Logs & Outcomes
    const mentorRes = await fetch(`${baseUrl}/shared/${shareToken}/mentor-logs`);
    const mentorData = await mentorRes.json();
    if (!mentorRes.ok || mentorData.count !== 1 || mentorData.data[0].questions.length !== 2) {
      throw new Error(`Test 7 Failed: Mentor review: ${JSON.stringify(mentorData)}`);
    }
    const hasSolved = mentorData.data[0].questions.some((q) => q.status === "Solved");
    const hasCarryForward = mentorData.data[0].questions.some((q) => q.status === "Carry Forward");
    if (!hasSolved || !hasCarryForward) {
      throw new Error("Test 7 Failed: Mentoring outcomes Solved / Carry Forward not found");
    }
    console.log("✓ Test 7 Passed: Manager can review mentoring outcomes (Solved & Carry Forward).");

    // TEST 8: Add Remark to WorkLog and MentorLog
    const addWlRemark = await fetch(`${baseUrl}/shared/${shareToken}/remarks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        targetType: "WorkLog",
        targetId: logToday._id.toString(),
        authorName: "Dean of Academic Affairs",
        remark: "Excellent coverage of Graph traversal techniques.",
      }),
    });
    const addWlRemarkData = await addWlRemark.json();
    if (!addWlRemarkData.success || !addWlRemarkData.data._id) {
      throw new Error(`Test 8 Failed (WorkLog Remark): ${JSON.stringify(addWlRemarkData)}`);
    }

    const addMlRemark = await fetch(`${baseUrl}/shared/${shareToken}/remarks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        targetType: "MentorLog",
        targetId: mentorLog1._id.toString(),
        authorName: "Dean of Academic Affairs",
        remark: "Good follow-up planned for Bellman-Ford.",
      }),
    });
    const addMlRemarkData = await addMlRemark.json();
    if (!addMlRemarkData.success || !addMlRemarkData.data._id) {
      throw new Error(`Test 8 Failed (MentorLog Remark): ${JSON.stringify(addMlRemarkData)}`);
    }
    console.log("✓ Test 8 Passed: Added remarks to WorkLog and MentorLog cleanly.");

    // TEST 9: Fetch all remarks
    const getRemarksRes = await fetch(`${baseUrl}/shared/${shareToken}/remarks`);
    const getRemarksData = await getRemarksRes.json();
    if (!getRemarksData.success || getRemarksData.data.length < 2) {
      throw new Error(`Test 9 Failed: Expected >= 2 remarks, got ${getRemarksData.data.length}`);
    }
    console.log("✓ Test 9 Passed: Fetched all submitted manager remarks successfully.");

    // TEST 10: Security check - Verify NO private fields leaked
    const verifyPortalRes = await fetch(`${baseUrl}/shared/${shareToken}/verify`);
    const verifyPortalData = await verifyPortalRes.json();
    const ownerData = verifyPortalData.data.owner;
    if (ownerData.password || ownerData.jwt || ownerData.tokens || ownerData.googleAccessToken) {
      throw new Error("Test 10 Failed: Private credentials or secrets leaked in portal verify!");
    }
    const wlCheck = catFilterData.data[0];
    if (wlCheck.googleSheetSyncStatus || wlCheck.googleSheetRowNumber) {
      throw new Error("Test 10 Failed: Internal sheet credentials/sync state leaked in worklogs!");
    }
    console.log("✓ Test 10 Passed: No JWTs, passwords, or internal database sync states exposed.");

    console.log("\n========================================================");
    console.log("🎉 ALL 10 MANAGER VIEW & 0M OVERVIEW TESTS PASSED!");
    console.log("========================================================\n");
  } catch (err) {
    console.error("TEST FAILED:", err);
    process.exitCode = 1;
  } finally {
    // Cleanup
    try {
      if (testUser) {
        const uId = testUser.id || testUser._id;
        await User.findByIdAndDelete(uId);
        await WorkLog.deleteMany({ user: uId });
        await MentorLog.deleteMany({ user: uId });
        await ShareLink.deleteMany({ userId: uId });
        await ManagerRemark.deleteMany({ userId: uId });
      }
    } catch (e) {
      console.warn("Cleanup error:", e.message);
    }

    if (server) server.close();
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB.");
  }
};

runTests();
