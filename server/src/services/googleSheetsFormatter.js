const SHEET_HEADERS = [
  "Date",
  "Task",
  "Category",
  "Activity Type",
  "Time From",
  "Time To",
  "Spent Time",
  "Hall / Section",
  "Status",
  "Priority",
  "Remarks",
];

const formatSpentTime = (minutes) => {
  const m = Number(minutes) || 0;
  const hours = Math.floor(m / 60);
  const remainingMinutes = m % 60;

  if (hours > 0 && remainingMinutes > 0) {
    return `${hours}h ${remainingMinutes}m`;
  } else if (hours > 0) {
    return `${hours}h`;
  } else {
    return `${remainingMinutes}m`;
  }
};

const formatWorkLogRow = (workLog) => {
  let dateFormatted = "";
  if (workLog.date) {
    const d = new Date(workLog.date);
    if (!isNaN(d.getTime())) {
      dateFormatted = d.toISOString().split("T")[0];
    }
  }

  return [
    dateFormatted,
    workLog.task || "",
    workLog.category || "",
    workLog.activityType || "",
    workLog.timeFrom || "",
    workLog.timeTo || "",
    formatSpentTime(workLog.spentMinutes),
    workLog.hallSection || "",
    workLog.status || "Completed",
    workLog.priority || "Normal",
    workLog.remarks || "",
  ];
};

module.exports = {
  SHEET_HEADERS,
  formatSpentTime,
  formatWorkLogRow,
};
