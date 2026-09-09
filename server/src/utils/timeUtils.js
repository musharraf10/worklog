const calculateSpentMinutes = (timeFrom, timeTo) => {
  const [fromHours, fromMinutes] = timeFrom.split(":").map(Number);
  const [toHours, toMinutes] = timeTo.split(":").map(Number);

  const fromTotalMinutes = fromHours * 60 + fromMinutes;
  const toTotalMinutes = toHours * 60 + toMinutes;

  if (toTotalMinutes <= fromTotalMinutes) {
    throw new Error("Time To must be greater than Time From");
  }

  return toTotalMinutes - fromTotalMinutes;
};

module.exports = {
  calculateSpentMinutes,
};
