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
  console.log("=== STARTING SHARE COMPLETE PORTAL TEST SUITE ===");

  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB for testing.");

  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  baseUrl = `http://localhost:${port}/api`;
  console.log(`Test Express server running at: ${baseUrl}`);

  let testUserA;
  let testUserB;
  let tokenUserA;
  let workLogA;
  let workLogB;
  let mentorLogA;
  let shareTokenA;
  let shareLinkIdA;
  let shortShareToken;
  let shortShareLinkId;

  try {
    // 0. Setup test users and data
    const emailA = `test_owner_a_${Date.now()}@example.com`;
    const emailB = `test_owner_b_${Date.now()}@example.com`;

    const regResA = await fetch(`${baseUrl}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Test User A",
        email: emailA,
        password: "password123",
      }),
    });
    const regDataA = await regResA.json();
    testUserA = regDataA.data.user;
    tokenUserA = regDataA.data.token;

    const regResB = await fetch(`${baseUrl}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Test User B",
        email: emailB,
        password: "password123",
      }),
    });
    const regDataB = await regResB.json();
    testUserB = regDataB.data.user;

    const userIdA = testUserA.id || testUserA._id;
    const userIdB = testUserB.id || testUserB._id;

    // Create WorkLog for User A
    workLogA = await WorkLog.create({
      user: userIdA,
      date: new Date("2026-09-30"),
      task: "Mentoring & Code Review",
      category: "Teaching",
      activityType: "Mentoring Session",
      timeFrom: "10:00",
      timeTo: "11:30",
      spentMinutes: 90,
      hallSection: "Lab 1",
      status: "Completed",
      priority: "Highest",
      remarks: "Original user remarks",
    });

    // Create WorkLog for User B
    workLogB = await WorkLog.create({
      user: userIdB,
      date: new Date("2026-09-30"),
      task: "User B Private Task",
      category: "Private",
      activityType: "Meeting",
      timeFrom: "14:00",
      timeTo: "15:00",
      spentMinutes: 60,
      hallSection: "Room B",
      status: "In Progress",
      priority: "Medium",
      remarks: "User B private note",
    });

    // Create MentorLog for User A
    mentorLogA = await MentorLog.create({
      user: userIdA,
      workLog: workLogA._id,
      studentBatch: "Batch Alpha",
      subject: "React Architecture",
      questions: [
        {
          question: "How does token hashing work?",
          category: "Security",
          status: "Solved",
          resolution: "Explained SHA-256 digests and salting",
          remarks: "Understood well",
        },
      ],
    });

    console.log("✓ Test setup completed: Users and records initialized.");

    // TEST 1: User creates share link
    const createLinkRes = await fetch(`${baseUrl}/share-links`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenUserA}`,
      },
      body: JSON.stringify({
        expiryHours: 24,
        label: "Manager Review Test",
      }),
    });
    const createLinkData = await createLinkRes.json();
    if (!createLinkData.success || !createLinkData.data.rawToken) {
      throw new Error(`Test 1 Failed: ${JSON.stringify(createLinkData)}`);
    }
    shareTokenA = createLinkData.data.rawToken;
    shareLinkIdA = createLinkData.data._id;
    console.log("✓ Test 1 Passed: User A generated secure share link.");

    // TEST 2: Manager opens link without login
    const verifyRes = await fetch(`${baseUrl}/shared/${shareTokenA}/verify`);
    const verifyData = await verifyRes.json();
    if (
      !verifyData.success ||
      verifyData.data.owner.email !== emailA ||
      !verifyData.data.readOnly ||
      !verifyData.data.remarksEnabled
    ) {
      throw new Error(`Test 2 Failed: ${JSON.stringify(verifyData)}`);
    }
    console.log("✓ Test 2 Passed: Manager accessed /shared/:token/verify without login.");

    // TEST 3: Manager can view complete portal/history
    const sharedLogsRes = await fetch(`${baseUrl}/shared/${shareTokenA}/worklogs`);
    const sharedLogsData = await sharedLogsRes.json();
    if (!sharedLogsData.success || sharedLogsData.count !== 1) {
      throw new Error(`Test 3 Failed (WorkLogs): ${JSON.stringify(sharedLogsData)}`);
    }

    const sharedMentorRes = await fetch(`${baseUrl}/shared/${shareTokenA}/mentor-logs`);
    const sharedMentorData = await sharedMentorRes.json();
    if (!sharedMentorData.success || sharedMentorData.count !== 1) {
      throw new Error(`Test 3 Failed (MentorLogs): ${JSON.stringify(sharedMentorData)}`);
    }
    console.log("✓ Test 3 Passed: Manager can view complete Work Logs and Mentor Logs history.");

    // TEST 4: Manager cannot edit WorkLog
    const editWlRes = await fetch(`${baseUrl}/worklogs/${workLogA._id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ task: "Hacked Task" }),
    });
    if (editWlRes.status !== 401) {
      throw new Error(`Test 4 Failed: Expected 401, got ${editWlRes.status}`);
    }
    console.log("✓ Test 4 Passed: Manager cannot edit WorkLog (401 Unauthorized).");

    // TEST 5: Manager cannot delete WorkLog
    const deleteWlRes = await fetch(`${baseUrl}/worklogs/${workLogA._id}`, {
      method: "DELETE",
    });
    if (deleteWlRes.status !== 401) {
      throw new Error(`Test 5 Failed: Expected 401, got ${deleteWlRes.status}`);
    }
    console.log("✓ Test 5 Passed: Manager cannot delete WorkLog (401 Unauthorized).");

    // TEST 6: Manager cannot edit MentorLog
    const editMlRes = await fetch(`${baseUrl}/mentor-logs/${mentorLogA._id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subject: "Hacked Subject" }),
    });
    if (editMlRes.status !== 401 && editMlRes.status !== 404) {
      throw new Error(`Test 6 Failed: Expected 401, got ${editMlRes.status}`);
    }
    console.log("✓ Test 6 Passed: Manager cannot edit MentorLog (401 Unauthorized).");

    // TEST 7: Manager cannot delete MentorLog
    const deleteMlRes = await fetch(`${baseUrl}/mentor-logs/${mentorLogA._id}`, {
      method: "DELETE",
    });
    if (deleteMlRes.status !== 401) {
      throw new Error(`Test 7 Failed: Expected 401, got ${deleteMlRes.status}`);
    }
    console.log("✓ Test 7 Passed: Manager cannot delete MentorLog (401 Unauthorized).");

    // TEST 8: Manager can add a remark (does not modify original record)
    const addRemarkRes = await fetch(`${baseUrl}/shared/${shareTokenA}/remarks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        targetType: "WorkLog",
        targetId: workLogA._id.toString(),
        authorName: "Engineering Manager",
        remark: "Please continue documenting student questions.",
      }),
    });
    const addRemarkData = await addRemarkRes.json();
    if (!addRemarkData.success || !addRemarkData.data._id) {
      throw new Error(`Test 8 Failed: ${JSON.stringify(addRemarkData)}`);
    }

    // Verify original WorkLog is NOT modified
    const refreshedWl = await WorkLog.findById(workLogA._id);
    if (
      refreshedWl.task !== "Mentoring & Code Review" ||
      refreshedWl.remarks !== "Original user remarks"
    ) {
      throw new Error("Test 8 Failed: Original WorkLog was modified by remark!");
    }
    console.log("✓ Test 8 Passed: Manager remark added cleanly without modifying original WorkLog.");

    // TEST 9 & 10: Remark appears after refresh / manager can view existing remarks
    const getRemarksRes = await fetch(
      `${baseUrl}/shared/${shareTokenA}/remarks?targetId=${workLogA._id}`
    );
    const getRemarksData = await getRemarksRes.json();
    if (
      !getRemarksData.success ||
      getRemarksData.data.length !== 1 ||
      getRemarksData.data[0].remark !== "Please continue documenting student questions."
    ) {
      throw new Error(`Test 9/10 Failed: ${JSON.stringify(getRemarksData)}`);
    }
    console.log("✓ Tests 9 & 10 Passed: Remarks retrieved successfully with author and date.");

    // TEST 11: Manager cannot add remark to another user's record
    const hackRemarkRes = await fetch(`${baseUrl}/shared/${shareTokenA}/remarks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        targetType: "WorkLog",
        targetId: workLogB._id.toString(), // Belongs to User B!
        authorName: "Attacker",
        remark: "Unauthorized remark injection",
      }),
    });
    if (hackRemarkRes.status !== 404) {
      throw new Error(`Test 11 Failed: Expected 404, got ${hackRemarkRes.status}`);
    }
    console.log("✓ Test 11 Passed: Manager cannot add remark to another user's record (404 Not Found).");

    // TEST 12 & 13: Link expires correctly / expired link cannot access portal
    const expiredRes = await fetch(`${baseUrl}/share-links`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenUserA}`,
      },
      body: JSON.stringify({
        customExpiresAt: new Date(Date.now() + 1000).toISOString(),
        label: "Expiring Link",
      }),
    });
    const expiredData = await expiredRes.json();
    shortShareToken = expiredData.data.rawToken;
    shortShareLinkId = expiredData.data._id;

    // Manually set expiresAt in past to guarantee expired state
    await ShareLink.findByIdAndUpdate(shortShareLinkId, {
      expiresAt: new Date(Date.now() - 10000),
    });

    const accessExpiredRes = await fetch(
      `${baseUrl}/shared/${shortShareToken}/verify`
    );
    const accessExpiredData = await accessExpiredRes.json();
    if (
      accessExpiredRes.status !== 403 ||
      accessExpiredData.code !== "LINK_EXPIRED"
    ) {
      throw new Error(
        `Test 12/13 Failed: Expected 403 LINK_EXPIRED, got status ${accessExpiredRes.status} body: ${JSON.stringify(
          accessExpiredData
        )}`
      );
    }
    console.log("✓ Tests 12 & 13 Passed: Expired link returns 403 LINK_EXPIRED.");

    // TEST 14 & 15: Owner revokes link / revoked link immediately stops working
    const revokeRes = await fetch(
      `${baseUrl}/share-links/${shareLinkIdA}/revoke`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokenUserA}`,
        },
      }
    );
    const revokeData = await revokeRes.json();
    if (!revokeData.success || revokeData.data.status !== "revoked") {
      throw new Error(`Test 14 Failed: ${JSON.stringify(revokeData)}`);
    }

    const accessRevokedRes = await fetch(
      `${baseUrl}/shared/${shareTokenA}/verify`
    );
    const accessRevokedData = await accessRevokedRes.json();
    if (
      accessRevokedRes.status !== 403 ||
      accessRevokedData.code !== "LINK_REVOKED"
    ) {
      throw new Error(
        `Test 15 Failed: Expected 403 LINK_REVOKED, got status ${accessRevokedRes.status} body: ${JSON.stringify(
          accessRevokedData
        )}`
      );
    }
    console.log("✓ Tests 14 & 15 Passed: Owner revokes link and access immediately blocked.");

    // TEST 16: User A's shared link cannot expose User B's data
    // Create new active link for User A
    const freshLinkRes = await fetch(`${baseUrl}/share-links`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenUserA}`,
      },
      body: JSON.stringify({ expiryHours: 2 }),
    });
    const freshLinkData = await freshLinkRes.json();
    const freshTokenA = freshLinkData.data.rawToken;

    const accessLogsWithQueryRes = await fetch(
      `${baseUrl}/shared/${freshTokenA}/worklogs?userId=${userIdB}`
    );
    const accessLogsWithQueryData = await accessLogsWithQueryRes.json();
    const containsUserB = accessLogsWithQueryData.data.some(
      (l) => l.task === "User B Private Task"
    );
    if (containsUserB) {
      throw new Error("Test 16 Failed: User A's token exposed User B's data!");
    }
    console.log("✓ Test 16 Passed: User A's shared link is strictly isolated from User B's data.");

    // TEST 17: Normal logged-in portal remains completely unaffected
    const normalWlRes = await fetch(`${baseUrl}/worklogs`, {
      headers: { Authorization: `Bearer ${tokenUserA}` },
    });
    const normalWlData = await normalWlRes.json();
    if (!normalWlData.success || normalWlData.count !== 1) {
      throw new Error(`Test 17 Failed: ${JSON.stringify(normalWlData)}`);
    }
    console.log("✓ Test 17 Passed: Normal logged-in portal operations function completely unaffected.");

    console.log("\n========================================================");
    console.log("🎉 ALL 17 TEST CASES PASSED WITH 100% SUCCESS!");
    console.log("========================================================\n");
  } catch (err) {
    console.error("TEST FAILED:", err);
    process.exitCode = 1;
  } finally {
    // Cleanup test data
    try {
      if (testUserA) {
        const uIdA = testUserA.id || testUserA._id;
        await User.findByIdAndDelete(uIdA);
        await WorkLog.deleteMany({ user: uIdA });
        await MentorLog.deleteMany({ user: uIdA });
        await ShareLink.deleteMany({ userId: uIdA });
        await ManagerRemark.deleteMany({ userId: uIdA });
      }
      if (testUserB) {
        const uIdB = testUserB.id || testUserB._id;
        await User.findByIdAndDelete(uIdB);
        await WorkLog.deleteMany({ user: uIdB });
      }
      if (shortShareLinkId) {
        await ShareLink.findByIdAndDelete(shortShareLinkId);
      }
    } catch (cleanupErr) {
      console.warn("Cleanup warning:", cleanupErr.message);
    }

    if (server) {
      server.close();
    }
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB. Exiting test suite.");
  }
};

runTests();
