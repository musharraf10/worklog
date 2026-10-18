import { useState, useEffect } from 'react';
import sharedPortalService from '../../services/sharedPortalService';
import RemarkList from '../../components/share/RemarkList';
import Loader from '../../components/common/Loader';
import { formatDate } from '../../utils/dateUtils';
import { formatDisplayTime, formatMinutes } from '../../utils/timeUtils';

export const SharedMentorLogs = ({ token, onAddRemark, remarksByTarget = {} }) => {
  const [mentorLogs, setMentorLogs] = useState([]);
  const [selectedLog, setSelectedLog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL'); // 'ALL' | 'Solved' | 'Carry Forward'

  useEffect(() => {
    let isMounted = true;
    const fetchMentorLogs = async () => {
      setLoading(true);
      try {
        const res = await sharedPortalService.getMentorLogs(token);
        const data = res.data || [];
        if (isMounted) {
          setMentorLogs(data);
          if (data.length > 0) {
            setSelectedLog(data[0]);
          }
        }
      } catch (err) {
        console.error('Error fetching shared mentor logs:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchMentorLogs();
    return () => {
      isMounted = false;
    };
  }, [token]);

  if (loading) {
    return <Loader text="Loading mentoring sessions..." />;
  }

  const filteredQuestions = (selectedLog?.questions || []).filter((q) => {
    const matchesSearch =
      !searchQuery ||
      q.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (q.resolution || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      filterStatus === 'ALL' || q.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 text-left">
      {/* Header */}
      <div className="bg-brand-light border border-brand-primary/20 rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-brand-primary">
            Mentoring Sessions
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold text-brand-dark mt-0.5">
            Mentor Logs History
          </h2>
          <p className="text-sm text-brand-dark/70 mt-1">
            Review student batches, subjects, doubt resolutions, and manager remarks.
          </p>
        </div>
        <span className="text-xs font-semibold text-brand-dark/65 bg-brand-soft px-3.5 py-1.5 rounded-full border border-brand-primary/20 shrink-0 self-start sm:self-auto">
          {mentorLogs.length} Total Sessions
        </span>
      </div>

      {mentorLogs.length === 0 ? (
        <div className="bg-brand-light border border-brand-primary/25 rounded-2xl p-12 text-center">
          <p className="text-base font-bold text-brand-dark">No mentor logs recorded</p>
          <p className="text-sm text-brand-dark/60 mt-1">
            The user has not logged any mentoring sessions yet.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Left column: Session list */}
          <div className="space-y-3 lg:col-span-1">
            <h3 className="text-sm font-bold uppercase tracking-wider text-brand-dark/70 px-1">
              Select Session ({mentorLogs.length})
            </h3>
            <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
              {mentorLogs.map((item) => {
                const isSelected = selectedLog?._id === item._id;
                const wl = item.workLog;

                return (
                  <button
                    type="button"
                    key={item._id}
                    onClick={() => setSelectedLog(item)}
                    className={`w-full text-left p-4 rounded-xl border transition-all ${
                      isSelected
                        ? 'border-brand-primary bg-brand-soft/70 shadow-xs'
                        : 'border-brand-primary/20 bg-brand-light hover:bg-brand-soft/30'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-sm text-brand-dark truncate">
                        {item.studentBatch}
                      </span>
                      <span className="text-[11px] font-semibold text-brand-dark/70 shrink-0">
                        {wl?.date ? formatDate(wl.date) : ''}
                      </span>
                    </div>

                    <p className="text-xs font-semibold text-brand-primary mt-1 truncate">
                      {item.subject}
                    </p>

                    <div className="flex items-center gap-3 mt-2 text-[11px] text-brand-dark/65">
                      <span>{item.questions?.length || 0} questions</span>
                      <span>•</span>
                      <span className="text-emerald-700 font-semibold">{item.solvedQuestions || 0} solved</span>
                      {item.carryForwardQuestions > 0 && (
                        <>
                          <span>•</span>
                          <span className="text-amber-700 font-semibold">{item.carryForwardQuestions} carry over</span>
                        </>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right column: Questions detail */}
          <div className="lg:col-span-2 space-y-4">
            {selectedLog ? (
              <div className="bg-brand-light border border-brand-primary/25 rounded-2xl p-5 sm:p-6 shadow-xs space-y-5">
                {/* Session metadata banner */}
                <div className="border-b border-brand-primary/20 pb-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wider text-brand-dark/60">
                        Active Workspace
                      </span>
                      <h3 className="text-xl sm:text-2xl font-bold text-brand-dark mt-0.5">
                        {selectedLog.studentBatch}
                      </h3>
                      <p className="text-sm font-semibold text-brand-primary mt-0.5">
                        Subject: {selectedLog.subject}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        onAddRemark({
                          targetType: 'MentorLog',
                          targetId: selectedLog._id,
                          targetTitle: `Session: ${selectedLog.studentBatch} - ${selectedLog.subject}`,
                        })
                      }
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-brand-dark text-brand-light text-xs font-bold hover:bg-brand-dark/90 transition-colors shrink-0 self-start sm:self-auto"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                      </svg>
                      Remark on Session
                    </button>
                  </div>

                  {selectedLog.workLog && (
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2.5 text-xs text-brand-dark/70 font-medium">
                      <span>Date: {formatDate(selectedLog.workLog.date, true)}</span>
                      <span>•</span>
                      <span>
                        Time: {formatDisplayTime(selectedLog.workLog.timeFrom)} – {formatDisplayTime(selectedLog.workLog.timeTo)} ({formatMinutes(selectedLog.workLog.spentMinutes)})
                      </span>
                      {selectedLog.workLog.hallSection && (
                        <>
                          <span>•</span>
                          <span>Hall: {selectedLog.workLog.hallSection}</span>
                        </>
                      )}
                    </div>
                  )}

                  {/* Remarks on the whole session */}
                  <RemarkList remarks={remarksByTarget[selectedLog._id] || []} />
                </div>

                {/* Filter & Search Bar */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search question, problem, resolution..."
                    className="w-full sm:w-64 px-3.5 py-2 rounded-xl border border-brand-primary/25 bg-brand-light text-brand-dark text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-brand-primary"
                  />

                  <div className="flex items-center gap-1.5 self-end sm:self-auto">
                    {['ALL', 'Solved', 'Carry Forward'].map((st) => (
                      <button
                        type="button"
                        key={st}
                        onClick={() => setFilterStatus(st)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                          filterStatus === st
                            ? 'bg-brand-dark text-brand-light'
                            : 'bg-brand-soft/40 text-brand-dark/70 hover:bg-brand-soft'
                        }`}
                      >
                        {st}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Questions list */}
                <div className="space-y-3.5">
                  {filteredQuestions.length === 0 ? (
                    <p className="py-8 text-center text-sm text-brand-dark/60">
                      No questions found matching your filter.
                    </p>
                  ) : (
                    filteredQuestions.map((q, idx) => {
                      const remarks = remarksByTarget[q._id] || [];
                      const isSolved = q.status === 'Solved';

                      return (
                        <div
                          key={q._id || idx}
                          className="p-4 rounded-xl border border-brand-primary/20 bg-brand-soft/20 hover:bg-brand-soft/30 transition-colors space-y-2.5"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-sm text-brand-dark">
                                  #{idx + 1}. {q.category}
                                </span>
                                <span
                                  className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                    isSolved
                                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                      : 'bg-amber-100 text-amber-800 border border-amber-300'
                                  }`}
                                >
                                  {q.status}
                                </span>
                              </div>
                              <p className="text-sm font-semibold text-brand-dark">
                                {q.question}
                              </p>
                            </div>

                            <button
                              type="button"
                              onClick={() =>
                                onAddRemark({
                                  targetType: 'MentorLog',
                                  targetId: q._id,
                                  targetTitle: `Question: ${q.question.slice(0, 40)}...`,
                                })
                              }
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-brand-dark text-brand-light text-xs font-bold hover:bg-brand-dark/90 transition-colors shrink-0"
                            >
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                              </svg>
                              Remark
                            </button>
                          </div>

                          {q.resolution && (
                            <div className="text-xs text-brand-dark/85 bg-brand-light/90 p-3 rounded-lg border border-brand-primary/15">
                              <span className="font-bold text-brand-primary block mb-0.5">
                                Resolution / Explanation:
                              </span>
                              <p className="whitespace-pre-wrap">{q.resolution}</p>
                            </div>
                          )}

                          {q.remarks && (
                            <div className="text-xs text-brand-dark/70 italic px-1">
                              Note: {q.remarks}
                            </div>
                          )}

                          <RemarkList remarks={remarks} />
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            ) : (
              <p className="py-12 text-center text-sm text-brand-dark/60">
                Select a session on the left to view questions.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SharedMentorLogs;
