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
  console.log("=== STARTING MANAGER REMARKS VISIBILITY & PERSISTENCE TEST SUITE ===");

  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB for testing.");

  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  baseUrl = `http://localhost:${port}/api`;
  console.log(`Test Express server running at: ${baseUrl}`);

  try {
    // 1. Setup Owner User A and Another User B
    const emailA = `remark_owner_a_${Date.now()}@example.com`;
    const emailB = `remark_owner_b_${Date.now()}@example.com`;

    const regA = await fetch(`${baseUrl}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Owner Alice", email: emailA, password: "password123" }),
    });
    const dataA = await regA.json();
    const tokenA = dataA.data?.token || dataA.token;
    const userA = dataA.data?.user || dataA.user;

    const regB = await fetch(`${baseUrl}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Owner Bob", email: emailB, password: "password123" }),
    });
    const dataB = await regB.json();
    const tokenB = dataB.data?.token || dataB.token;

    console.log("✓ Test Setup: Created Owner Alice and Owner Bob");

    // 2. Create WorkLog and MentorLog for Alice
    const workLogA = await WorkLog.create({
      user: userA.id || userA._id,
      date: new Date("2026-10-18"),
      task: "Implement Microservices Auth Module",
      category: "Development",
      activityType: "Development",
      timeFrom: "09:00",
      timeTo: "12:00",
      spentMinutes: 180,
      status: "Completed",
    });

    const mentorLogA = await MentorLog.create({
      user: userA.id || userA._id,
      workLog: workLogA._id,
      studentBatch: "Batch Alpha 2026",
      subject: "Full-Stack System Design",
      questions: [
        {
          question: "How to design database indexing for large multi-tenant systems?",
          category: "System Design",
          status: "Solved",
          remarks: "Explained multi-key indexes and shard keys",
        },
      ],
    });
    const questionA = mentorLogA.questions[0];

    console.log("✓ Test Setup: Created WorkLog and MentorLog records for Alice");

    // 3. Create Share Link with remarks enabled
    const linkRes = await fetch(`${baseUrl}/share-links`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        expiryHours: 24,
        label: "Sprint 42 Manager Review",
      }),
    });
    const linkData = await linkRes.json();
    const shareLinkA = linkData.data;
    const tokenShare = shareLinkA.rawToken;

    console.log("✓ Test 1 Passed: Generated share link for manager review");

    // 4. Manager submits remark on WorkLog via public share link
    const remarkWlRes = await fetch(`${baseUrl}/shared/${tokenShare}/remarks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        targetType: "WorkLog",
        targetId: workLogA._id,
        remark: "Excellent work on the auth module! Security benchmarks look solid.",
        managerName: "Director Johnson",
      }),
    });
    const remarkWlData = await remarkWlRes.json();
    if (!remarkWlData.success) {
      throw new Error(`Failed to submit WorkLog remark: ${JSON.stringify(remarkWlData)}`);
    }
    const createdRemark1 = remarkWlData.data;
    console.log("✓ Test 2 Passed: Manager submitted remark on WorkLog via shared link");

    // 5. Manager submits remark on MentorLog via public share link
    const remarkMlRes = await fetch(`${baseUrl}/shared/${tokenShare}/remarks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        targetType: "MentorLog",
        targetId: questionA._id,
        remark: "Clear explanation provided to students on indexing.",
        managerName: "Director Johnson",
      }),
    });
    const remarkMlData = await remarkMlRes.json();
    if (!remarkMlData.success) {
      throw new Error(`Failed to submit MentorLog remark: ${JSON.stringify(remarkMlData)}`);
    }
    const createdRemark2 = remarkMlData.data;
    console.log("✓ Test 3 Passed: Manager submitted remark on MentorLog question via shared link");

    // 6. Check unread count endpoint for Alice
    const unreadRes1 = await fetch(`${baseUrl}/share-links/remarks/unread-count`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const unreadData1 = await unreadRes1.json();
    if (unreadData1.unreadCount !== 2) {
      throw new Error(`Expected 2 unread remarks, got ${unreadData1.unreadCount}`);
    }
    console.log("✓ Test 4 Passed: Unread remarks count correctly reports 2 unread remarks");

    // 7. Owner Alice retrieves remarks via authenticated API
    const getRemarksRes = await fetch(`${baseUrl}/share-links/remarks`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const getRemarksData = await getRemarksRes.json();
    if (!getRemarksData.success || getRemarksData.total !== 2) {
      throw new Error(`Expected 2 remarks in owner remarks API, got: ${JSON.stringify(getRemarksData)}`);
    }
    const fetchedRemarks = getRemarksData.data;
    const r1 = fetchedRemarks.find((r) => r._id === createdRemark1._id);
    const r2 = fetchedRemarks.find((r) => r._id === createdRemark2._id);

    if (!r1 || !r2) throw new Error("Could not find both created remarks in owner API response");
    if (r1.isRead !== false || r2.isRead !== false) throw new Error("Newly created remarks should be unread");
    if (!r1.targetTitle.includes("Microservices Auth Module")) {
      throw new Error(`Expected targetTitle to include task name, got: ${r1.targetTitle}`);
    }
    if (r1.shareLinkLabel !== "Sprint 42 Manager Review") {
      throw new Error(`Expected shareLinkLabel 'Sprint 42 Manager Review', got: ${r1.shareLinkLabel}`);
    }
    console.log("✓ Test 5 Passed: Owner Alice retrieved remarks with enriched title, label, and unread status");

    // 8. Owner Alice marks remark 1 as read
    const markReadRes = await fetch(`${baseUrl}/share-links/remarks/${r1._id}/read`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const markReadData = await markReadRes.json();
    if (!markReadData.success || markReadData.data.isRead !== true || !markReadData.data.readAt) {
      throw new Error(`Failed to mark remark as read: ${JSON.stringify(markReadData)}`);
    }

    // Check unread count is now 1
    const unreadRes2 = await fetch(`${baseUrl}/share-links/remarks/unread-count`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const unreadData2 = await unreadRes2.json();
    if (unreadData2.unreadCount !== 1) {
      throw new Error(`Expected 1 unread remark after marking one read, got: ${unreadData2.unreadCount}`);
    }
    console.log("✓ Test 6 Passed: Owner marked single remark as read; unread count decremented to 1");

    // 9. Verify Filtering by isRead
    const unreadFilterRes = await fetch(`${baseUrl}/share-links/remarks?isRead=false`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const unreadFilterData = await unreadFilterRes.json();
    if (unreadFilterData.count !== 1 || unreadFilterData.data[0]._id !== r2._id) {
      throw new Error(`Unread filter returned unexpected records: ${JSON.stringify(unreadFilterData)}`);
    }

    const readFilterRes = await fetch(`${baseUrl}/share-links/remarks?isRead=true`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const readFilterData = await readFilterRes.json();
    if (readFilterData.count !== 1 || readFilterData.data[0]._id !== r1._id) {
      throw new Error(`Read filter returned unexpected records: ${JSON.stringify(readFilterData)}`);
    }
    console.log("✓ Test 7 Passed: Filter by isRead=false and isRead=true works accurately");

    // 10. Multi-tenant isolation: Owner Bob cannot see or modify Alice's remarks
    const bobRemarksRes = await fetch(`${baseUrl}/share-links/remarks`, {
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    const bobRemarksData = await bobRemarksRes.json();
    if (bobRemarksData.total !== 0 || bobRemarksData.data.length !== 0) {
      throw new Error("Bob saw remarks belonging to Alice! Multi-tenant isolation failure.");
    }

    const bobTamperRes = await fetch(`${baseUrl}/share-links/remarks/${r2._id}/read`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    if (bobTamperRes.status !== 404 && bobTamperRes.status !== 403) {
      throw new Error(`Bob was able to mark Alice's remark as read! Status: ${bobTamperRes.status}`);
    }
    console.log("✓ Test 8 Passed: Strict user authorization and multi-tenant isolation enforced");

    // 11. CRITICAL REQUIREMENT: Share-link expiry must NOT delete or hide remarks from the owner!
    // Manually expire the share link
    await ShareLink.findByIdAndUpdate(shareLinkA._id, {
      expiresAt: new Date(Date.now() - 60000), // 1 minute in the past
    });

    // Verify manager cannot access expired link
    const managerExpiredAccess = await fetch(`${baseUrl}/shared/${tokenShare}/verify`);
    if (managerExpiredAccess.status !== 403) {
      throw new Error(`Expected 403 for expired link access, got: ${managerExpiredAccess.status}`);
    }

    // Verify owner STILL sees all remarks even though link expired
    const remarksAfterExpiryRes = await fetch(`${baseUrl}/share-links/remarks`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const remarksAfterExpiryData = await remarksAfterExpiryRes.json();
    if (!remarksAfterExpiryData.success || remarksAfterExpiryData.total !== 2) {
      throw new Error(`Expected 2 remarks after link expiry, got: ${JSON.stringify(remarksAfterExpiryData)}`);
    }
    console.log("✓ Test 9 Passed: Share link expiry blocks manager access while owner retains 100% of remark history");

    // 12. CRITICAL REQUIREMENT: Share-link revocation must NOT delete or hide remarks from the owner!
    // Revoke the share link
    await fetch(`${baseUrl}/share-links/${shareLinkA._id}/revoke`, {
      method: "POST",
      headers: { Authorization: `Bearer ${tokenA}` },
    });

    // Verify owner STILL sees all remarks after revocation
    const remarksAfterRevokeRes = await fetch(`${baseUrl}/share-links/remarks`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const remarksAfterRevokeData = await remarksAfterRevokeRes.json();
    if (!remarksAfterRevokeData.success || remarksAfterRevokeData.total !== 2) {
      throw new Error(`Expected 2 remarks after revocation, got: ${JSON.stringify(remarksAfterRevokeData)}`);
    }
    console.log("✓ Test 10 Passed: Share link revocation keeps owner remarks completely intact and accessible");

    // 13. Owner calls Mark All As Read
    const markAllRes = await fetch(`${baseUrl}/share-links/remarks/read-all`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const markAllData = await markAllRes.json();
    if (!markAllData.success || markAllData.modifiedCount !== 1) {
      throw new Error(`Expected 1 modified document in mark-all-read, got: ${JSON.stringify(markAllData)}`);
    }

    const unreadRes3 = await fetch(`${baseUrl}/share-links/remarks/unread-count`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const unreadData3 = await unreadRes3.json();
    if (unreadData3.unreadCount !== 0) {
      throw new Error(`Expected 0 unread remarks after mark-all-read, got: ${unreadData3.unreadCount}`);
    }
    console.log("✓ Test 11 Passed: Mark all remarks as read sets unread count to 0");

    // 14. Verify direct MongoDB persistence
    const targetUserId = userA.id || userA._id;
    const dbRemarks = await ManagerRemark.find({ userId: targetUserId });
    if (dbRemarks.length !== 2) {
      throw new Error(`Direct MongoDB check failed: expected 2 remarks, found ${dbRemarks.length}`);
    }
    if (!dbRemarks.every((r) => r.isRead === true)) {
      throw new Error("Direct MongoDB check failed: not all remarks have isRead === true");
    }
    console.log("✓ Test 12 Passed: Remarks are permanently saved in MongoDB with correct owner userId");

    console.log("\n========================================================");
    console.log("🎉 ALL 12 MANAGER REMARKS VISIBILITY TESTS PASSED WITH 100% SUCCESS!");
    console.log("========================================================\n");
  } catch (error) {
    console.error("❌ TEST FAILED:", error);
    process.exitCode = 1;
  } finally {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB.");
  }
};

runTests();
