const WorkLog = require("../models/WorkLog");

const getDateRange = (startDate, endDate) => {
  const start = new Date(`${startDate}T00:00:00.000Z`);
  const end = new Date(`${endDate}T00:00:00.000Z`);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw new Error("Invalid date");
  }

  if (start > end) {
    throw new Error("Start date cannot be after end date");
  }

  end.setUTCDate(end.getUTCDate() + 1);

  return {
    start,
    end,
  };
};

const isValidDateString = (value) => {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
};

const formatMinutes = (minutes) => {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  return `${hours}h ${remainingMinutes}m`;
};

const buildSummary = async ({ userId, startDate, endDate }) => {
  const { start, end } = getDateRange(startDate, endDate);

  const match = {
    user: userId,
    date: {
      $gte: start,
      $lt: end,
    },
  };

  const [summary] = await WorkLog.aggregate([
    {
      $match: match,
    },

    {
      $facet: {
        overview: [
          {
            $group: {
              _id: null,
              totalTasks: { $sum: 1 },
              totalWorkedMinutes: {
                $sum: "$spentMinutes",
              },
            },
          },
        ],

        dailySummary: [
          {
            $group: {
              _id: {
                $dateToString: {
                  format: "%Y-%m-%d",
                  date: "$date",
                  timezone: "Asia/Kolkata",
                },
              },
              totalTasks: { $sum: 1 },
              workedMinutes: {
                $sum: "$spentMinutes",
              },
            },
          },
          {
            $sort: {
              _id: 1,
            },
          },
        ],

        categorySummary: [
          {
            $group: {
              _id: "$category",
              tasks: { $sum: 1 },
              workedMinutes: {
                $sum: "$spentMinutes",
              },
            },
          },
          {
            $sort: {
              workedMinutes: -1,
            },
          },
        ],

        activitySummary: [
          {
            $group: {
              _id: "$activityType",
              tasks: { $sum: 1 },
              workedMinutes: {
                $sum: "$spentMinutes",
              },
            },
          },
          {
            $sort: {
              workedMinutes: -1,
            },
          },
        ],

        sectionSummary: [
          {
            $group: {
              _id: {
                $ifNull: ["$hallSection", "Not Specified"],
              },
              tasks: { $sum: 1 },
              workedMinutes: {
                $sum: "$spentMinutes",
              },
            },
          },
          {
            $sort: {
              workedMinutes: -1,
            },
          },
        ],

        statusSummary: [
          {
            $group: {
              _id: "$status",
              tasks: { $sum: 1 },
              workedMinutes: {
                $sum: "$spentMinutes",
              },
            },
          },
          {
            $sort: {
              tasks: -1,
            },
          },
        ],

        prioritySummary: [
          {
            $group: {
              _id: "$priority",
              tasks: { $sum: 1 },
              workedMinutes: {
                $sum: "$spentMinutes",
              },
            },
          },
          {
            $sort: {
              tasks: -1,
            },
          },
        ],
      },
    },
  ]);

  const overview = summary.overview[0] || {
    totalTasks: 0,
    totalWorkedMinutes: 0,
  };

  const totalWorkedMinutes = overview.totalWorkedMinutes || 0;

  return {
    totalTasks: overview.totalTasks || 0,

    totalWorkedMinutes,

    totalWorkedHours: formatMinutes(totalWorkedMinutes),

    dailySummary: summary.dailySummary.map((item) => ({
      date: item._id,
      totalTasks: item.totalTasks,
      workedMinutes: item.workedMinutes,
      workedHours: formatMinutes(item.workedMinutes),
    })),

    categorySummary: summary.categorySummary.map((item) => ({
      category: item._id,
      tasks: item.tasks,
      workedMinutes: item.workedMinutes,
      workedHours: formatMinutes(item.workedMinutes),
    })),

    activitySummary: summary.activitySummary.map((item) => ({
      activityType: item._id,
      tasks: item.tasks,
      workedMinutes: item.workedMinutes,
      workedHours: formatMinutes(item.workedMinutes),
    })),

    sectionSummary: summary.sectionSummary.map((item) => ({
      hallSection: item._id,
      tasks: item.tasks,
      workedMinutes: item.workedMinutes,
      workedHours: formatMinutes(item.workedMinutes),
    })),

    statusSummary: summary.statusSummary.map((item) => ({
      status: item._id,
      tasks: item.tasks,
      workedMinutes: item.workedMinutes,
      workedHours: formatMinutes(item.workedMinutes),
    })),

    prioritySummary: summary.prioritySummary.map((item) => ({
      priority: item._id,
      tasks: item.tasks,
      workedMinutes: item.workedMinutes,
      workedHours: formatMinutes(item.workedMinutes),
    })),
  };
};

// Daily Summary
const getDailySummary = async (req, res) => {
  try {
    const { date } = req.query;

    if (!date || !isValidDateString(date)) {
      return res.status(400).json({
        success: false,
        message: "Date is required",
      });
    }

    const summary = await buildSummary({
      userId: req.user._id,
      startDate: date,
      endDate: date,
    });

    res.status(200).json({
      success: true,
      data: {
        date,
        ...summary,
      },
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// Weekly Summary
const getWeeklySummary = async (req, res) => {
  try {
    const { startDate } = req.query;

    if (!startDate || !isValidDateString(startDate)) {
      return res.status(400).json({
        success: false,
        message: "startDate is required",
      });
    }

    const start = new Date(`${startDate}T00:00:00.000Z`);

    if (Number.isNaN(start.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Invalid startDate",
      });
    }

    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 6);

    const endDate = end.toISOString().split("T")[0];

    const summary = await buildSummary({
      userId: req.user._id,
      startDate,
      endDate,
    });

    res.status(200).json({
      success: true,
      data: {
        startDate,
        endDate,
        ...summary,
      },
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// Monthly Summary
const getMonthlySummary = async (req, res) => {
  try {
    const { year, month } = req.query;

    if (!year || !month) {
      return res.status(400).json({
        success: false,
        message: "year and month are required",
      });
    }

    const numericYear = Number(year);
    const numericMonth = Number(month);

    if (
      !Number.isInteger(numericYear) ||
      !Number.isInteger(numericMonth) ||
      numericMonth < 1 ||
      numericMonth > 12
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid year or month",
      });
    }

    const startDate = `${numericYear}-${String(numericMonth).padStart(
      2,
      "0",
    )}-01`;

    const lastDay = new Date(Date.UTC(numericYear, numericMonth, 0));
    const endDate = lastDay.toISOString().split("T")[0];

    const summary = await buildSummary({
      userId: req.user._id,
      startDate,
      endDate,
    });

    res.status(200).json({
      success: true,
      data: {
        year: numericYear,
        month: numericMonth,
        ...summary,
      },
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  getDailySummary,
  getWeeklySummary,
  getMonthlySummary,
};
