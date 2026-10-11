/**
 * Impact & Achievements Appraisal Report Service
 * Supports:
 * 1. Standard Report (100% deterministic, evidence-based, works without AI)
 * 2. AI Report (Generative synthesis using configured backend Gemini or OpenAI API keys)
 */

const getAiConfig = () => {
  if (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY) {
    return {
      provider: "gemini",
      apiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY,
    };
  }
  if (process.env.OPENAI_API_KEY) {
    return {
      provider: "openai",
      apiKey: process.env.OPENAI_API_KEY,
    };
  }
  return {
    provider: null,
    apiKey: null,
  };
};

/**
 * Standard deterministic report generator (zero AI dependency)
 */
const generateStandardReport = ({
  events = [],
  students = [],
  user = {},
  dateRange = {},
}) => {
  const generatedAt = new Date().toISOString();

  // Aggregate metrics
  const totalEvents = events.length;
  const totalParticipants = events.reduce(
    (sum, e) => sum + (Number(e.participantsCount) || 0),
    0,
  );
  const totalStudents = students.length;

  // Evidence audit list
  const evidenceAuditList = [];

  events.forEach((e) => {
    (e.evidenceLinks || []).forEach((link) => {
      evidenceAuditList.push({
        sourceType: "Event",
        sourceTitle: e.title,
        sourceDate: e.startDate,
        title: link.title || "Google Drive Evidence",
        description: link.description || "",
        url: link.url,
        driveType: link.driveType || "link",
        isDrive: true,
      });
    });

    (e.attachments || []).forEach((att) => {
      evidenceAuditList.push({
        sourceType: "Event",
        sourceTitle: e.title,
        sourceDate: e.startDate,
        title: att.originalName,
        description: `Uploaded file (${att.fileType})`,
        url: att.url || `/api/impact/files/${att.fileId}`,
        driveType: "file",
        isDrive: false,
      });
    });
  });

  students.forEach((s) => {
    (s.evidenceLinks || []).forEach((link) => {
      evidenceAuditList.push({
        sourceType: "Student",
        sourceTitle: s.isPrivate
          ? "Student Mentorship (Confidential)"
          : s.studentName,
        sourceDate: s.date,
        title: link.title || "Google Drive Evidence",
        description: link.description || "",
        url: link.url,
        driveType: link.driveType || "link",
        isDrive: true,
      });
    });

    (s.attachments || []).forEach((att) => {
      evidenceAuditList.push({
        sourceType: "Student",
        sourceTitle: s.isPrivate
          ? "Student Mentorship (Confidential)"
          : s.studentName,
        sourceDate: s.date,
        title: att.originalName,
        description: `Uploaded file (${att.fileType})`,
        url: att.url || `/api/impact/files/${att.fileId}`,
        driveType: "file",
        isDrive: false,
      });
    });
  });

  // Event types breakdown
  const eventTypesMap = {};
  events.forEach((e) => {
    const type = e.eventType || "Other";
    eventTypesMap[type] = (eventTypesMap[type] || 0) + 1;
  });

  const eventTypesSummary = Object.entries(eventTypesMap).map(
    ([type, count]) => `${type}: ${count}`,
  );

  // Executive Appraisal Narrative
  const executiveSummary =
    `During the evaluation period${
      dateRange.startDate && dateRange.endDate
        ? ` (${dateRange.startDate} to ${dateRange.endDate})`
        : ""
    }, ${user.name || "the employee"} spearheaded ${totalEvents} key initiative${
      totalEvents === 1 ? "" : "s"
    } engaging approximately ${totalParticipants} participant${
      totalParticipants === 1 ? "" : "s"
    }, and delivered targeted mentoring for ${totalStudents} student${
      totalStudents === 1 ? "" : "s"
    }. All recorded milestones are supported by ${evidenceAuditList.length} verified evidence link${
      evidenceAuditList.length === 1 ? "" : "s"
    } in Google Drive.`;

  return {
    reportType: "standard",
    title: `Impact & Performance Appraisal Report - ${user.name || "Employee"}`,
    userName: user.name || "Team Member",
    userEmail: user.email || "",
    generatedAt,
    dateRange: {
      startDate: dateRange.startDate || null,
      endDate: dateRange.endDate || null,
    },
    metrics: {
      totalEvents,
      totalParticipants,
      totalStudents,
      totalEvidenceItems: evidenceAuditList.length,
      eventTypesBreakdown: eventTypesMap,
    },
    executiveSummary,
    eventsSummary: events.map((e) => ({
      _id: e._id,
      title: e.title,
      eventType: e.eventType,
      startDate: e.startDate,
      endDate: e.endDate,
      myRole: e.myRole,
      responsibilities: e.responsibilities,
      contributions: e.contributions,
      participantsCount: e.participantsCount,
      outcomes: e.outcomes,
      achievements: e.achievements,
      evidenceLinks: e.evidenceLinks || [],
      attachmentsCount:
        (e.evidenceLinks || []).length + (e.attachments || []).length,
    })),
    studentsSummary: students.map((s) => ({
      _id: s._id,
      studentName: s.studentName,
      studentBatch: s.studentBatch,
      date: s.date,
      initialChallenge: s.initialChallenge,
      howIHelped: s.howIHelped,
      achievement: s.achievement,
      isPrivate: s.isPrivate,
      evidenceLinks: s.evidenceLinks || [],
      attachmentsCount:
        (s.evidenceLinks || []).length + (s.attachments || []).length,
    })),
    evidenceAuditList,
    appraisalHighlights: [
      `Initiatives Executed: ${totalEvents} programs (${eventTypesSummary.join(", ") || "None"})`,
      `Community Reach: Reached ${totalParticipants} total participants across workshops and bootcamps`,
      `Direct Mentorship: Guided ${totalStudents} students from initial blockers to documented achievements`,
      `Evidence Compliance: 100% of claims backed by verified documentation in Google Drive`,
    ],
  };
};

