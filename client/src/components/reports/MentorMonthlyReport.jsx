import { useState, useEffect } from 'react';
import mentorLogService from '../../services/mentorLogService';
import MentorReportContent from './MentorReportContent';

export const MentorMonthlyReport = ({ year, month }) => {
  const [reportData, setReportData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const fetchMonthlyMentoring = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await mentorLogService.getMonthlyMentoringSummary(year, month);
        if (isMounted) {
          setReportData(response.data || null);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.response?.data?.message || 'Failed to load monthly mentoring report');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    if (year && month) {
      fetchMonthlyMentoring();
    }

    return () => {
      isMounted = false;
    };
  }, [year, month]);

  return <MentorReportContent reportData={reportData} isLoading={isLoading} error={error} />;
};

export default MentorMonthlyReport;
