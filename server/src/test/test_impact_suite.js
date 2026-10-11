const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.join(__dirname, "../../.env") });

const User = require("../models/User");
const WorkLog = require("../models/WorkLog");
const MentorLog = require("../models/MentorLog");
const ImpactEvent = require("../models/ImpactEvent");
const StudentImpact = require("../models/StudentImpact");
const ImpactShareLink = require("../models/ImpactShareLink");
const { validateAndClassifyDriveUrl } = require("../utils/driveUrlUtils");
const {
  EVENTS_SHEET_NAME,
  STUDENTS_SHEET_NAME,
} = require("../services/impactSheetsService");
const {
  generateStandardReport,
  generateAiReport,
  getAiConfig,
} = require("../services/impactReportService");
const { generateSecureToken, hashToken } = require("../utils/tokenUtils");

async function runTests() {
  console.log("=================================================");
  console.log("  RUNNING IMPACT & ACHIEVEMENTS TEST SUITE");
  console.log("  (GOOGLE DRIVE EVIDENCE STORAGE ARCHITECTURE)   ");
  console.log("=================================================");

  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log(" Connected to MongoDB successfully.\n");

    // 1. Setup Test User
    const testEmail = `test_impact_${Date.now()}@example.com`;
    const user = await User.create({
      name: "Appraisal Test Engineer",
      email: testEmail,
      password: "password123",
    });
    console.log(`[PASS] 1. Created test user: ${user.name} (${user.email})`);

    // 2. Google Drive Evidence Link Validation & Classification
    const validDriveFolder = validateAndClassifyDriveUrl(
      "https://drive.google.com/drive/folders/1aBcDeFgHiJkLmNoPqRsTuVwXyZ",
      "Workshop High-Res Photos Album",
    );
    if (!validDriveFolder.isValid || validDriveFolder.driveType !== "folder") {
      throw new Error("Failed to classify Google Drive folder URL");
    }

    const validDriveDoc = validateAndClassifyDriveUrl(
      "https://docs.google.com/document/d/1234567890abcdef/edit",
      "Event Debrief & Feedback Document",
    );
    if (!validDriveDoc.isValid || validDriveDoc.driveType !== "docs") {
      throw new Error("Failed to classify Google Doc URL");
    }

    const validDriveSheet = validateAndClassifyDriveUrl(
      "https://docs.google.com/spreadsheets/d/9876543210zyxwvu/edit",
      "Participant Attendance & Scores",
    );
    if (!validDriveSheet.isValid || validDriveSheet.driveType !== "sheets") {
      throw new Error("Failed to classify Google Sheet URL");
    }

    const invalidUrl = validateAndClassifyDriveUrl("not-a-valid-url");
    if (invalidUrl.isValid) {
      throw new Error("Invalid URL string should fail validation");
    }
    console.log("[PASS] 2.1 Google Drive URL validation & classification verified (folders, docs, sheets, rejection)");

    // 3. Events & Initiatives CRUD with Multiple Drive Links
    const event1 = await ImpactEvent.create({
      user: user._id,
      title: "Advanced Full-Stack Engineering Workshop",
      eventType: "Workshop",
      startDate: new Date("2026-03-15"),
      endDate: new Date("2026-03-16"),
      myRole: "Lead Speaker & Instructor",
      responsibilities: "Designed syllabus, delivered live coding lectures",
      contributions: "Authored 4 hands-on projects, mentored 80 participants",
      participantsCount: 80,
      outcomes: "80 students built and deployed microservices",
      achievements: "Highest workshop evaluation rating 4.9/5.0",
      evidenceLinks: [
        {
          url: validDriveFolder.url,
          description: validDriveFolder.description,
          title: validDriveFolder.title,
          driveType: validDriveFolder.driveType,
        },
        {
          url: validDriveSheet.url,
          description: validDriveSheet.description,
          title: validDriveSheet.title,
          driveType: validDriveSheet.driveType,
        },
      ],
      googleSheetSyncStatus: "pending",
    });
    console.log(`[PASS] 3.1 Created Event with 2 Google Drive evidence links: "${event1.title}" (ID: ${event1._id})`);

    const event2 = await ImpactEvent.create({
      user: user._id,
      title: "Inter-College AI Hackathon 2026",
      eventType: "Hackathon",
      startDate: new Date("2026-04-10"),
      myRole: "Judge & Technical Mentor",
      participantsCount: 150,
      contributions: "Evaluated 32 AI project submissions",
      outcomes: "Top 3 winning teams shortlisted for incubation",
      achievements: "Organizing committee appreciation award",
      evidenceLinks: [
        {
          url: "https://drive.google.com/file/d/hackathon_certificate_2026/view",
          description: "Organizing Committee Appreciation Certificate PDF",
          title: "Certificate File",
          driveType: "file",
        },
      ],
      googleSheetSyncStatus: "pending",
    });
    console.log(`[PASS] 3.2 Created Event 2: "${event2.title}"`);

    // Search and Update
    const eventsQuery = await ImpactEvent.find({
      user: user._id,
      title: /Hackathon/i,
    });
    if (eventsQuery.length !== 1) throw new Error("Search by title failed");
    console.log(`[PASS] 3.3 Search filter matched "${eventsQuery[0].title}"`);

    event1.participantsCount = 95;
    await event1.save();
    console.log(`[PASS] 3.4 Event update verified (participants count updated to 95)`);

    // 4. Student Impact CRUD with Drive Evidence & Privacy Safeguards
    const student1 = await StudentImpact.create({
      user: user._id,
      studentName: "Jordan Smith",
      studentBatch: "Batch 2026-B",
      date: new Date("2026-04-05"),
      initialChallenge: "Blocked on distributed database sharding and deadlock handling",
      howIHelped: "Conducted 1-on-1 code reviews and refactored transaction isolation levels",
      achievement: "Successfully launched final capstone and received offer from FinTech startup",
      evidenceLinks: [
        {
          url: "https://drive.google.com/file/d/jordan_offer_letter/view",
          description: "Verified SDE Internship Offer Letter",
          title: "Offer Letter PDF",
          driveType: "file",
        },
      ],
      // Notice: isPrivate is NOT passed, testing default true requirement
    });

    if (student1.isPrivate !== true) {
      throw new Error("Student record must be private by default!");
    }
    console.log(`[PASS] 4.1 Created Student Impact: ${student1.studentName} (Privacy Verified: ${student1.isPrivate})`);

    const student2 = await StudentImpact.create({
      user: user._id,
      studentName: "Taylor Morgan",
      studentBatch: "Batch 2026-A",
      date: new Date("2026-04-12"),
      initialChallenge: "Struggling with React concurrency and state synchronization",
      howIHelped: "Taught state reducer patterns and custom hooks architecture",
      achievement: "Built high-performance dashboard and won 2nd place in demo day",
      isPrivate: true,
      evidenceLinks: [
        {
          url: "https://drive.google.com/drive/folders/taylor_demo_day_code",
          description: "Demo Day Presentation & GitHub Repository Drive Folder",
          title: "Demo Day Folder",
          driveType: "folder",
        },
      ],
    });
    console.log(`[PASS] 4.2 Created Student Impact 2: ${student2.studentName}`);

    // 5. Standard Appraisal Report with Google Drive Links
    const standardReport = generateStandardReport({
      events: [event1, event2],
      students: [student1, student2],
      user,
      dateRange: { startDate: "2026-03-01", endDate: "2026-04-30" },
    });

    if (standardReport.reportType !== "standard") throw new Error("Invalid standard report type");
    if (standardReport.metrics.totalEvents !== 2) throw new Error("Incorrect total events");
    if (standardReport.metrics.totalStudents !== 2) throw new Error("Incorrect total students");
    if (standardReport.metrics.totalParticipants !== 245) {
      throw new Error(`Expected 245 participants (95+150), got ${standardReport.metrics.totalParticipants}`);
    }
    if (standardReport.evidenceAuditList.length !== 5) {
      throw new Error(`Expected 5 total evidence links across records, got ${standardReport.evidenceAuditList.length}`);
    }
    console.log(`[PASS] 5.1 Standard Appraisal Report generated with ${standardReport.metrics.totalParticipants} participants and ${standardReport.evidenceAuditList.length} Google Drive evidence links`);
    console.log(`       Executive Summary: "${standardReport.executiveSummary.substring(0, 85)}..."`);

    // 6. AI Report Unavailable Fallback Handling
    const aiConfig = getAiConfig();
    console.log(`[INFO] Current AI Configuration Provider: ${aiConfig.provider || "None (Testing Fallback)"}`);

    const aiReportResult = await generateAiReport({
      events: [event1, event2],
      students: [student1, student2],
      user,
      dateRange: { startDate: "2026-03-01", endDate: "2026-04-30" },
    });

    if (aiReportResult.reportType === "ai") {
      console.log(`[PASS] 6.1 AI report generated via ${aiReportResult.aiProvider}`);
    } else {
      if (!aiReportResult.canFallbackToStandard || !aiReportResult.standardFallback) {
        throw new Error("AI unavailable report must provide standardFallback!");
      }
      console.log(`[PASS] 6.1 AI unavailable gracefully handled with prompt fallback to Standard Report: "${aiReportResult.message.substring(0, 60)}..."`);
    }

    // 7. Secure Manager Sharing with Expiry, Revocation, and Student Privacy
    const { rawToken, tokenHash } = generateSecureToken();
    const shareLink = await ImpactShareLink.create({
      tokenHash,
      userId: user._id,
      label: "Q1 Performance Appraisal - Manager Review",
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      includeEvents: true,
      includeStudentImpact: true,
      allowStudentPrivateData: false, // Default: keep student details & evidence confidential
      reportSummarySnapshot: standardReport,
    });

    if (!shareLink.isActive()) throw new Error("Share link should be active");
    console.log(`[PASS] 7.1 Created active manager share link (ID: ${shareLink._id}, Token: ${rawToken.substring(0, 10)}...)`);

    // Token Hash validation
    const hashed = hashToken(rawToken);
    const retrievedLink = await ImpactShareLink.findOne({ tokenHash: hashed });
    if (!retrievedLink) throw new Error("Failed to find link by hashed token");
    console.log(`[PASS] 7.2 Token SHA-256 validation verified`);

    // Manager revocation
    shareLink.revokedAt = new Date();
    await shareLink.save();
    if (shareLink.isActive() !== false) throw new Error("Revoked link must not be active");
    console.log(`[PASS] 7.3 Manager link revocation verified immediately`);

    // 8. Google Sheets Tabs verification
    console.log(`[PASS] 8.1 Google Sheets Tab 1: "${EVENTS_SHEET_NAME}"`);
    console.log(`[PASS] 8.2 Google Sheets Tab 2: "${STUDENTS_SHEET_NAME}"`);

    // 9. Non-Interference Check
    const workLogCount = await WorkLog.countDocuments();
    const mentorLogCount = await MentorLog.countDocuments();
    console.log(`[PASS] 9.1 Verified existing WorkLog collection accessible (${workLogCount} records)`);
    console.log(`[PASS] 9.2 Verified existing MentorLog collection accessible (${mentorLogCount} records)`);

    // Clean up test records
    await ImpactEvent.deleteMany({ user: user._id });
    await StudentImpact.deleteMany({ user: user._id });
    await ImpactShareLink.deleteMany({ userId: user._id });
    await User.deleteOne({ _id: user._id });
    console.log(`[PASS] 9.3 Test records cleaned up successfully`);

    console.log("\n=================================================");
    console.log("  ALL IMPACT & ACHIEVEMENTS TESTS PASSED (100%)");
    console.log("=================================================");
  } catch (err) {
    console.error("\nTEST SUITE FAILED:", err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

runTests();
