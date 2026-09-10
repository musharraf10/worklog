import { useState, useEffect } from 'react';
import mentorLogService from '../../services/mentorLogService';
import MentorReportContent from './MentorReportContent';

export const MentorWeeklyReport = ({ weekStart }) => {
  const [reportData, setReportData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const fetchWeeklyMentoring = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await mentorLogService.getWeeklyMentoringSummary(weekStart);
        if (isMounted) {
          setReportData(response.data || null);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.response?.data?.message || 'Failed to load weekly mentoring report');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    if (weekStart) {
      fetchWeeklyMentoring();
    }

    return () => {
      isMounted = false;
    };
  }, [weekStart]);

  return <MentorReportContent reportData={reportData} isLoading={isLoading} error={error} />;
};

export default MentorWeeklyReport;
