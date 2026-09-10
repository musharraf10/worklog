import { useState, useMemo } from 'react';
import Loader from '../common/Loader';
import EmptyState from '../common/EmptyState';
import { formatDate } from '../../utils/dateUtils';

export const MentorReportContent = ({ reportData, isLoading, error }) => {
  // Proof of work filter states
  const [filterSubject, setFilterSubject] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [filterCategory, setFilterCategory] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const proofOfWork = useMemo(() => reportData?.proofOfWork || [], [reportData]);

  // Distinct subjects and categories for filters
  const subjects = useMemo(() => {
    const list = proofOfWork.map((q) => q.subject).filter(Boolean);
    return Array.from(new Set(list));
  }, [proofOfWork]);

  const categories = useMemo(() => {
    const list = proofOfWork.map((q) => q.category).filter(Boolean);
    return Array.from(new Set(list));
  }, [proofOfWork]);

  // Filtered Proof of Work
  const filteredQuestions = useMemo(() => {
    return proofOfWork.filter((item) => {
      if (filterSubject !== 'ALL' && item.subject !== filterSubject) {
        return false;
      }
      if (filterStatus !== 'ALL' && item.status !== filterStatus) {
        return false;
      }
      if (filterCategory !== 'ALL' && item.category !== filterCategory) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const questionMatch = item.question?.toLowerCase().includes(q);
        const batchMatch = item.studentBatch?.toLowerCase().includes(q);
        const taskMatch = item.workLogTask?.toLowerCase().includes(q);
        const resolutionMatch = item.resolution?.toLowerCase().includes(q);
        const remarksMatch = item.remarks?.toLowerCase().includes(q);
        if (!questionMatch && !batchMatch && !taskMatch && !resolutionMatch && !remarksMatch) {
          return false;
        }
      }
      return true;
    });
  }, [proofOfWork, filterSubject, filterStatus, filterCategory, searchQuery]);

  if (isLoading) {
    return <Loader text="Generating mentoring report..." />;
  }

  if (error) {
    return (
      <div className="p-4 rounded-xl bg-brand-soft border border-brand-dark/30 text-sm sm:text-base font-semibold text-brand-dark">
        {error}
      </div>
    );
  }

  if (!reportData || (reportData.totalSessions === 0 && reportData.totalQuestions === 0)) {
    return (
      <EmptyState
        title="No mentoring logs found"
        description="No mentoring sessions or logged questions were recorded for this period."
      />
    );
  }

  return (
    <div className="space-y-6 text-left">
      {/* 1. Summary Cards (5 Cards) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 sm:gap-4">
        {/* Total Sessions */}
        <div className="bg-brand-light border border-brand-primary/25 rounded-2xl p-5 shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-brand-dark/75 block">
            Sessions
          </span>
          <h3 className="text-2xl sm:text-3xl font-extrabold text-brand-dark mt-2">
            {reportData.totalSessions || 0}
          </h3>
          <p className="text-xs text-brand-dark/70 mt-1 font-medium">Mentoring WorkLogs</p>
        </div>

        {/* Total Time */}
        <div className="bg-brand-light border border-brand-primary/25 rounded-2xl p-5 shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-brand-dark/75 block">
            Mentoring Time
          </span>
          <h3 className="text-2xl sm:text-3xl font-extrabold text-brand-dark mt-2">
            {reportData.totalMentoringHours || '0m'}
          </h3>
          <p className="text-xs text-brand-dark/70 mt-1 font-medium">WorkLog duration</p>
        </div>

        {/* Total Questions */}
        <div className="bg-brand-light border border-brand-primary/25 rounded-2xl p-5 shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-brand-dark/75 block">
            Total Questions
          </span>
          <h3 className="text-2xl sm:text-3xl font-extrabold text-brand-dark mt-2">
            {reportData.totalQuestions || 0}
          </h3>
          <p className="text-xs text-brand-dark/70 mt-1 font-medium">Logged queries</p>
        </div>

        {/* Solved */}
        <div className="bg-brand-light border border-brand-primary/25 rounded-2xl p-5 shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-brand-dark/75 block">
            Solved
          </span>
          <h3 className="text-2xl sm:text-3xl font-extrabold text-brand-dark mt-2">
            {reportData.solvedQuestions || 0}
          </h3>
          <p className="text-xs text-brand-dark/70 mt-1 font-medium">
            {reportData.totalQuestions > 0
              ? `${Math.round(((reportData.solvedQuestions || 0) / reportData.totalQuestions) * 100)}% resolved`
              : 'Completed'}
          </p>
        </div>

        {/* Carry Forward */}
        <div className="bg-brand-light border border-brand-primary/25 rounded-2xl p-5 shadow-xs col-span-2 sm:col-span-1">
          <span className="text-xs font-bold uppercase tracking-wider text-brand-dark/75 block">
            Carry Forward
          </span>
          <h3 className="text-2xl sm:text-3xl font-extrabold text-brand-dark mt-2">
            {reportData.carryForwardQuestions || 0}
          </h3>
          <p className="text-xs text-brand-dark/70 mt-1 font-medium">Pending follow-up</p>
        </div>
      </div>

      {/* 2. Subject Breakdown & 3. Category Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Subject Breakdown */}
        <div className="bg-brand-light border border-brand-primary/25 rounded-2xl p-6 shadow-xs">
          <div className="pb-3.5 mb-4 border-b border-brand-primary/20">
            <h3 className="text-lg sm:text-xl font-bold text-brand-dark">Subject Breakdown</h3>
            <p className="text-sm text-brand-dark/75 mt-0.5">
              Questions handled per subject / module
            </p>
          </div>

          {(!reportData.subjectBreakdown || reportData.subjectBreakdown.length === 0) ? (
            <p className="text-sm text-brand-dark/70 py-4 text-center">No subject data recorded</p>
          ) : (
            <div className="space-y-3.5">
              {reportData.subjectBreakdown.map((item) => {
                const solvePercent =
                  item.totalQuestions > 0
                    ? Math.round((item.solved / item.totalQuestions) * 100)
                    : 0;

                return (
                  <div
                    key={item.subject}
                    className="p-3.5 rounded-xl bg-brand-soft/30 border border-brand-primary/20 space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-base text-brand-dark">{item.subject}</span>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-brand-soft text-brand-dark">
                        {item.sessions} {item.sessions === 1 ? 'session' : 'sessions'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-sm text-brand-dark/80 font-medium">
                      <span>Total: <strong className="text-brand-dark">{item.totalQuestions}</strong></span>
                      <span className="text-brand-dark">Solved: <strong>{item.solved}</strong></span>
                      <span className="text-brand-dark">Carry Forward: <strong>{item.carryForward}</strong></span>
                    </div>

                    <div className="w-full h-2 bg-brand-soft/50 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-brand-primary rounded-full transition-all duration-300"
                        style={{ width: `${solvePercent}%` }}
                        title={`${solvePercent}% Solved`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Category Breakdown */}
        <div className="bg-brand-light border border-brand-primary/25 rounded-2xl p-6 shadow-xs">
          <div className="pb-3.5 mb-4 border-b border-brand-primary/20">
            <h3 className="text-lg sm:text-xl font-bold text-brand-dark">Category Breakdown</h3>
            <p className="text-sm text-brand-dark/75 mt-0.5">
              Distribution of questions by category
            </p>
          </div>

          {(!reportData.categoryBreakdown || reportData.categoryBreakdown.length === 0) ? (
            <p className="text-sm text-brand-dark/70 py-4 text-center">No category data recorded</p>
          ) : (
            <div className="space-y-4">
              {reportData.categoryBreakdown.map((item) => {
                const percentage =
                  reportData.totalQuestions > 0
                    ? Math.round((item.totalQuestions / reportData.totalQuestions) * 100)
                    : 0;

                return (
                  <div key={item.category} className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm sm:text-base text-brand-dark">
                      <span className="font-bold">{item.category}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-xs sm:text-sm text-brand-dark/75 font-medium">
                          {item.totalQuestions} {item.totalQuestions === 1 ? 'question' : 'questions'} ({percentage}%)
                        </span>
                        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-brand-soft text-brand-dark">
                          {item.solved} Solved
                        </span>
                      </div>
                    </div>

                    <div className="w-full h-2.5 bg-brand-soft/40 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-brand-primary rounded-full transition-all duration-300"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 4. Proof of Work (Detailed Questions List) */}
      <div className="bg-brand-light border border-brand-primary/25 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="pb-3.5 border-b border-brand-primary/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-lg sm:text-xl font-bold text-brand-dark">
              Proof of Work — Question Details
            </h3>
            <p className="text-sm text-brand-dark/75 mt-0.5">
              Comprehensive list of all mentoring questions logged in this period
            </p>
          </div>
          <div className="text-xs sm:text-sm font-semibold text-brand-dark/80 bg-brand-soft px-3 py-1.5 rounded-lg shrink-0 self-start sm:self-auto">
            Showing {filteredQuestions.length} of {proofOfWork.length} questions
          </div>
        </div>

        {/* Filter controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-brand-soft/30 p-3.5 rounded-xl border border-brand-primary/20">
          <div>
            <label className="block text-xs font-bold text-brand-dark/80 mb-1">Filter by Subject</label>
            <select
              value={filterSubject}
              onChange={(e) => setFilterSubject(e.target.value)}
              className="w-full px-3 py-1.5 text-sm rounded-lg border border-brand-dark/25 bg-brand-light text-brand-dark focus:outline-none focus:ring-1 focus:ring-brand-primary"
            >
              <option value="ALL">All Subjects</option>
              {subjects.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-brand-dark/80 mb-1">Filter by Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-3 py-1.5 text-sm rounded-lg border border-brand-dark/25 bg-brand-light text-brand-dark focus:outline-none focus:ring-1 focus:ring-brand-primary"
            >
              <option value="ALL">All Statuses</option>
              <option value="Solved">Solved</option>
              <option value="Carry Forward">Carry Forward</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-brand-dark/80 mb-1">Filter by Category</label>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="w-full px-3 py-1.5 text-sm rounded-lg border border-brand-dark/25 bg-brand-light text-brand-dark focus:outline-none focus:ring-1 focus:ring-brand-primary"
            >
              <option value="ALL">All Categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-brand-dark/80 mb-1">Search Question / Batch</label>
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-1.5 text-sm rounded-lg border border-brand-dark/25 bg-brand-light text-brand-dark focus:outline-none focus:ring-1 focus:ring-brand-primary"
            />
          </div>
        </div>

        {/* Questions Table / List */}
        {filteredQuestions.length === 0 ? (
          <div className="py-8 text-center text-sm font-medium text-brand-dark/70">
            No questions match the selected filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-brand-primary/30 text-xs font-bold uppercase tracking-wider text-brand-dark/80 bg-brand-soft/40">
                  <th className="py-3 px-3">Date</th>
                  <th className="py-3 px-3">Student / Batch</th>
                  <th className="py-3 px-3">Subject</th>
                  <th className="py-3 px-3">Category</th>
                  <th className="py-3 px-4 min-w-[200px]">Question / Problem</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-4 min-w-[200px]">Resolution</th>
                  <th className="py-3 px-3 min-w-[120px]">Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-primary/15 text-sm">
                {filteredQuestions.map((item, index) => (
                  <tr key={index} className="hover:bg-brand-soft/20 transition-colors">
                    <td className="py-3 px-3 whitespace-nowrap font-medium text-brand-dark">
                      {item.date ? formatDate(item.date) : '—'}
                    </td>
                    <td className="py-3 px-3 font-semibold text-brand-dark">
                      {item.studentBatch || '—'}
                    </td>
                    <td className="py-3 px-3 font-medium text-brand-dark">
                      {item.subject || '—'}
                    </td>
                    <td className="py-3 px-3">
                      <span className="inline-block px-2 py-0.5 rounded text-xs font-semibold bg-brand-soft text-brand-dark">
                        {item.category || 'General'}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-medium text-brand-dark">
                      {item.question}
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${
                          item.status === 'Solved'
                            ? 'bg-brand-primary/50 text-brand-dark'
                            : 'bg-brand-soft border border-brand-dark/30 text-brand-dark'
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-brand-dark/85">
                      {item.resolution || '—'}
                    </td>
                    <td className="py-3 px-3 text-brand-dark/75 text-xs">
                      {item.remarks || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default MentorReportContent;