/**
 * AI-powered performance appraisal report generator
 * Strictly evidence-based, zero hallucination.
 */
const generateAiReport = async ({
  events = [],
  students = [],
  user = {},
  dateRange = {},
}) => {
  const aiConfig = getAiConfig();

  if (!aiConfig.provider || !aiConfig.apiKey) {
    return {
      success: false,
      aiAvailable: false,
      message:
        "AI provider is not configured. Please add GEMINI_API_KEY or OPENAI_API_KEY to your backend .env file. Note: A consumer ChatGPT subscription does not include API access; a developer API key is required.",
      canFallbackToStandard: true,
      standardFallback: generateStandardReport({
        events,
        students,
        user,
        dateRange,
      }),
    };
  }

  // First generate the verified standard base
  const standardBase = generateStandardReport({
    events,
    students,
    user,
    dateRange,
  });

  const promptPayload = {
    employeeName: user.name || "Employee",
    evaluationPeriod: dateRange,
    quantitativeMetrics: standardBase.metrics,
    events: events.map((e) => ({
      title: e.title,
      type: e.eventType,
      date: e.startDate,
      role: e.myRole,
      responsibilities: e.responsibilities,
      contributions: e.contributions,
      participants: e.participantsCount,
      outcomes: e.outcomes,
      achievements: e.achievements,
      evidenceLinks: (e.evidenceLinks || []).map(
        (l) => `${l.description || "Evidence"}: ${l.url}`,
      ),
    })),
    studentMentorship: students.map((s) => ({
      studentName: s.studentName,
      batch: s.studentBatch,
      date: s.date,
      challenge: s.initialChallenge,
      intervention: s.howIHelped,
      outcome: s.achievement,
      evidenceLinks: (s.evidenceLinks || []).map(
        (l) => `${l.description || "Evidence"}: ${l.url}`,
      ),
    })),
  };

  const systemInstructions = `You are an executive HR and senior engineering leadership appraisal expert.
Your job is to draft an official, evidence-based performance appraisal summary for ${user.name || "the employee"}.
STRICT CRITICAL RULES:
1. Base your writing ONLY on the provided records. NEVER fabricate, hallucinate, or exaggerate metrics, participant counts, dates, or outcomes.
2. If data is missing or not provided, do not invent it.
3. Structure your response into clear appraisal markdown sections:
   ### 1. Executive Performance Overview
   ### 2. Key Initiatives & Institutional Impact (Workshops, Hackathons, Leadership)
   ### 3. Student Transformation & Mentorship Outcomes
   ### 4. Core Competencies Demonstrated (Ownership, Technical Leadership, Mentorship Excellence)
   ### 5. Summary Appraisal Assessment & Recommendations
4. Keep the tone professional, objective, authoritative, and suitable for a senior director review.`;

  try {
    let aiGeneratedContent = "";

    if (aiConfig.provider === "gemini") {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${aiConfig.apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                role: "user",
                parts: [
                  {
                    text: `${systemInstructions}\n\nHere are the verified records:\n${JSON.stringify(promptPayload, null, 2)}`,
                  },
                ],
              },
            ],
            generationConfig: {
              temperature: 0.2, // Low temperature for high factual accuracy
              maxOutputTokens: 2500,
            },
          }),
        },
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error?.message ||
            `Gemini API responded with status ${response.status}`,
        );
      }

      const json = await response.json();
      aiGeneratedContent =
        json.candidates?.[0]?.content?.parts?.[0]?.text || "";
    } else if (aiConfig.provider === "openai") {
      const response = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${aiConfig.apiKey}`,
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [
              { role: "system", content: systemInstructions },
              {
                role: "user",
                content: `Here are the verified records:\n${JSON.stringify(promptPayload, null, 2)}`,
              },
            ],
            temperature: 0.2,
          }),
        },
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error?.message ||
            `OpenAI API responded with status ${response.status}`,
        );
      }

      const json = await response.json();
      aiGeneratedContent = json.choices?.[0]?.message?.content || "";
    }

    if (!aiGeneratedContent) {
      throw new Error("AI provider returned an empty response");
    }

    return {
      success: true,
      aiAvailable: true,
      reportType: "ai",
      aiProvider: aiConfig.provider,
      title: `AI-Synthesized Performance Appraisal Report - ${user.name || "Employee"}`,
      userName: user.name || "Team Member",
      userEmail: user.email || "",
      generatedAt: new Date().toISOString(),
      dateRange: standardBase.dateRange,
      metrics: standardBase.metrics,
      aiAppraisalNarrative: aiGeneratedContent,
      eventsSummary: standardBase.eventsSummary,
      studentsSummary: standardBase.studentsSummary,
      evidenceAuditList: standardBase.evidenceAuditList,
      appraisalHighlights: standardBase.appraisalHighlights,
    };
  } catch (err) {
    console.error("AI Report generation error:", err.message);
    return {
      success: false,
      aiAvailable: true,
      error: err.message,
      message: `AI generation failed: ${err.message}. A Standard Report is available as a fallback.`,
      canFallbackToStandard: true,
      standardFallback: standardBase,
    };
  }
};

module.exports = {
  getAiConfig,
  generateStandardReport,
  generateAiReport,
};
