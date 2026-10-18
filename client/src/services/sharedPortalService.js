import axios from 'axios';

const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const sharedPortalService = {
  /**
   * Verify token and fetch metadata (owner info, expiry, permissions)
   */
  verifyToken: async (token) => {
    const response = await client.get(`/shared/${token}/verify`);
    return response.data;
  },

  /**
   * Get all work logs for the shared portal
   */
  getWorkLogs: async (token, params = {}) => {
    const response = await client.get(`/shared/${token}/worklogs`, { params });
    return response.data;
  },

  /**
   * Get single work log by ID
   */
  getWorkLogById: async (token, id) => {
    const response = await client.get(`/shared/${token}/worklogs/${id}`);
    return response.data;
  },

  /**
   * Get all mentor logs for the shared portal
   */
  getMentorLogs: async (token) => {
    const response = await client.get(`/shared/${token}/mentor-logs`);
    return response.data;
  },

  /**
   * Get single mentor log by ID
   */
  getMentorLogById: async (token, id) => {
    const response = await client.get(`/shared/${token}/mentor-logs/${id}`);
    return response.data;
  },

  /**
   * Get daily summary report
   */
  getDailySummary: async (token, date) => {
    const response = await client.get(`/shared/${token}/reports/daily`, {
      params: { date },
    });
    return response.data;
  },

  /**
   * Get weekly summary report
   */
  getWeeklySummary: async (token, startDate) => {
    const response = await client.get(`/shared/${token}/reports/weekly`, {
      params: { startDate },
    });
    return response.data;
  },

  /**
   * Get monthly summary report
   */
  getMonthlySummary: async (token, year, month) => {
    const response = await client.get(`/shared/${token}/reports/monthly`, {
      params: { year, month },
    });
    return response.data;
  },

  /**
   * Get weekly mentoring report
   */
  getWeeklyMentoringSummary: async (token, weekStart) => {
    const response = await client.get(`/shared/${token}/mentor-reports/weekly`, {
      params: { weekStart },
    });
    return response.data;
  },

  /**
   * Get monthly mentoring report
   */
  getMonthlyMentoringSummary: async (token, year, month) => {
    const response = await client.get(`/shared/${token}/mentor-reports/monthly`, {
      params: { year, month },
    });
    return response.data;
  },

  /**
   * Get all manager remarks for this shared portal
   */
  getRemarks: async (token, params = {}) => {
    const response = await client.get(`/shared/${token}/remarks`, { params });
    return response.data;
  },

  /**
   * Submit a manager remark for a record
   */
  addRemark: async (token, { targetType, targetId, remark, authorName }) => {
    const response = await client.post(`/shared/${token}/remarks`, {
      targetType,
      targetId,
      remark,
      authorName,
    });
    return response.data;
  },
};

export default sharedPortalService;
