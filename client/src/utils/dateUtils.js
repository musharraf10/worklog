import { formatMinutes } from './timeUtils';

/**
 * Get current date as YYYY-MM-DD in local time
 */
export const getTodayDateString = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Format any date/string to YYYY-MM-DD for form inputs
 */
export const formatDateForInput = (dateInput) => {
  if (!dateInput) return '';
  if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
    return dateInput;
  }
  const date = new Date(dateInput);
  if (Number.isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Month names list
 */
export const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

/**
 * Format date for group headers, e.g. "09 September 2026"
 */
export const formatGroupDate = (dateInput) => {
  if (!dateInput) return '';
  const dateStr = formatDateForInput(dateInput);
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-').map(Number);
  const monthName = MONTH_NAMES[month - 1] || '';
  return `${String(day).padStart(2, '0')} ${monthName} ${year}`;
};

/**
 * Check if a date string is Today
 */
export const isToday = (dateInput) => {
  return formatDateForInput(dateInput) === getTodayDateString();
};

/**
 * Check if a date string is Yesterday
 */
export const isYesterday = (dateInput) => {
  const yesterdayStr = addDays(getTodayDateString(), -1);
  return formatDateForInput(dateInput) === yesterdayStr;
};

/**
 * Format date for friendly UI display, e.g. "Sep 9, 2026"
 */
export const formatDate = (dateInput, includeDayOfWeek = false) => {
  if (!dateInput) return '';
  const date = new Date(dateInput);
  if (Number.isNaN(date.getTime())) return String(dateInput);

  const options = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  };

  if (includeDayOfWeek) {
    options.weekday = 'short';
  }

  return date.toLocaleDateString(undefined, options);
};

/**
 * Get start of week (Monday) for a given date string (YYYY-MM-DD)
 */
export const getStartOfWeek = (dateInput) => {
  const dateStr = formatDateForInput(dateInput) || getTodayDateString();
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);

  const dayOfWeek = date.getDay();
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  date.setDate(date.getDate() + diff);

  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

/**
 * Add or subtract days from a YYYY-MM-DD string
 */
export const addDays = (dateStr, days) => {
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + days);

  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

/**
 * Get year and month (1-12) from date or current date
 */
export const getYearAndMonth = (dateInput) => {
  const date = dateInput ? new Date(dateInput) : new Date();
  return {
    year: date.getFullYear(),
    month: date.getMonth() + 1,
  };
};

/**
 * Group work logs by date.
 * Returns sorted list of date units (latest date first).
 * Within each date unit, tasks are sorted chronologically by timeFrom.
 */
export const groupLogsByDate = (logs = []) => {
  const groupsMap = new Map();

  for (const log of logs) {
    const dateKey = formatDateForInput(log.date);
    if (!dateKey) continue;

    if (!groupsMap.has(dateKey)) {
      groupsMap.set(dateKey, []);
    }
    groupsMap.get(dateKey).push(log);
  }

  const sortedDates = Array.from(groupsMap.keys()).sort((a, b) =>
    b.localeCompare(a),
  );

  return sortedDates.map((dateKey) => {
    const tasks = groupsMap.get(dateKey);
    // Sort tasks chronologically by timeFrom
    tasks.sort((a, b) => (a.timeFrom || '').localeCompare(b.timeFrom || ''));

    const totalMinutes = tasks.reduce(
      (sum, t) => sum + (t.spentMinutes || 0),
      0,
    );

    return {
      dateKey,
      formattedDate: formatGroupDate(dateKey),
      isToday: isToday(dateKey),
      isYesterday: isYesterday(dateKey),
      totalMinutes,
      totalHoursStr: formatMinutes(totalMinutes),
      taskCount: tasks.length,
      tasks,
    };
  });
};
