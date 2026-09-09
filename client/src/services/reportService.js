import api from './api';

export const reportService = {
  /**
   * Daily summary for a given date string (YYYY-MM-DD)
   */
  async getDailySummary(date) {
    const response = await api.get('/worklogs/summary/daily', {
      params: { date },
    });
    return response.data;
  },

  /**
   * Weekly summary for a given start date (YYYY-MM-DD)
   */
  async getWeeklySummary(startDate) {
    const response = await api.get('/worklogs/summary/weekly', {
      params: { startDate },
    });
    return response.data;
  },

  /**
   * Monthly summary for a given year and month (1-12)
   */
  async getMonthlySummary(year, month) {
    const response = await api.get('/worklogs/summary/monthly', {
      params: { year, month },
    });
    return response.data;
  },
};

export default reportService;
