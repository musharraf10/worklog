/**
 * Calculate minutes spent between timeFrom and timeTo (HH:mm format).
 * Returns 0 if invalid or end time is before start time.
 */
export const calculateSpentMinutes = (timeFrom, timeTo) => {
  if (!timeFrom || !timeTo) return 0;

  const [fromHours, fromMinutes] = timeFrom.split(':').map(Number);
  const [toHours, toMinutes] = timeTo.split(':').map(Number);

  if (
    Number.isNaN(fromHours) ||
    Number.isNaN(fromMinutes) ||
    Number.isNaN(toHours) ||
    Number.isNaN(toMinutes)
  ) {
    return 0;
  }

  const fromTotalMinutes = fromHours * 60 + fromMinutes;
  const toTotalMinutes = toHours * 60 + toMinutes;

  if (toTotalMinutes <= fromTotalMinutes) {
    return 0;
  }

  return toTotalMinutes - fromTotalMinutes;
};

/**
 * Format minutes into a human-readable "Xh Ym" string matching backend format.
 */
export const formatMinutes = (minutes) => {
  const totalMinutes = Math.max(0, Number(minutes) || 0);
  const hours = Math.floor(totalMinutes / 60);
  const remainingMinutes = totalMinutes % 60;

  if (hours === 0 && remainingMinutes === 0) {
    return '0m';
  }
  if (hours === 0) {
    return `${remainingMinutes}m`;
  }
  return `${hours}h ${remainingMinutes}m`;
};

/**
 * Validate HH:mm 24-hour format
 */
export const isValidTimeFormat = (value) => {
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(value);
};

/**
 * Format 24-hour HH:mm to 12-hour display with AM/PM
 */
export const formatDisplayTime = (timeStr) => {
  if (!timeStr || !isValidTimeFormat(timeStr)) return timeStr || '';
  const [h, m] = timeStr.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 || 12;
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
};
