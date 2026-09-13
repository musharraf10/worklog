/* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */
import { useEffect, useState, useMemo } from 'react';
import mentorLogService from '../services/mentorLogService';
import {
  getTodayDateString,
  addDays,
  formatGroupDate,
} from '../utils/dateUtils';
import { formatDisplayTime, formatMinutes } from '../utils/timeUtils';
import Loader from '../components/common/Loader';
import Modal from '../components/common/Modal';
import Toast from '../components/common/Toast';
import ConfirmDialog from '../components/common/ConfirmDialog';
import MentorQuestionForm from '../components/mentorlogs/MentorQuestionForm';
import MentorQuestionCard from '../components/mentorlogs/MentorQuestionCard';
import MentorSessionList from '../components/mentorlogs/MentorSessionList';
import { useAuth } from '../hooks/useAuth';

export default function MentorLogs() {
  const today = getTodayDateString();
  const [selectedDate, setSelectedDate] = useState(today);
  const [sessions, setSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const [mentorLog, setMentorLog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingSession, setLoadingSession] = useState(false);

  // Setup form state (Step 2)
  const [setupDetails, setSetupDetails] = useState({ studentBatch: '', subject: '' });
  const [isCreatingWorkspace, setIsCreatingWorkspace] = useState(false);

  // Question form / management state
  const [isAddingQuestion, setIsAddingQuestion] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [deletingQuestion, setDeletingQuestion] = useState(null);
  const [deletingWorkspace, setDeletingWorkspace] = useState(false);
  const [togglingQuestionId, setTogglingQuestionId] = useState(null);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL'); // 'ALL' | 'Solved' | 'Carry Forward'

  // Mobile navigation state
  const [mobileView, setMobileView] = useState('sessions'); // 'sessions' | 'workspace'

  // Toast feedback
  const [toast, setToast] = useState({ message: '', kind: 'success' });

  const { syncStatus } = useAuth();

  const showToast = (message, kind = 'success') => {
    setToast({ message, kind });
  };

  // 1. Select a session
  const handleSelectSession = async (session) => {
    setSelectedSession(session);
    setIsAddingQuestion(false);
    setEditingQuestion(null);
    setSearchQuery('');
    setFilterStatus('ALL');
    setMobileView('workspace');

    if (session.hasMentorLog && session.mentorLogId) {
      setLoadingSession(true);
      try {
        const res = await mentorLogService.getMentorLogById(session.mentorLogId);
        setMentorLog(res.data);
        setSetupDetails({
          studentBatch: res.data.studentBatch || '',
          subject: res.data.subject || '',
        });
      } catch {
        showToast('Unable to load mentoring log details.', 'error');
        setMentorLog(null);
      } finally {
        setLoadingSession(false);
      }
    } else {
      setMentorLog(null);
      setSetupDetails({
        studentBatch: '',
        subject: '',
      });
    }
  };

  // 2. Fetch eligible sessions for selected date
  const loadSessions = async (targetDate) => {
    setLoading(true);
    try {
      const res = await mentorLogService.getEligibleWorkLogs(targetDate);
      const sessionList = res.data || [];
      setSessions(sessionList);

      // If previous selected session is in this date, keep it or pick first
      if (sessionList.length === 1) {
        handleSelectSession(sessionList[0]);
      } else if (selectedSession) {
        const found = sessionList.find((s) => s._id === selectedSession._id);
        if (found) {
          handleSelectSession(found);
        } else {
          setSelectedSession(null);
          setMentorLog(null);
          setMobileView('sessions');
        }
      } else {
        setSelectedSession(null);
        setMentorLog(null);
        setMobileView('sessions');
      }
    } catch {
      showToast('Unable to load mentoring sessions for this date.', 'error');
      setSessions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSessions(selectedDate);
  }, [selectedDate]);

  // 3. Create mentoring context workspace (Step 2)
  const handleCreateWorkspace = async (e) => {
    if (e) e.preventDefault();
    if (!setupDetails.studentBatch.trim() || !setupDetails.subject.trim()) {
      showToast('Please enter both student/batch name and subject.', 'error');
      return;
    }

    setIsCreatingWorkspace(true);
    try {
      const res = await mentorLogService.createMentorLog({
        workLogId: selectedSession._id,
        studentBatch: setupDetails.studentBatch.trim(),
        subject: setupDetails.subject.trim(),
        questions: [],
      });

      setMentorLog(res.data);
      // Update session hasMentorLog state
      setSessions((prev) =>
        prev.map((s) =>
          s._id === selectedSession._id
            ? { ...s, hasMentorLog: true, mentorLogId: res.data?._id }
            : s
        )
      );
      showToast('Mentoring question workspace initialized! You can now add questions.');
    } catch (err) {
      showToast(err.response?.data?.message || 'Unable to initialize mentoring workspace.', 'error');
    } finally {
      setIsCreatingWorkspace(false);
    }
  };

  // 4. Add Question (with support for "Save & Add Another")
  const handleAddQuestion = async (questionData, addAnother = false) => {
    if (!mentorLog?._id) return;
    try {
      const res = await mentorLogService.addQuestion(mentorLog._id, questionData);
      const updated = res.data || {
        ...mentorLog,
        questions: [
          ...(mentorLog.questions || []),
          { ...questionData, _id: `local_${Date.now()}` },
        ],
      };
      setMentorLog(updated);

      if (addAnother) {
        showToast('Question saved! Form ready for next question.');
      } else {
        setIsAddingQuestion(false);
        showToast('Question saved successfully.');
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Unable to save question.', 'error');
      throw err;
    }
  };

  // 5. Update Question
  const handleUpdateQuestion = async (questionData) => {
    if (!mentorLog?._id || !editingQuestion?._id) return;
    try {
      const res = await mentorLogService.updateQuestion(
        mentorLog._id,
        editingQuestion._id,
        questionData
      );
      setMentorLog(res.data || mentorLog);
      setEditingQuestion(null);
      showToast('Question updated successfully.');
    } catch (err) {
      showToast(err.response?.data?.message || 'Unable to update question.', 'error');
      throw err;
    }
  };

  // 6. Delete Question
  const handleDeleteQuestion = async () => {
    if (!mentorLog?._id || !deletingQuestion?._id) return;
    try {
      await mentorLogService.deleteQuestion(mentorLog._id, deletingQuestion._id);
      setMentorLog((prev) => ({
        ...prev,
        questions: (prev.questions || []).filter((q) => q._id !== deletingQuestion._id),
      }));
      setDeletingQuestion(null);
      showToast('Question deleted.');
    } catch (err) {
      showToast(err.response?.data?.message || 'Unable to delete question.', 'error');
    }
  };

  // 7. Toggle Question Status (1-click from card)
  const handleToggleStatus = async (question) => {
    if (!mentorLog?._id || !question?._id) return;
    const newStatus = question.status === 'Solved' ? 'Carry Forward' : 'Solved';
    setTogglingQuestionId(question._id);

    try {
      const updatedQuestion = { ...question, status: newStatus };
      await mentorLogService.updateQuestion(mentorLog._id, question._id, updatedQuestion);

      setMentorLog((prev) => ({
        ...prev,
        questions: (prev.questions || []).map((q) =>
          q._id === question._id ? { ...q, status: newStatus } : q
        ),
      }));

      showToast(`Question status updated to ${newStatus}.`);
    } catch (err) {
      showToast(err.response?.data?.message || 'Could not toggle question status.', 'error');
    } finally {
      setTogglingQuestionId(null);
    }
  };

  // 8. Delete entire mentor log workspace
  const handleDeleteWorkspace = async () => {
    if (!mentorLog?._id) return;
    try {
      await mentorLogService.deleteMentorLog(mentorLog._id);
      setMentorLog(null);
      setSessions((prev) =>
        prev.map((s) =>
          s._id === selectedSession._id
            ? { ...s, hasMentorLog: false, mentorLogId: null }
            : s
        )
      );
      setDeletingWorkspace(false);
      showToast('Mentoring workspace cleared for this session.');
    } catch (err) {
      showToast(err.response?.data?.message || 'Could not delete workspace.', 'error');
    }
  };

  // Filtered and searched questions
  const allQuestions = useMemo(() => mentorLog?.questions || [], [mentorLog?.questions]);
  const totalCount = allQuestions.length;
  const solvedCount = allQuestions.filter((q) => q.status === 'Solved').length;
  const carryForwardCount = allQuestions.filter((q) => q.status === 'Carry Forward').length;
  const solvedPercentage = totalCount > 0 ? Math.round((solvedCount / totalCount) * 100) : 0;

  const filteredQuestions = useMemo(() => {
    return allQuestions.filter((q) => {
      if (filterStatus === 'Solved' && q.status !== 'Solved') return false;
      if (filterStatus === 'Carry Forward' && q.status !== 'Carry Forward') return false;

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const questionMatch = q.question?.toLowerCase().includes(query);
        const resolutionMatch = q.resolution?.toLowerCase().includes(query);
        const categoryMatch = q.category?.toLowerCase().includes(query);
        const remarksMatch = q.remarks?.toLowerCase().includes(query);
        return questionMatch || resolutionMatch || categoryMatch || remarksMatch;
      }
      return true;
    });
  }, [allQuestions, filterStatus, searchQuery]);

  // Generate 21-day scrollable date strip
  const dateStripDates = useMemo(() => {
    return Array.from({ length: 21 }, (_, index) => addDays(today, index - 10));
  }, [today]);

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* 1. Page Header */}
      <header className="flex flex-wrap items-start justify-between gap-4 rounded-2xl border border-brand-primary/20 bg-brand-light p-4 shadow-xs sm:p-6">
        <div>
          <div className="flex items-center gap-2">
            <p className="text-xs font-bold uppercase tracking-[.14em] text-brand-primary">
              Mentoring & Doubts Workspace
            </p>
            <span className="hidden sm:inline-block h-1.5 w-1.5 rounded-full bg-brand-primary/40" />
            <span className="hidden sm:inline text-xs font-semibold text-brand-dark/60">
              Evidence of Work
            </span>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-brand-dark sm:text-3xl">
            Mentor Logs & Questions
          </h1>
          <p className="mt-1 max-w-xl text-sm text-brand-dark/70 sm:text-base leading-relaxed">
            Attach student questions, problems, and resolutions directly to your daily mentoring sessions.
          </p>
        </div>

        {/* Date Jump & Status Badge */}
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 rounded-xl border border-brand-dark/20 bg-brand-soft/40 px-3 py-2 text-xs sm:text-sm font-semibold text-brand-dark hover:bg-brand-soft transition">
            <span>📅</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent text-brand-dark outline-none cursor-pointer"
            />
          </label>

          <span className="rounded-full bg-brand-soft px-3 py-2 text-xs font-semibold text-brand-dark">
            <i
              className={`mr-1.5 inline-block h-2 w-2 rounded-full ${
                syncStatus === 'failed'
                  ? 'bg-red-500'
                  : syncStatus === 'pending'
                  ? 'bg-amber-500'
                  : 'bg-emerald-600'
              }`}
            />
            {syncStatus === 'failed'
              ? 'Sync issue'
              : syncStatus === 'pending'
              ? 'Local cache'
              : 'Sheets Ready'}
          </span>
        </div>
      </header>

      {/* 2. DateStrip (Interactive horizontal scroll) */}
      <section className="rounded-2xl border border-brand-primary/25 bg-brand-light p-3 shadow-xs sm:p-4">
        <div className="mb-2.5 flex items-center justify-between gap-3 px-1">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.12em] text-brand-primary">
              Session Date
            </p>
            <p className="text-xs font-medium text-brand-dark/70">
              {formatGroupDate(selectedDate)}
              {selectedDate === today && (
                <span className="ml-1.5 font-bold text-brand-primary">(Today)</span>
              )}
            </p>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setSelectedDate(addDays(selectedDate, -1))}
              title="Previous day"
              className="rounded-lg p-1.5 text-brand-dark/70 hover:bg-brand-soft hover:text-brand-dark transition"
            >
              ◀
            </button>
            <button
              type="button"
              onClick={() => setSelectedDate(today)}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                selectedDate === today
                  ? 'bg-brand-dark text-brand-light shadow-xs'
                  : 'border border-brand-dark/20 bg-brand-soft/40 text-brand-dark hover:bg-brand-soft'
              }`}
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => setSelectedDate(addDays(selectedDate, 1))}
              title="Next day"
              className="rounded-lg p-1.5 text-brand-dark/70 hover:bg-brand-soft hover:text-brand-dark transition"
            >
              ▶
            </button>
          </div>
        </div>

        {/* Scrollable date strip buttons */}
        <div className="date-strip flex gap-2 overflow-x-auto pb-1.5">
          {dateStripDates.map((date) => {
            const dateObj = new Date(`${date}T00:00:00`);
            const active = date === selectedDate;
            const isCurrentToday = date === today;

            return (
              <button
                type="button"
                key={date}
                onClick={() => setSelectedDate(date)}
                aria-pressed={active}
                className={`min-w-[58px] sm:min-w-[64px] rounded-xl border px-2 py-1.5 text-center transition-all ${
                  active
                    ? 'border-brand-dark bg-brand-dark text-brand-light shadow-sm scale-100'
                    : 'border-brand-primary/15 bg-brand-soft/25 text-brand-dark hover:bg-brand-soft/60 active:scale-95'
                }`}
              >
                <span className="block text-[10px] sm:text-[11px] font-bold uppercase tracking-wider">
                  {dateObj.toLocaleDateString(undefined, { weekday: 'short' })}
                </span>
                <span className="mt-0.5 block text-base sm:text-lg font-bold">
                  {dateObj.getDate()}
                </span>
                <span className="block text-[9px] sm:text-[10px] opacity-75">
                  {isCurrentToday ? 'Today' : dateObj.toLocaleDateString(undefined, { month: 'short' })}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* 3. Main Body */}
      {loading ? (
        <Loader text="Finding mentoring sessions for this date…" />
      ) : (
        <div className="grid items-start gap-5 lg:grid-cols-[minmax(280px,340px)_minmax(0,1fr)]">
          {/* Left Column: Sessions List (visible on desktop, or mobile if view === 'sessions') */}
          <div className={`${mobileView === 'workspace' && selectedSession ? 'hidden lg:block' : 'block'}`}>
            <MentorSessionList
              sessions={sessions}
              selectedSession={selectedSession}
              onSelectSession={(s) => {
                handleSelectSession(s);
              }}
              onSelectToday={() => setSelectedDate(today)}
              selectedDate={selectedDate}
              todayDate={today}
            />
          </div>

          {/* Right Column: Active Session Workspace */}
          <div className={`${mobileView === 'sessions' ? 'hidden lg:block' : 'block'}`}>
            {/* Mobile Header: Back Button */}
            {selectedSession && (
              <div className="mb-3 flex items-center justify-between lg:hidden">
                <button
                  type="button"
                  onClick={() => setMobileView('sessions')}
                  className="flex items-center gap-1.5 rounded-xl border border-brand-dark/20 bg-brand-light px-3 py-2 text-xs font-bold text-brand-dark shadow-xs"
                >
                  <span>◀</span>
                  <span>All Sessions ({sessions.length})</span>
                </button>

                <span className="text-xs font-semibold text-brand-dark/60 truncate max-w-[180px]">
                  {selectedSession.task}
                </span>
              </div>
            )}

            {!selectedSession ? (
              /* State 0: No session chosen */
              <div className="rounded-2xl border border-dashed border-brand-primary/30 bg-brand-light/60 p-8 sm:p-14 text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-soft text-2xl shadow-xs">
                  📋
                </div>
                <h2 className="text-lg sm:text-xl font-bold text-brand-dark">
                  Choose a Mentoring Session
                </h2>
                <p className="mt-1.5 text-xs sm:text-sm text-brand-dark/70 max-w-md mx-auto leading-relaxed">
                  Select an eligible mentoring session from the list to document student questions, issues encountered, and their resolutions.
                </p>
                {sessions.length > 0 && (
                  <button
                    type="button"
                    onClick={() => handleSelectSession(sessions[0])}
                    className="mt-5 rounded-xl bg-brand-dark px-4 py-2.5 text-xs sm:text-sm font-bold text-brand-light hover:bg-brand-dark/90 transition shadow-xs"
                  >
                    Open First Session ➔
                  </button>
                )}
              </div>
            ) : loadingSession ? (
              <Loader text="Loading mentoring workspace…" />
            ) : (
              <div className="space-y-5">
                {/* 1. Session Hero Card */}
                <section className="rounded-2xl border border-brand-primary/25 bg-brand-light p-4 sm:p-5 shadow-xs">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-md bg-brand-primary/15 text-brand-primary px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider">
                          Active Session
                        </span>
                        <span className="text-xs text-brand-dark/60">
                          {selectedSession.activityType || 'Mentoring'}
                        </span>
                      </div>
                      <h2 className="mt-1.5 text-lg sm:text-xl font-bold text-brand-dark leading-snug">
                        {selectedSession.task}
                      </h2>
                      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs sm:text-sm text-brand-dark/75">
                        <span className="font-semibold">
                          🕒 {formatDisplayTime(selectedSession.timeFrom)} – {formatDisplayTime(selectedSession.timeTo)}
                        </span>
                        <span>•</span>
                        <span>⏱ {formatMinutes(selectedSession.spentMinutes)}</span>
                        {mentorLog && (
                          <>
                            <span>•</span>
                            <span className="rounded bg-brand-soft px-1.5 py-0.5 font-bold text-brand-dark">
                              {mentorLog.studentBatch} · {mentorLog.subject}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    {mentorLog && (
                      <button
                        type="button"
                        onClick={() => setDeletingWorkspace(true)}
                        className="rounded-lg p-2 text-xs font-semibold text-red-700/80 hover:bg-red-50 hover:text-red-800 transition"
                        title="Delete entire mentor log for this session"
                      >
                        🗑 Reset Workspace
                      </button>
                    )}
                  </div>
                </section>

                {/* 2. Step 2: Set Context (when mentor log does NOT exist yet) */}
                {!mentorLog ? (
                  <section className="mentor-slide-down rounded-2xl border-2 border-brand-primary/30 bg-brand-light p-5 sm:p-6 shadow-xs">
                    <div className="flex items-center gap-2.5 mb-1.5">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-primary text-brand-light text-xs font-bold">
                        2
                      </span>
                      <p className="text-xs font-bold uppercase tracking-[.12em] text-brand-primary">
                        Setup Mentoring Context
                      </p>
                    </div>
                    <h3 className="text-lg font-bold text-brand-dark">
                      Who did you mentor, and on what subject?
                    </h3>
                    <p className="mt-1 text-xs sm:text-sm text-brand-dark/65">
                      Enter the batch/student group and topic once for this session. You can then log all student questions under it.
                    </p>

                    <form onSubmit={handleCreateWorkspace} className="mt-5 space-y-4">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider text-brand-dark/70 mb-1.5">
                            Student / Batch Name <span className="text-red-500">*</span>
                          </label>
                          <input
                            required
                            type="text"
                            value={setupDetails.studentBatch}
                            onChange={(e) =>
                              setSetupDetails((prev) => ({ ...prev, studentBatch: e.target.value }))
                            }
                            placeholder="e.g. Batch 2026-A or John Doe"
                            className="w-full rounded-xl border border-brand-primary/25 bg-brand-light px-3.5 py-2.5 text-sm text-brand-dark outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/25 transition"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider text-brand-dark/70 mb-1.5">
                            Subject / Topic <span className="text-red-500">*</span>
                          </label>
                          <input
                            required
                            type="text"
                            value={setupDetails.subject}
                            onChange={(e) =>
                              setSetupDetails((prev) => ({ ...prev, subject: e.target.value }))
                            }
                            placeholder="e.g. React Hooks & API Integration"
                            className="w-full rounded-xl border border-brand-primary/25 bg-brand-light px-3.5 py-2.5 text-sm text-brand-dark outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/25 transition"
                          />
                        </div>
                      </div>

                      <div className="pt-2 flex justify-end">
                        <button
                          type="submit"
                          disabled={isCreatingWorkspace}
                          className="w-full sm:w-auto rounded-xl bg-brand-dark px-6 py-2.5 text-sm font-bold text-brand-light hover:bg-brand-dark/90 transition shadow-sm active:scale-98 disabled:opacity-50"
                        >
                          {isCreatingWorkspace ? 'Initializing…' : '🚀 Open Question Workspace'}
                        </button>
                      </div>
                    </form>
                  </section>
                ) : (
                  /* 3. Step 3: Question Workspace (Live stats, Add form, Filter, Questions list) */
                  <>
                    {/* Live Stats Summary Bar */}
                    <section className="rounded-2xl border border-brand-primary/25 bg-brand-light p-4 sm:p-5 shadow-xs">
                      <div className="grid grid-cols-3 gap-2 sm:gap-4 text-center">
                        <div className="rounded-xl border border-brand-primary/15 bg-brand-soft/25 p-2.5 sm:p-3">
                          <p className="text-[11px] sm:text-xs font-bold text-brand-dark/60 uppercase">
                            Total Doubts
                          </p>
                          <p className="mt-0.5 text-xl sm:text-2xl font-black text-brand-dark">
                            {totalCount}
                          </p>
                        </div>
                        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-2.5 sm:p-3">
                          <p className="text-[11px] sm:text-xs font-bold text-emerald-800 uppercase">
                            Solved
                          </p>
                          <p className="mt-0.5 text-xl sm:text-2xl font-black text-emerald-800">
                            {solvedCount}
                          </p>
                        </div>
                        <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-2.5 sm:p-3">
                          <p className="text-[11px] sm:text-xs font-bold text-amber-800 uppercase">
                            Carry Forward
                          </p>
                          <p className="mt-0.5 text-xl sm:text-2xl font-black text-amber-800">
                            {carryForwardCount}
                          </p>
                        </div>
                      </div>

                      {/* Animated Resolution Progress Bar */}
                      {totalCount > 0 && (
                        <div className="mt-4 pt-3 border-t border-brand-primary/15">
                          <div className="flex items-center justify-between text-xs font-semibold text-brand-dark/70 mb-1.5">
                            <span>Resolution Rate</span>
                            <span className="font-bold text-emerald-800">{solvedPercentage}% Solved</span>
                          </div>
                          <div className="h-2.5 w-full rounded-full bg-brand-soft overflow-hidden flex">
                            <div
                              style={{ width: `${solvedPercentage}%` }}
                              className="bg-brand-primary transition-all duration-500 ease-out"
                            />
                            <div
                              style={{ width: `${100 - solvedPercentage}%` }}
                              className="bg-amber-500 transition-all duration-500 ease-out"
                            />
                          </div>
                        </div>
                      )}
                    </section>

                    {/* Action Bar & Question Form Toggle */}
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      {/* Filter Tabs */}
                      <div className="flex items-center rounded-xl bg-brand-soft/50 p-1 border border-brand-primary/20 text-xs font-semibold">
                        <button
                          type="button"
                          onClick={() => setFilterStatus('ALL')}
                          className={`rounded-lg px-3 py-1.5 transition ${
                            filterStatus === 'ALL'
                              ? 'bg-brand-dark text-brand-light shadow-xs'
                              : 'text-brand-dark/75 hover:text-brand-dark'
                          }`}
                        >
                          All ({totalCount})
                        </button>
                        <button
                          type="button"
                          onClick={() => setFilterStatus('Solved')}
                          className={`rounded-lg px-3 py-1.5 transition ${
                            filterStatus === 'Solved'
                              ? 'bg-brand-primary text-brand-light shadow-xs'
                              : 'text-brand-dark/75 hover:text-brand-dark'
                          }`}
                        >
                          Solved ({solvedCount})
                        </button>
                        <button
                          type="button"
                          onClick={() => setFilterStatus('Carry Forward')}
                          className={`rounded-lg px-3 py-1.5 transition ${
                            filterStatus === 'Carry Forward'
                              ? 'bg-amber-600 text-white shadow-xs'
                              : 'text-brand-dark/75 hover:text-brand-dark'
                          }`}
                        >
                          Pending ({carryForwardCount})
                        </button>
                      </div>

                      {/* Add Question Button */}
                      <button
                        type="button"
                        onClick={() => setIsAddingQuestion((prev) => !prev)}
                        className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs sm:text-sm font-bold transition shadow-sm active:scale-98 ${
                          isAddingQuestion
                            ? 'border border-brand-dark/20 bg-brand-soft/70 text-brand-dark'
                            : 'bg-brand-dark text-brand-light hover:bg-brand-dark/90'
                        }`}
                      >
                        <span>{isAddingQuestion ? '✕ Close Form' : '+ Add Question'}</span>
                      </button>
                    </div>

                    {/* Inline Add Question Form */}
                    {isAddingQuestion && (
                      <MentorQuestionForm
                        onSave={handleAddQuestion}
                        onCancel={() => setIsAddingQuestion(false)}
                      />
                    )}

                    {/* Search Bar if questions exist */}
                    {totalCount > 1 && (
                      <div className="relative">
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Search documented questions, categories, resolutions…"
                          className="w-full rounded-xl border border-brand-primary/20 bg-brand-light px-3.5 py-2 pl-9 text-xs sm:text-sm text-brand-dark placeholder:text-brand-dark/40 outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
                        />
                        <span className="absolute left-3 top-2.5 text-brand-dark/40 text-xs">
                          🔍
                        </span>
                        {searchQuery && (
                          <button
                            type="button"
                            onClick={() => setSearchQuery('')}
                            className="absolute right-3 top-2 text-xs text-brand-dark/50 hover:text-brand-dark"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    )}

                    {/* Documented Questions Feed */}
                    <div className="space-y-3">
                      {filteredQuestions.length > 0 ? (
                        filteredQuestions.map((question, index) => (
                          <MentorQuestionCard
                            key={question._id || `q_${index}`}
                            question={question}
                            index={index}
                            onEdit={(q) => setEditingQuestion(q)}
                            onDelete={(q) => setDeletingQuestion(q)}
                            onToggleStatus={handleToggleStatus}
                            isToggling={togglingQuestionId === question._id}
                          />
                        ))
                      ) : totalCount === 0 ? (
                        <div className="rounded-2xl border border-dashed border-brand-primary/25 bg-brand-light p-8 sm:p-12 text-center">
                          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-brand-soft text-xl">
                            💡
                          </div>
                          <h4 className="font-bold text-sm sm:text-base text-brand-dark">
                            No questions documented yet
                          </h4>
                          <p className="mt-1 text-xs text-brand-dark/65 max-w-sm mx-auto leading-relaxed">
                            Click below to record questions, problems, and solutions discussed in this mentoring session.
                          </p>
                          <button
                            type="button"
                            onClick={() => setIsAddingQuestion(true)}
                            className="mt-4 rounded-xl bg-brand-dark px-4 py-2 text-xs font-bold text-brand-light hover:bg-brand-dark/90 shadow-xs transition active:scale-98"
                          >
                            + Add First Question
                          </button>
                        </div>
                      ) : (
                        <div className="rounded-xl border border-brand-primary/15 bg-brand-light/60 p-8 text-center text-xs text-brand-dark/60">
                          No questions matching the current filter.
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Edit Question Modal */}
      {editingQuestion && (
        <Modal
          isOpen
          title="Edit Documented Question"
          onClose={() => setEditingQuestion(null)}
          maxWidth="max-w-xl"
        >
          <MentorQuestionForm
            initial={editingQuestion}
            onSave={handleUpdateQuestion}
            onCancel={() => setEditingQuestion(null)}
            isModal
          />
        </Modal>
      )}

      {/* Delete Question Dialog */}
      <ConfirmDialog
        isOpen={Boolean(deletingQuestion)}
        onClose={() => setDeletingQuestion(null)}
        onConfirm={handleDeleteQuestion}
        title="Delete this question?"
        message="This question and its recorded resolution will be permanently removed from this mentoring session."
        confirmText="Delete Question"
        variant="danger"
      />

      {/* Reset Entire Workspace Dialog */}
      <ConfirmDialog
        isOpen={deletingWorkspace}
        onClose={() => setDeletingWorkspace(false)}
        onConfirm={handleDeleteWorkspace}
        title="Reset Mentoring Workspace?"
        message="This will delete all documented questions and mentoring context for this session."
        confirmText="Reset Workspace"
        variant="danger"
      />

      {/* Feedback Toast */}
      {toast.message && (
        <Toast
          message={toast.message}
          kind={toast.kind}
          onClose={() => setToast({ message: '', kind: 'success' })}
        />
      )}
    </div>
  );
}
