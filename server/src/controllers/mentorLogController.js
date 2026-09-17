const MentorLog = require("../models/MentorLog");
const WorkLog = require("../models/WorkLog");
const {
  appendMentorQuestionRows,
  updateMentorQuestionRow,
  deleteMentorQuestionRow,
} = require("../services/mentorSheetsService");
const { getOrCreateUserSpreadsheet } = require("../services/googleSheetsService");

const isMentoringWorkLog = (log) => {
  if (!log) return false;
  const activity = (log.activityType || "").toLowerCase();
  const category = (log.category || "").toLowerCase();
  const task = (log.task || "").toLowerCase();

  return (
    activity === "mentoring session" ||
    activity === "mentoring" ||
    activity === "doubt clarification" ||
    activity.includes("mentor") ||
    category.includes("mentor") ||
    task.includes("mentor")
  );
};

// 1. Get eligible WorkLog sessions for a specific date
const getEligibleWorkLogs = async (req, res) => {
  try {
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({
        success: false,
        message: "Date query parameter is required (YYYY-MM-DD)",
      });
    }

    const startDate = new Date(`${date}T00:00:00.000Z`);
    const endDate = new Date(`${date}T23:59:59.999Z`);

    const workLogs = await WorkLog.find({
      user: req.user._id,
      date: { $gte: startDate, $lte: endDate },
    }).sort({ timeFrom: 1 });

    // Filter to mentoring sessions
    const eligibleLogs = workLogs.filter(isMentoringWorkLog);

    // Also check if any existing mentor log is already linked to these worklogs
    const workLogIds = eligibleLogs.map((l) => l._id);
    const existingMentorLogs = await MentorLog.find({
      user: req.user._id,
      workLog: { $in: workLogIds },
    });

    const mentorLogMap = new Map();
    existingMentorLogs.forEach((m) => {
      mentorLogMap.set(m.workLog.toString(), m._id);
    });

    const data = eligibleLogs.map((l) => ({
      _id: l._id,
      date: l.date,
      task: l.task,
      category: l.category,
      activityType: l.activityType,
      timeFrom: l.timeFrom,
      timeTo: l.timeTo,
      spentMinutes: l.spentMinutes,
      hallSection: l.hallSection,
      status: l.status,
      priority: l.priority,
      hasMentorLog: mentorLogMap.has(l._id.toString()),
      mentorLogId: mentorLogMap.get(l._id.toString()) || null,
    }));

    res.status(200).json({
      success: true,
      count: data.length,
      data,
    });
  } catch (error) {
    console.error("Error fetching eligible work logs:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// 2. Create Mentor Log for an existing WorkLog
const createMentorLog = async (req, res) => {
  try {
    const { workLogId, studentBatch, subject, questions = [] } = req.body;

    if (!workLogId) {
      return res.status(400).json({
        success: false,
        message: "WorkLog ID is required",
      });
    }

    if (!studentBatch || !studentBatch.trim()) {
      return res.status(400).json({
        success: false,
        message: "Student / Batch is required",
      });
    }

    if (!subject || !subject.trim()) {
      return res.status(400).json({
        success: false,
        message: "Subject is required",
      });
    }

    const workLog = await WorkLog.findOne({
      _id: workLogId,
      user: req.user._id,
    });

    if (!workLog) {
      return res.status(404).json({
        success: false,
        message: "Associated Work Log not found or unauthorized",
      });
    }

    // Check if already exists
    const existing = await MentorLog.findOne({
      workLog: workLogId,
      user: req.user._id,
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: "Mentoring details already exist for this Work Log",
        data: existing,
      });
    }

    const mentorLog = await MentorLog.create({
      user: req.user._id,
      workLog: workLogId,
      studentBatch: studentBatch.trim(),
      subject: subject.trim(),
      questions: questions.map((q) => ({
        question: q.question?.trim() || "",
        category: q.category?.trim() || "Concept Clarification",
        status: q.status === "Carry Forward" ? "Carry Forward" : "Solved",
        resolution: q.resolution?.trim() || "",
        remarks: q.remarks?.trim() || "",
      })),
    });

    // Sync questions to Google Sheet
    let sheetsSynced = false;
    if (mentorLog.questions && mentorLog.questions.length > 0) {
      try {
        const spreadsheetId = await getOrCreateUserSpreadsheet(req.user);
        const rowResults = await appendMentorQuestionRows(
          spreadsheetId,
          workLog,
          mentorLog,
          mentorLog.questions,
        );
        for (const resItem of rowResults) {
          if (resItem.rowNumber) {
            await MentorLog.updateOne(
              { _id: mentorLog._id, "questions._id": resItem.questionId },
              {
                $set: {
                  "questions.$.googleSheetRowNumber": resItem.rowNumber,
                  "questions.$.googleSheetSyncStatus": "synced",
                },
              },
            );
          }
        }
        sheetsSynced = rowResults.every((r) => Boolean(r.rowNumber));
      } catch (err) {
        console.error("Google Sheets mentor sync failed:", err.message);
        sheetsSynced = false;
        await MentorLog.updateOne(
          { _id: mentorLog._id },
          { $set: { "questions.$[].googleSheetSyncStatus": "failed" } },
        );
      }
    } else {
      sheetsSynced = true;
    }

    const populated = await MentorLog.findById(mentorLog._id).populate(
      "workLog",
    );

    res.status(201).json({
      success: true,
      sheetsSynced,
      message: sheetsSynced
        ? "Mentor log recorded and synced to Google Sheets"
        : "Mentor log recorded, Google Sheets sync pending",
      data: populated,
    });
  } catch (error) {
    console.error("Error creating mentor log:", error);
    res.status(400).json({
      success: false,
      sheetsSynced: false,
      message: error.message,
    });
  }
};

// 3. Get all Mentor Logs for logged-in user
const getMentorLogs = async (req, res) => {
  try {
    const mentorLogs = await MentorLog.find({ user: req.user._id })
      .populate("workLog")
      .sort({ createdAt: -1 });

    // Filter out any where parent workLog was deleted
    const validLogs = mentorLogs.filter((m) => Boolean(m.workLog));

    res.status(200).json({
      success: true,
      count: validLogs.length,
      data: validLogs,
    });
  } catch (error) {
    console.error("Error fetching mentor logs:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// 4. Get Mentor Log by ID
const getMentorLogById = async (req, res) => {
  try {
    const mentorLog = await MentorLog.findOne({
      _id: req.params.id,
      user: req.user._id,
    }).populate("workLog");

    if (!mentorLog) {
      return res.status(404).json({
        success: false,
        message: "Mentor log not found",
      });
    }

    res.status(200).json({
      success: true,
      data: mentorLog,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// 5. Add a Question to an existing Mentor Log
const addQuestion = async (req, res) => {
  try {
    const { question, category, status, resolution, remarks } = req.body;

    const mentorLog = await MentorLog.findOne({
      _id: req.params.id,
      user: req.user._id,
    }).populate("workLog");

    if (!mentorLog) {
      return res.status(404).json({
        success: false,
        message: "Mentor log not found",
      });
    }

    const newQuestion = {
      question: question?.trim() || "",
      category: category?.trim() || "Concept Clarification",
      status: status === "Carry Forward" ? "Carry Forward" : "Solved",
      resolution: resolution?.trim() || "",
      remarks: remarks?.trim() || "",
      googleSheetSyncStatus: "pending",
    };

    mentorLog.questions.push(newQuestion);
    await mentorLog.save();

    const createdQuestion =
      mentorLog.questions[mentorLog.questions.length - 1];

    let sheetsSynced = false;
    if (mentorLog.workLog) {
      try {
        const spreadsheetId = await getOrCreateUserSpreadsheet(req.user);
        const rowResults = await appendMentorQuestionRows(
          spreadsheetId,
          mentorLog.workLog,
          mentorLog,
          [createdQuestion],
        );
        if (rowResults[0]?.rowNumber) {
          await MentorLog.updateOne(
            { _id: mentorLog._id, "questions._id": createdQuestion._id },
            {
              $set: {
                "questions.$.googleSheetRowNumber": rowResults[0].rowNumber,
                "questions.$.googleSheetSyncStatus": "synced",
              },
            },
          );
          sheetsSynced = true;
        }
      } catch (err) {
        console.error("Google Sheets question append failed:", err.message);
        await MentorLog.updateOne(
          { _id: mentorLog._id, "questions._id": createdQuestion._id },
          { $set: { "questions.$.googleSheetSyncStatus": "failed" } },
        );
      }
    }

    const refreshed = await MentorLog.findById(mentorLog._id).populate(
      "workLog",
    );

    res.status(201).json({
      success: true,
      sheetsSynced,
      message: sheetsSynced
        ? "Question added and synced to Google Sheets"
        : "Question added, Google Sheets sync pending",
      data: refreshed,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      sheetsSynced: false,
      message: error.message,
    });
  }
};

// 6. Update a Question in-place
const updateQuestion = async (req, res) => {
  try {
    const { question, category, status, resolution, remarks } = req.body;
    const { id, questionId } = req.params;

    const mentorLog = await MentorLog.findOne({
      _id: id,
      user: req.user._id,
    }).populate("workLog");

    if (!mentorLog) {
      return res.status(404).json({
        success: false,
        message: "Mentor log not found",
      });
    }

    const targetQuestion = mentorLog.questions.id(questionId);
    if (!targetQuestion) {
      return res.status(404).json({
        success: false,
        message: "Question not found",
      });
    }

    if (question !== undefined) targetQuestion.question = question.trim();
    if (category !== undefined) targetQuestion.category = category.trim();
    if (status !== undefined) targetQuestion.status = status;
    if (resolution !== undefined)
      targetQuestion.resolution = resolution.trim();
    if (remarks !== undefined) targetQuestion.remarks = remarks.trim();
    targetQuestion.googleSheetSyncStatus = "pending";

    await mentorLog.save();

    let sheetsSynced = false;
    if (mentorLog.workLog) {
      try {
        const spreadsheetId = await getOrCreateUserSpreadsheet(req.user);

        if (
          targetQuestion.googleSheetRowNumber &&
          targetQuestion.googleSheetRowNumber >= 2
        ) {
          await updateMentorQuestionRow(
            spreadsheetId,
            mentorLog.workLog,
            mentorLog,
            targetQuestion,
            targetQuestion.googleSheetRowNumber,
          );
          sheetsSynced = true;
        } else {
          const rowResults = await appendMentorQuestionRows(
            spreadsheetId,
            mentorLog.workLog,
            mentorLog,
            [targetQuestion],
          );
          if (rowResults[0]?.rowNumber) {
            targetQuestion.googleSheetRowNumber = rowResults[0].rowNumber;
            sheetsSynced = true;
          }
        }

        if (sheetsSynced) {
          await MentorLog.updateOne(
            { _id: mentorLog._id, "questions._id": targetQuestion._id },
            {
              $set: {
                "questions.$.googleSheetRowNumber":
                  targetQuestion.googleSheetRowNumber,
                "questions.$.googleSheetSyncStatus": "synced",
              },
            },
          );
        }
      } catch (err) {
        console.error("Google Sheets question update failed:", err.message);
        await MentorLog.updateOne(
          { _id: mentorLog._id, "questions._id": targetQuestion._id },
          { $set: { "questions.$.googleSheetSyncStatus": "failed" } },
        );
      }
    }

    const refreshed = await MentorLog.findById(mentorLog._id).populate(
      "workLog",
    );

    res.status(200).json({
      success: true,
      sheetsSynced,
      message: sheetsSynced
        ? "Question updated and synced to Google Sheets"
        : "Question updated, Google Sheets sync pending",
      data: refreshed,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      sheetsSynced: false,
      message: error.message,
    });
  }
};

// 7. Delete a Question
const deleteQuestion = async (req, res) => {
  try {
    const { id, questionId } = req.params;

    const mentorLog = await MentorLog.findOne({
      _id: id,
      user: req.user._id,
    });

    if (!mentorLog) {
      return res.status(404).json({
        success: false,
        message: "Mentor log not found",
      });
    }

    const targetQuestion = mentorLog.questions.id(questionId);
    if (!targetQuestion) {
      return res.status(404).json({
        success: false,
        message: "Question not found",
      });
    }

    const rowNumber = targetQuestion.googleSheetRowNumber;

    // Delete Google Sheets row first if exists
    if (rowNumber && rowNumber >= 2) {
      try {
        const spreadsheetId = await getOrCreateUserSpreadsheet(req.user);
        await deleteMentorQuestionRow(spreadsheetId, rowNumber, req.user._id);
      } catch (err) {
        console.error("Google Sheets question delete failed:", err.message);
        await MentorLog.updateOne(
          { _id: mentorLog._id, "questions._id": questionId },
          { $set: { "questions.$.googleSheetSyncStatus": "failed" } },
        );
        return res.status(502).json({
          success: false,
          sheetsSynced: false,
          message: "Google Sheets sync failed — will retry",
        });
      }
    }

    // Remove subdocument
    mentorLog.questions.pull(questionId);
    await mentorLog.save();

    const refreshed = await MentorLog.findById(mentorLog._id).populate(
      "workLog",
    );

    res.status(200).json({
      success: true,
      sheetsSynced: true,
      message: "Question deleted successfully",
      data: refreshed,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      sheetsSynced: false,
      message: error.message,
    });
  }
};

// 8. Delete an entire Mentor Log
const deleteMentorLog = async (req, res) => {
  try {
    const mentorLog = await MentorLog.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!mentorLog) {
      return res.status(404).json({
        success: false,
        message: "Mentor log not found",
      });
    }

    // Collect sheet rows and delete in descending order
    const rowNumbers = mentorLog.questions
      .map((q) => q.googleSheetRowNumber)
      .filter((r) => r && r >= 2)
      .sort((a, b) => b - a);

    if (rowNumbers.length > 0) {
      const spreadsheetId = await getOrCreateUserSpreadsheet(req.user);
      for (const r of rowNumbers) {
        try {
          await deleteMentorQuestionRow(spreadsheetId, r, req.user._id);
        } catch (err) {
          console.error(`Failed to delete sheet row ${r}:`, err.message);
          return res.status(502).json({
            success: false,
            sheetsSynced: false,
            message: "Failed to delete rows from Google Sheets — will retry",
          });
        }
      }
    }

    await MentorLog.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      sheetsSynced: true,
      message: "Mentor log deleted successfully",
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      sheetsSynced: false,
      message: error.message,
    });
  }
};

// 9. Retry Google Sheets Sync for a Mentor Log
const retryMentorSheetsSync = async (req, res) => {
  try {
    const mentorLog = await MentorLog.findOne({
      _id: req.params.id,
      user: req.user._id,
    }).populate("workLog");

    if (!mentorLog) {
      return res.status(404).json({
        success: false,
        message: "Mentor log not found",
      });
    }

    if (!mentorLog.workLog) {
      return res.status(400).json({
        success: false,
        message: "Associated WorkLog not found",
      });
    }

    let allSynced = true;
    const spreadsheetId = await getOrCreateUserSpreadsheet(req.user);

    for (const q of mentorLog.questions) {
      if (!q.googleSheetRowNumber || q.googleSheetSyncStatus !== "synced") {
        try {
          if (q.googleSheetRowNumber && q.googleSheetRowNumber >= 2) {
            await updateMentorQuestionRow(
              spreadsheetId,
              mentorLog.workLog,
              mentorLog,
              q,
              q.googleSheetRowNumber,
            );
            await MentorLog.updateOne(
              { _id: mentorLog._id, "questions._id": q._id },
              { $set: { "questions.$.googleSheetSyncStatus": "synced" } },
            );
          } else {
            const results = await appendMentorQuestionRows(
              spreadsheetId,
              mentorLog.workLog,
              mentorLog,
              [q],
            );
            if (results[0]?.rowNumber) {
              await MentorLog.updateOne(
                { _id: mentorLog._id, "questions._id": q._id },
                {
                  $set: {
                    "questions.$.googleSheetRowNumber": results[0].rowNumber,
                    "questions.$.googleSheetSyncStatus": "synced",
                  },
                },
              );
            } else {
              allSynced = false;
            }
          }
        } catch (syncErr) {
          console.error("Retry sync question error:", syncErr.message);
          allSynced = false;
        }
      }
    }

    const refreshed = await MentorLog.findById(mentorLog._id).populate(
      "workLog",
    );

    res.status(200).json({
      success: true,
      sheetsSynced: allSynced,
      message: allSynced
        ? "All questions synchronized to Google Sheets"
        : "Some questions could not be synced to Google Sheets — will retry",
      data: refreshed,
    });
  } catch (error) {
    console.error("Retry mentor sheets sync error:", error);
    res.status(500).json({
      success: false,
      sheetsSynced: false,
      message: error.message,
    });
  }
};

// 10. Weekly Mentoring Summary
const getWeeklyMentoringSummary = async (req, res) => {
  try {
    const { weekStart } = req.query;

    if (!weekStart) {
      return res.status(400).json({
        success: false,
        message: "weekStart parameter is required (YYYY-MM-DD)",
      });
    }

    const [year, month, day] = weekStart.split("-").map(Number);
    const start = new Date(year, month - 1, day, 0, 0, 0, 0);
    const end = new Date(year, month - 1, day + 6, 23, 59, 59, 999);

    const mentorLogs = await MentorLog.find({ user: req.user._id })
      .populate("workLog")
      .sort({ "workLog.date": 1, "workLog.timeFrom": 1 });

    const filtered = mentorLogs.filter((m) => {
      if (!m.workLog || !m.workLog.date) return false;
      const d = new Date(m.workLog.date);
      return d >= start && d <= end;
    });

    const totalSessions = filtered.length;
    const totalMentoringMinutes = filtered.reduce(
      (acc, m) => acc + (m.workLog?.spentMinutes || 0),
      0,
    );

    let totalQuestions = 0;
    let solvedQuestions = 0;
    let carryForwardQuestions = 0;

    const subjectMap = new Map();
    const categoryMap = new Map();
    const proofOfWork = [];

    filtered.forEach((m) => {
      const subj = m.subject || "General";
      if (!subjectMap.has(subj)) {
        subjectMap.set(subj, {
          subject: subj,
          totalQuestions: 0,
          solved: 0,
          carryForward: 0,
          sessions: 0,
        });
      }
      const subjStat = subjectMap.get(subj);
      subjStat.sessions += 1;

      (m.questions || []).forEach((q) => {
        totalQuestions += 1;
        subjStat.totalQuestions += 1;

        if (q.status === "Solved") {
          solvedQuestions += 1;
          subjStat.solved += 1;
        } else {
          carryForwardQuestions += 1;
          subjStat.carryForward += 1;
        }

        const cat = q.category || "General";
        if (!categoryMap.has(cat)) {
          categoryMap.set(cat, {
            category: cat,
            totalQuestions: 0,
            solved: 0,
            carryForward: 0,
          });
        }
        const catStat = categoryMap.get(cat);
        catStat.totalQuestions += 1;
        if (q.status === "Solved") {
          catStat.solved += 1;
        } else {
          catStat.carryForward += 1;
        }

        proofOfWork.push({
          date: m.workLog?.date,
          workLogTask: m.workLog?.task || "",
          studentBatch: m.studentBatch,
          subject: m.subject,
          question: q.question,
          category: q.category,
          status: q.status,
          resolution: q.resolution,
          remarks: q.remarks,
        });
      });
    });

    const formatHours = (mins) => {
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      if (h === 0 && m === 0) return "0m";
      if (h === 0) return `${m}m`;
      if (m === 0) return `${h}h`;
      return `${h}h ${m}m`;
    };

    res.status(200).json({
      success: true,
      data: {
        weekStart,
        totalSessions,
        totalMentoringMinutes,
        totalMentoringHours: formatHours(totalMentoringMinutes),
        totalQuestions,
        solvedQuestions,
        carryForwardQuestions,
        subjectBreakdown: Array.from(subjectMap.values()).sort(
          (a, b) => b.totalQuestions - a.totalQuestions,
        ),
        categoryBreakdown: Array.from(categoryMap.values()).sort(
          (a, b) => b.totalQuestions - a.totalQuestions,
        ),
        proofOfWork,
      },
    });
  } catch (error) {
    console.error("Error generating weekly mentoring summary:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// 10. Monthly Mentoring Summary
const getMonthlyMentoringSummary = async (req, res) => {
  try {
    const { year, month } = req.query;

    if (!year || !month) {
      return res.status(400).json({
        success: false,
        message: "year and month parameters are required",
      });
    }

    const y = Number(year);
    const m = Number(month);
    const start = new Date(y, m - 1, 1, 0, 0, 0, 0);
    const end = new Date(y, m, 0, 23, 59, 59, 999);

    const mentorLogs = await MentorLog.find({ user: req.user._id })
      .populate("workLog")
      .sort({ "workLog.date": 1, "workLog.timeFrom": 1 });

    const filtered = mentorLogs.filter((item) => {
      if (!item.workLog || !item.workLog.date) return false;
      const d = new Date(item.workLog.date);
      return d >= start && d <= end;
    });

    const totalSessions = filtered.length;
    const totalMentoringMinutes = filtered.reduce(
      (acc, item) => acc + (item.workLog?.spentMinutes || 0),
      0,
    );

    let totalQuestions = 0;
    let solvedQuestions = 0;
    let carryForwardQuestions = 0;

    const subjectMap = new Map();
    const categoryMap = new Map();
    const proofOfWork = [];

    filtered.forEach((item) => {
      const subj = item.subject || "General";
      if (!subjectMap.has(subj)) {
        subjectMap.set(subj, {
          subject: subj,
          totalQuestions: 0,
          solved: 0,
          carryForward: 0,
          sessions: 0,
        });
      }
      const subjStat = subjectMap.get(subj);
      subjStat.sessions += 1;

      (item.questions || []).forEach((q) => {
        totalQuestions += 1;
        subjStat.totalQuestions += 1;

        if (q.status === "Solved") {
          solvedQuestions += 1;
          subjStat.solved += 1;
        } else {
          carryForwardQuestions += 1;
          subjStat.carryForward += 1;
        }

        const cat = q.category || "General";
        if (!categoryMap.has(cat)) {
          categoryMap.set(cat, {
            category: cat,
            totalQuestions: 0,
            solved: 0,
            carryForward: 0,
          });
        }
        const catStat = categoryMap.get(cat);
        catStat.totalQuestions += 1;
        if (q.status === "Solved") {
          catStat.solved += 1;
        } else {
          catStat.carryForward += 1;
        }

        proofOfWork.push({
          date: item.workLog?.date,
          workLogTask: item.workLog?.task || "",
          studentBatch: item.studentBatch,
          subject: item.subject,
          question: q.question,
          category: q.category,
          status: q.status,
          resolution: q.resolution,
          remarks: q.remarks,
        });
      });
    });

    const formatHours = (mins) => {
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      if (h === 0 && m === 0) return "0m";
      if (h === 0) return `${m}m`;
      if (m === 0) return `${h}h`;
      return `${h}h ${m}m`;
    };

    res.status(200).json({
      success: true,
      data: {
        year: y,
        month: m,
        totalSessions,
        totalMentoringMinutes,
        totalMentoringHours: formatHours(totalMentoringMinutes),
        totalQuestions,
        solvedQuestions,
        carryForwardQuestions,
        subjectBreakdown: Array.from(subjectMap.values()).sort(
          (a, b) => b.totalQuestions - a.totalQuestions,
        ),
        categoryBreakdown: Array.from(categoryMap.values()).sort(
          (a, b) => b.totalQuestions - a.totalQuestions,
        ),
        proofOfWork,
      },
    });
  } catch (error) {
    console.error("Error generating monthly mentoring summary:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  getEligibleWorkLogs,
  createMentorLog,
  getMentorLogs,
  getMentorLogById,
  addQuestion,
  updateQuestion,
  deleteQuestion,
  deleteMentorLog,
  retryMentorSheetsSync,
  getWeeklyMentoringSummary,
  getMonthlyMentoringSummary,
};
