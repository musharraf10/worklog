export const CATEGORIES = [
  "Teaching",
  "Student Support",
  "Interview",
  "Project Review",
  "Meeting",
  "Documentation",
  "Technical Work",
  "Administrative",
  "Mid Exam",
  "Sem",
  "Other",
];

export const ACTIVITY_TYPES = [
  "Class",
  "Interview",
  "Doubt Clarification",
  "Mentoring Session",
  "Mentoring",
  "Project Review",
  "Lab",
  "Meeting",
  "Preparation",
  "Follow-up",
  "Other",
];

export const QUESTION_CATEGORIES = [
  "Concept Clarification",
  "Coding / Programming",
  "Debugging",
  "DSA / Problem Solving",
  "Database",
  "Project Related",
  "Assignment",
  "Interview Preparation",
  "Deployment",
  "Git / GitHub",
  "Frontend",
  "Backend",
  "Other",
];

export const QUESTION_STATUSES = ["Solved", "Carry Forward"];

export const STATUS_OPTIONS = [
  "Completed",
  "Not Done",
  "Yet to Start",
  "On Hold",
  "In Progress",
  "Carry Forward",
];

export const PRIORITY_OPTIONS = ["Highest", "High", "Medium", "Low", "Adhoc"];

export const DEFAULT_WORK_LOG = {
  date: "",
  task: "",
  category: "Teaching",
  activityType: "Class",
  timeFrom: "09:00",
  timeTo: "10:00",
  hallSection: "",
  status: "Completed",
  priority: "Medium",
  remarks: "",
};

export const SYNC_STATUSES = {
  SYNCED: "synced",
  SYNCING: "syncing",
  PENDING: "pending",
  FAILED: "failed",
  LOCAL: "local",
};
