import { useState, useEffect, useMemo, useCallback } from 'react';
import mentorLogService, { subscribeToMentorLogsUpdated } from '../../services/mentorLogService';
import {
  QUESTION_CATEGORIES,
  QUESTION_STATUSES,
} from '../../constants/workLogConstants';
import {
  getTodayDateString,
  formatDateForInput,
  formatDate,
  formatGroupDate,
} from '../../utils/dateUtils';
import { formatMinutes, formatDisplayTime } from '../../utils/timeUtils';
import Loader from '../common/Loader';
import EmptyState from '../common/EmptyState';
import ConfirmDialog from '../common/ConfirmDialog';

export const MentorLogView = () => {
  const [selectedDate, setSelectedDate] = useState(() => getTodayDateString());
  const [eligibleSessions, setEligibleSessions] = useState([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);
  const [selectedSession, setSelectedSession] = useState(null);

  // Creation form state
  const [isCreating, setIsCreating] = useState(false);
  const [studentBatch, setStudentBatch] = useState('');
  const [subject, setSubject] = useState('');
  const [questions, setQuestions] = useState([
    {
      question: '',
      category: 'Concept Clarification',
      customCategory: '',
      status: 'Solved',
      resolution: '',
      remarks: '',
    },
  ]);
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState(null);

  // Mentor logs list state
  const [mentorLogs, setMentorLogs] = useState([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(true);

  // In-place question edit state
  const [editingQuestionState, setEditingQuestionState] = useState(null); // { mentorLogId, questionId, data }
  const [isSavingQuestion, setIsSavingQuestion] = useState(false);
  const [editingError, setEditingError] = useState('');

  // Delete question confirmation
  const [deleteTarget, setDeleteTarget] = useState(null); // { mentorLogId, questionId }
  const [isDeleting, setIsDeleting] = useState(false);

  // Inline add question to existing session state
  const [addingToSessionId, setAddingToSessionId] = useState(null);
  const [newQuestionData, setNewQuestionData] = useState({
    question: '',
    category: 'Concept Clarification',
    customCategory: '',
    status: 'Solved',
    resolution: '',
    remarks: '',
  });

  // Expanded sessions in history
  const [expandedSessions, setExpandedSessions] = useState(() => new Set());

  // 1. Fetch eligible WorkLog sessions for selected date
  const loadEligibleSessions = useCallback(async (date) => {
    setIsLoadingSessions(true);
    try {
      const res = await mentorLogService.getEligibleWorkLogs(date);
      setEligibleSessions(res.data || []);
    } catch (err) {
      console.error('Error loading eligible sessions:', err);
      setEligibleSessions([]);
    } finally {
      setIsLoadingSessions(false);
    }
  }, []);

  // 2. Fetch all mentor logs
  const loadMentorLogs = useCallback(async () => {
    try {
      const res = await mentorLogService.getAllMentorLogs();
      setMentorLogs(res.data || []);
    } catch (err) {
      console.error('Error loading mentor logs:', err);
    } finally {
      setIsLoadingLogs(false);
    }
  }, []);

  useEffect(() => {
    let isCancelled = false;

    const fetchSessions = async () => {
      try {
        const res = await mentorLogService.getEligibleWorkLogs(selectedDate);
        if (!isCancelled) {
          setEligibleSessions(res.data || []);
        }
      } catch (err) {
        console.error('Error loading eligible sessions:', err);
        if (!isCancelled) {
          setEligibleSessions([]);
        }
      } finally {
        if (!isCancelled) {
          setIsLoadingSessions(false);
        }
      }
    };

    fetchSessions();

    return () => {
      isCancelled = true;
    };
  }, [selectedDate]);

  useEffect(() => {
    let isCancelled = false;

    const fetchLogs = async () => {
      try {
        const res = await mentorLogService.getAllMentorLogs();
        if (!isCancelled) {
          setMentorLogs(res.data || []);
        }
      } catch (err) {
        console.error('Error loading mentor logs:', err);
      } finally {
        if (!isCancelled) {
          setIsLoadingLogs(false);
        }
      }
    };

    fetchLogs();

    const unsubscribe = subscribeToMentorLogsUpdated(() => {
      if (!isCancelled) {
        fetchLogs();
        mentorLogService
          .getEligibleWorkLogs(selectedDate)
          .then((res) => {
            if (!isCancelled) setEligibleSessions(res.data || []);
          })
          .catch(() => {});
      }
    });

    return () => {
      isCancelled = true;
      unsubscribe();
    };
  }, [selectedDate]);

  // When a session card is clicked
  const handleSelectSession = (session) => {
    if (session.hasMentorLog) {
      // If details already exist, expand and scroll to that session
      if (session.mentorLogId) {
        setExpandedSessions((prev) => new Set(prev).add(session.mentorLogId));
      }
      return;
    }
    setSelectedSession(session);
    setIsCreating(true);
    setStudentBatch('');
    setSubject('');
    setQuestions([
      {
        question: '',
        category: 'Concept Clarification',
        customCategory: '',
        status: 'Solved',
        resolution: '',
        remarks: '',
      },
    ]);
    setFormError('');
  };

  // Question management in creation form
  const handleAddQuestionRow = () => {
    setQuestions((prev) => [
      ...prev,
      {
        question: '',
        category: 'Concept Clarification',
        customCategory: '',
        status: 'Solved',
        resolution: '',
        remarks: '',
      },
    ]);
  };

  const handleRemoveQuestionRow = (idx) => {
    if (questions.length <= 1) return;
    setQuestions((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleQuestionFieldChange = (idx, field, value) => {
    setQuestions((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [field]: value };
      return copy;
    });
  };

  // Auto-calculated summary in creation form
  const formSummary = useMemo(() => {
    const total = questions.length;
    const solved = questions.filter((q) => q.status === 'Solved').length;
    const carryForward = questions.filter((q) => q.status === 'Carry Forward').length;
    return { total, solved, carryForward };
  }, [questions]);

  // Save new mentor log
  const handleSaveMentorLog = async () => {
    if (!selectedSession) return;
    if (!studentBatch.trim()) {
      setFormError('Student / Batch is required');
      return;
    }
    if (!subject.trim()) {
      setFormError('Subject is required');
      return;
    }

    // Validate questions
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.question.trim()) {
        setFormError(`Question #${i + 1} reference/text is required`);
        return;
      }
      if (q.category === 'Other' && !q.customCategory.trim()) {
        setFormError(`Custom category is required for question #${i + 1}`);
        return;
      }
    }

    setIsSubmitting(true);
    setFormError('');

    try {
      const formattedQuestions = questions.map((q) => ({
        question: q.question.trim(),
        category: q.category === 'Other' ? q.customCategory.trim() : q.category,
        status: q.status,
        resolution: q.resolution.trim(),
        remarks: q.remarks.trim(),
      }));

      await mentorLogService.createMentorLog({
        workLogId: selectedSession._id,
        studentBatch: studentBatch.trim(),
        subject: subject.trim(),
        questions: formattedQuestions,
      });

      setFeedbackMessage({
        type: 'success',
        text: 'Mentoring details saved and queued for Google Sheets sync!',
      });
      setIsCreating(false);
      setSelectedSession(null);
      loadMentorLogs();
      loadEligibleSessions(selectedDate);
    } catch (err) {
      console.error('Error saving mentor log:', err);
      setFormError(err.response?.data?.message || 'Failed to save mentoring details');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Group mentor logs by date
  const groupedMentorLogs = useMemo(() => {
    const groupsMap = new Map();

    mentorLogs.forEach((item) => {
      const dateStr = formatDateForInput(item.workLog?.date);
      if (!dateStr) return;

      if (!groupsMap.has(dateStr)) {
        groupsMap.set(dateStr, []);
      }
      groupsMap.get(dateStr).push(item);
    });

    const sortedDates = Array.from(groupsMap.keys()).sort((a, b) =>
      b.localeCompare(a),
    );

    return sortedDates.map((dateKey) => ({
      dateKey,
      formattedDate: formatGroupDate(dateKey),
      logs: groupsMap.get(dateKey).sort((a, b) =>
        (a.workLog?.timeFrom || '').localeCompare(b.workLog?.timeFrom || ''),
      ),
    }));
  }, [mentorLogs]);

  // Toggle session question accordion
  const toggleSessionExpand = (id) => {
    setExpandedSessions((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // In-place edit question handlers
  const handleStartEditQuestion = (mentorLogId, question) => {
    const isKnownCat = QUESTION_CATEGORIES.includes(question.category) && question.category !== 'Other';
    setEditingQuestionState({
      mentorLogId,
      questionId: question._id,
      question: question.question,
      category: isKnownCat ? question.category : 'Other',
      customCategory: isKnownCat ? '' : question.category,
      status: question.status || 'Solved',
      resolution: question.resolution || '',
      remarks: question.remarks || '',
    });
    setEditingError('');
  };

  const handleCancelEditQuestion = () => {
    setEditingQuestionState(null);
    setEditingError('');
  };

  const handleSaveEditedQuestion = async () => {
    if (!editingQuestionState) return;
    const { mentorLogId, questionId, question, category, customCategory, status, resolution, remarks } = editingQuestionState;

    if (!question.trim()) {
      setEditingError('Question reference/text is required');
      return;
    }
    if (category === 'Other' && !customCategory.trim()) {
      setEditingError('Custom category is required');
      return;
    }

    setIsSavingQuestion(true);
    setEditingError('');

    try {
      await mentorLogService.updateQuestion(mentorLogId, questionId, {
        question: question.trim(),
        category: category === 'Other' ? customCategory.trim() : category,
        status,
        resolution: resolution.trim(),
        remarks: remarks.trim(),
      });
      setEditingQuestionState(null);
      loadMentorLogs();
    } catch (err) {
      console.error('Error updating question:', err);
      setEditingError(err.response?.data?.message || 'Failed to update question');
    } finally {
      setIsSavingQuestion(false);
    }
  };

  // Add question to existing session handlers
  const handleStartAddToSession = (mentorLogId) => {
    setAddingToSessionId(mentorLogId);
    setNewQuestionData({
      question: '',
      category: 'Concept Clarification',
      customCategory: '',
      status: 'Solved',
      resolution: '',
      remarks: '',
    });
  };

  const handleSaveNewQuestionToSession = async (mentorLogId) => {
    if (!newQuestionData.question.trim()) {
      alert('Question reference is required');
      return;
    }
    if (newQuestionData.category === 'Other' && !newQuestionData.customCategory.trim()) {
      alert('Custom category is required');
      return;
    }

    try {
      await mentorLogService.addQuestion(mentorLogId, {
        question: newQuestionData.question.trim(),
        category:
          newQuestionData.category === 'Other'
            ? newQuestionData.customCategory.trim()
            : newQuestionData.category,
        status: newQuestionData.status,
        resolution: newQuestionData.resolution.trim(),
        remarks: newQuestionData.remarks.trim(),
      });
      setAddingToSessionId(null);
      loadMentorLogs();
    } catch (err) {
      console.error('Error adding question to session:', err);
      alert('Failed to add question');
    }
  };

  // Delete question confirmation
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await mentorLogService.deleteQuestion(
        deleteTarget.mentorLogId,
        deleteTarget.questionId,
      );
      setDeleteTarget(null);
      loadMentorLogs();
    } catch (err) {
      console.error('Error deleting question:', err);
      alert('Failed to delete question');
    } finally {
      setIsDeleting(false);
    }
  };

  const getQuestionStatusBadge = (status) => {
    if (status === 'Solved') {
      return 'bg-brand-soft border border-brand-primary/40 text-brand-dark font-semibold';
    }
    return 'bg-brand-primary/25 border border-brand-primary text-brand-dark font-semibold';
  };

  return (
    <div className="space-y-6 text-left">
      {/* Feedback banner */}
      {feedbackMessage && (
        <div className="p-4 rounded-xl border border-brand-primary bg-brand-soft/60 text-brand-dark font-semibold flex items-center justify-between">
          <span>{feedbackMessage.text}</span>
          <button
            type="button"
            onClick={() => setFeedbackMessage(null)}
            className="text-brand-dark/60 hover:text-brand-dark p-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* 1. Date Selection & Eligible Mentoring Sessions Picker */}
      <div className="bg-brand-light border border-brand-primary/30 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-brand-primary/20">
          <div>
            <h3 className="text-xl sm:text-2xl font-bold text-brand-dark tracking-tight">
              Mentor Log Session Entry
            </h3>
            <p className="text-sm text-brand-dark/70 mt-1">
              Select a date to attach mentoring details and questions to an existing Work Log.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <label htmlFor="mentor-date-picker" className="text-sm font-semibold text-brand-dark">
              Date:
            </label>
            <input
              id="mentor-date-picker"
              type="date"
              value={selectedDate}
              onChange={(e) => {
                setSelectedDate(e.target.value);
                setSelectedSession(null);
                setIsCreating(false);
              }}
              className="px-3.5 py-2 text-sm sm:text-base bg-brand-light text-brand-dark rounded-xl border border-brand-dark/20 focus:border-brand-dark focus:ring-1 focus:ring-brand-primary outline-none"
            />
          </div>
        </div>

        {/* Sessions list for selected date */}
        <div>
          <h4 className="text-xs uppercase font-bold tracking-wider text-brand-dark/70 mb-3">
            Select Work Log Session ({formatDate(selectedDate)})
          </h4>

          {isLoadingSessions ? (
            <div className="py-6 text-center text-sm font-semibold text-brand-dark/70">
              Loading sessions...
            </div>
          ) : eligibleSessions.length === 0 ? (
            <div className="py-6 px-4 rounded-xl bg-brand-soft/25 border border-dashed border-brand-primary/40 text-center text-sm text-brand-dark/70">
              No mentoring Work Logs found for {formatDate(selectedDate)}.
              <p className="mt-1 text-xs text-brand-dark/60">
                To log mentoring details, first record a Work Log on this date with Activity Type{' '}
                <span className="font-semibold text-brand-dark">&quot;Mentoring Session&quot;</span> or{' '}
                <span className="font-semibold text-brand-dark">&quot;Doubt Clarification&quot;</span>.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {eligibleSessions.map((session) => {
                const isSelected = selectedSession?._id === session._id;
                return (
                  <button
                    key={session._id}
                    type="button"
                    onClick={() => handleSelectSession(session)}
                    className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-brand-soft border-brand-dark shadow-sm'
                        : session.hasMentorLog
                          ? 'bg-brand-soft/30 border-brand-primary/40 hover:bg-brand-soft/50'
                          : 'bg-brand-light border-brand-primary/30 hover:border-brand-primary hover:bg-brand-soft/20 shadow-2xs'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-xs font-bold text-brand-dark bg-brand-primary/30 px-2.5 py-1 rounded-md">
                        {formatDisplayTime(session.timeFrom)} – {formatDisplayTime(session.timeTo)}
                      </span>
                      <span className="text-xs font-bold text-brand-dark/70">
                        {formatMinutes(session.spentMinutes)}
                      </span>
                    </div>

                    <p className="font-bold text-base text-brand-dark truncate mb-1">
                      {session.task}
                    </p>

                    <div className="flex items-center justify-between text-xs text-brand-dark/70 mt-2">
                      <span>{session.activityType}</span>
                      {session.hasMentorLog ? (
                        <span className="font-semibold text-brand-dark bg-brand-soft px-2 py-0.5 rounded border border-brand-primary/40">
                          ✓ Details Logged
                        </span>
                      ) : (
                        <span className="font-semibold text-brand-dark underline">
                          + Add Mentoring
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* 2. Inline Creation Form (No Modal!) */}
        {isCreating && selectedSession && (
          <div className="pt-6 border-t border-brand-primary/30 space-y-5">
            <div className="bg-brand-soft/30 border border-brand-primary/40 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-xs uppercase font-bold tracking-wider text-brand-dark/70 block">
                  Recording Mentoring For Work Log Session:
                </span>
                <span className="text-base sm:text-lg font-bold text-brand-dark">
                  {selectedSession.task}
                </span>
              </div>
              <div className="flex items-center gap-3 text-sm font-semibold text-brand-dark/80">
                <span>{formatDate(selectedSession.date)}</span>
                <span>•</span>
                <span>
                  {formatDisplayTime(selectedSession.timeFrom)} – {formatDisplayTime(selectedSession.timeTo)} ({formatMinutes(selectedSession.spentMinutes)})
                </span>
              </div>
            </div>

            {formError && (
              <div className="p-3 rounded-lg bg-brand-soft border border-brand-dark/30 text-sm font-semibold text-brand-dark">
                {formError}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-semibold text-brand-dark block mb-1.5">
                  Student / Batch <span className="text-brand-dark font-bold">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. MERN Batch 3 / John Doe"
                  value={studentBatch}
                  onChange={(e) => setStudentBatch(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-base bg-brand-light text-brand-dark rounded-xl border border-brand-dark/20 focus:border-brand-dark focus:ring-1 focus:ring-brand-primary outline-none"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-brand-dark block mb-1.5">
                  Subject <span className="text-brand-dark font-bold">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. JavaScript, React, Node.js, MongoDB"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-base bg-brand-light text-brand-dark rounded-xl border border-brand-dark/20 focus:border-brand-dark focus:ring-1 focus:ring-brand-primary outline-none"
                />
              </div>
            </div>

            {/* Questions list */}
            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between">
                <h5 className="text-base font-bold text-brand-dark">
                  Questions Handled ({questions.length})
                </h5>
                <button
                  type="button"
                  onClick={handleAddQuestionRow}
                  className="px-3.5 py-1.5 rounded-lg bg-brand-soft hover:bg-brand-primary/40 text-brand-dark text-sm font-semibold border border-brand-primary/40 transition-colors cursor-pointer"
                >
                  + Add Question
                </button>
              </div>

              {questions.map((q, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-xl bg-brand-light border border-brand-primary/30 space-y-3.5 shadow-2xs"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-brand-primary/20">
                    <span className="text-xs uppercase font-bold tracking-wider text-brand-dark">
                      Question #{idx + 1}
                    </span>
                    {questions.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveQuestionRow(idx)}
                        className="text-xs font-semibold text-brand-dark/60 hover:text-brand-dark"
                      >
                        Remove
                      </button>
                    )}
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-brand-dark block mb-1">
                      Question / Problem Reference <span className="text-brand-dark">*</span>
                    </label>
                    <textarea
                      rows="2"
                      placeholder="Describe the student's question or problem..."
                      value={q.question}
                      onChange={(e) => handleQuestionFieldChange(idx, 'question', e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-brand-light text-brand-dark rounded-lg border border-brand-dark/20 focus:border-brand-dark focus:ring-1 focus:ring-brand-primary outline-none resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="text-xs font-semibold text-brand-dark block mb-1">
                        Question Category
                      </label>
                      <select
                        value={q.category}
                        onChange={(e) => handleQuestionFieldChange(idx, 'category', e.target.value)}
                        className="w-full px-3 py-2 text-sm bg-brand-light text-brand-dark rounded-lg border border-brand-dark/20 focus:border-brand-dark focus:ring-1 focus:ring-brand-primary outline-none"
                      >
                        {QUESTION_CATEGORIES.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>

                      {q.category === 'Other' && (
                        <input
                          type="text"
                          placeholder="Enter custom category *"
                          value={q.customCategory}
                          onChange={(e) => handleQuestionFieldChange(idx, 'customCategory', e.target.value)}
                          className="w-full mt-2 px-3 py-2 text-sm bg-brand-light text-brand-dark rounded-lg border border-brand-dark focus:border-brand-dark focus:ring-1 focus:ring-brand-primary outline-none"
                        />
                      )}
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-brand-dark block mb-1">
                        Status
                      </label>
                      <select
                        value={q.status}
                        onChange={(e) => handleQuestionFieldChange(idx, 'status', e.target.value)}
                        className="w-full px-3 py-2 text-sm bg-brand-light text-brand-dark rounded-lg border border-brand-dark/20 focus:border-brand-dark focus:ring-1 focus:ring-brand-primary outline-none"
                      >
                        {QUESTION_STATUSES.map((st) => (
                          <option key={st} value={st}>
                            {st}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="text-xs font-semibold text-brand-dark block mb-1">
                        Resolution / Explanation
                      </label>
                      <textarea
                        rows="2"
                        placeholder="Solution or explanation provided..."
                        value={q.resolution}
                        onChange={(e) => handleQuestionFieldChange(idx, 'resolution', e.target.value)}
                        className="w-full px-3 py-2 text-sm bg-brand-light text-brand-dark rounded-lg border border-brand-dark/20 focus:border-brand-dark focus:ring-1 focus:ring-brand-primary outline-none resize-none"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-brand-dark block mb-1">
                        Remarks
                      </label>
                      <textarea
                        rows="2"
                        placeholder="Additional notes or follow-up needed..."
                        value={q.remarks}
                        onChange={(e) => handleQuestionFieldChange(idx, 'remarks', e.target.value)}
                        className="w-full px-3 py-2 text-sm bg-brand-light text-brand-dark rounded-lg border border-brand-dark/20 focus:border-brand-dark focus:ring-1 focus:ring-brand-primary outline-none resize-none"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Auto-calculated summary strip */}
            <div className="bg-brand-soft/40 border border-brand-primary/30 rounded-xl px-4 py-3 text-sm font-semibold text-brand-dark flex items-center justify-between flex-wrap gap-4">
              <span>Auto-Calculated Question Summary:</span>
              <div className="flex items-center gap-4">
                <span>Total: <strong className="text-brand-dark">{formSummary.total}</strong></span>
                <span>•</span>
                <span>Solved: <strong className="text-brand-dark">{formSummary.solved}</strong></span>
                <span>•</span>
                <span>Carry Forward: <strong className="text-brand-dark">{formSummary.carryForward}</strong></span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsCreating(false);
                  setSelectedSession(null);
                }}
                disabled={isSubmitting}
                className="px-4 py-2.5 rounded-xl border border-brand-dark/30 text-sm font-semibold text-brand-dark hover:bg-brand-soft/50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveMentorLog}
                disabled={isSubmitting}
                className="px-5 py-2.5 rounded-xl bg-brand-primary hover:bg-brand-primary/80 text-brand-dark text-sm font-bold shadow-xs transition-colors cursor-pointer"
              >
                {isSubmitting ? 'Saving Details...' : 'Save Mentoring Details'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 3. Mentor Log History Grouped by Date */}
      <div className="space-y-4 pt-2">
        <div className="flex items-center justify-between pb-2 border-b border-brand-primary/20">
          <h3 className="text-xl sm:text-2xl font-bold text-brand-dark tracking-tight">
            Recorded Mentor Logs
          </h3>
          <span className="text-xs sm:text-sm font-semibold text-brand-dark/70">
            {mentorLogs.length} session{mentorLogs.length === 1 ? '' : 's'} recorded
          </span>
        </div>

        {isLoadingLogs ? (
          <Loader text="Loading mentor logs..." />
        ) : groupedMentorLogs.length === 0 ? (
          <EmptyState
            title="No mentor logs recorded yet"
            description="Select a mentoring Work Log session above to record detailed student and question evidence."
          />
        ) : (
          groupedMentorLogs.map((dateGroup) => (
            <div
              key={dateGroup.dateKey}
              className="bg-brand-light border border-brand-primary/30 rounded-2xl overflow-hidden shadow-xs space-y-3 p-5 sm:p-6"
            >
              <div className="flex items-center justify-between pb-3 border-b border-brand-primary/20">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-brand-dark text-brand-light flex items-center justify-center font-bold text-sm">
                    M
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-brand-dark">
                      {dateGroup.formattedDate}
                    </h4>
                    <span className="text-xs text-brand-dark/70">
                      {dateGroup.logs.length} mentoring session{dateGroup.logs.length === 1 ? '' : 's'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Sessions in this date */}
              <div className="space-y-4 pt-1">
                {dateGroup.logs.map((item) => {
                  const isExpanded = expandedSessions.has(item._id);
                  return (
                    <div
                      key={item._id}
                      className="border border-brand-primary/30 rounded-xl bg-brand-soft/20 p-4 sm:p-5 space-y-3"
                    >
                      {/* Session Header Strip */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-brand-primary/20">
                        <div>
                          <div className="flex items-center gap-2.5 flex-wrap">
                            <span className="text-xs font-bold text-brand-dark bg-brand-soft px-2.5 py-1 rounded-md border border-brand-primary/40">
                              {formatDisplayTime(item.workLog?.timeFrom)} – {formatDisplayTime(item.workLog?.timeTo)}
                            </span>
                            <span className="text-base sm:text-lg font-bold text-brand-dark">
                              {item.workLog?.task || 'Mentoring Session'}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-xs sm:text-sm font-semibold text-brand-dark/80 mt-1.5">
                            <span>Batch: <strong className="text-brand-dark">{item.studentBatch}</strong></span>
                            <span>•</span>
                            <span>Subject: <strong className="text-brand-dark">{item.subject}</strong></span>
                          </div>
                        </div>

                        {/* Automatic counters badge */}
                        <div className="flex items-center gap-2 shrink-0">
                          <div className="bg-brand-light border border-brand-primary/40 px-3 py-1.5 rounded-lg text-xs font-semibold text-brand-dark flex items-center gap-2">
                            <span>Total: <strong>{item.totalQuestions || item.questions?.length || 0}</strong></span>
                            <span>•</span>
                            <span>Solved: <strong className="text-brand-dark">{item.solvedQuestions || 0}</strong></span>
                            <span>•</span>
                            <span>Carry: <strong className="text-brand-dark">{item.carryForwardQuestions || 0}</strong></span>
                          </div>
                          <button
                            type="button"
                            onClick={() => toggleSessionExpand(item._id)}
                            className="px-3 py-1.5 rounded-lg bg-brand-soft text-xs font-bold text-brand-dark border border-brand-primary/40 hover:bg-brand-primary/30 transition-colors"
                          >
                            {isExpanded ? 'Hide Details' : 'View Details'}
                          </button>
                        </div>
                      </div>

                      {/* Expandable questions section */}
                      {isExpanded && (
                        <div className="space-y-3.5 pt-2">
                          <div className="flex items-center justify-between">
                            <h5 className="text-sm font-bold text-brand-dark">
                              Questions ({item.questions?.length || 0})
                            </h5>
                            <button
                              type="button"
                              onClick={() => handleStartAddToSession(item._id)}
                              className="text-xs font-bold text-brand-dark underline hover:text-brand-dark/80"
                            >
                              + Add Question
                            </button>
                          </div>

                          {/* Inline form to add question to this existing session */}
                          {addingToSessionId === item._id && (
                            <div className="p-4 rounded-xl bg-brand-light border border-brand-dark/30 space-y-3 text-left">
                              <span className="text-xs uppercase font-bold text-brand-dark">
                                Add Question to Session
                              </span>
                              <textarea
                                rows="2"
                                placeholder="Question or problem reference..."
                                value={newQuestionData.question}
                                onChange={(e) => setNewQuestionData((prev) => ({ ...prev, question: e.target.value }))}
                                className="w-full px-3 py-2 text-sm bg-brand-light text-brand-dark rounded-lg border border-brand-dark/20 outline-none resize-none"
                              />
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                  <label className="text-xs font-semibold block mb-1">Category</label>
                                  <select
                                    value={newQuestionData.category}
                                    onChange={(e) => setNewQuestionData((prev) => ({ ...prev, category: e.target.value }))}
                                    className="w-full px-3 py-2 text-sm bg-brand-light text-brand-dark rounded-lg border border-brand-dark/20"
                                  >
                                    {QUESTION_CATEGORIES.map((c) => (
                                      <option key={c} value={c}>{c}</option>
                                    ))}
                                  </select>
                                  {newQuestionData.category === 'Other' && (
                                    <input
                                      type="text"
                                      placeholder="Custom category *"
                                      value={newQuestionData.customCategory}
                                      onChange={(e) => setNewQuestionData((prev) => ({ ...prev, customCategory: e.target.value }))}
                                      className="w-full mt-2 px-3 py-1.5 text-sm bg-brand-light text-brand-dark rounded-lg border border-brand-dark"
                                    />
                                  )}
                                </div>
                                <div>
                                  <label className="text-xs font-semibold block mb-1">Status</label>
                                  <select
                                    value={newQuestionData.status}
                                    onChange={(e) => setNewQuestionData((prev) => ({ ...prev, status: e.target.value }))}
                                    className="w-full px-3 py-2 text-sm bg-brand-light text-brand-dark rounded-lg border border-brand-dark/20"
                                  >
                                    {QUESTION_STATUSES.map((s) => (
                                      <option key={s} value={s}>{s}</option>
                                    ))}
                                  </select>
                                </div>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <textarea
                                  rows="2"
                                  placeholder="Resolution / Explanation..."
                                  value={newQuestionData.resolution}
                                  onChange={(e) => setNewQuestionData((prev) => ({ ...prev, resolution: e.target.value }))}
                                  className="w-full px-3 py-2 text-sm bg-brand-light text-brand-dark rounded-lg border border-brand-dark/20 resize-none"
                                />
                                <textarea
                                  rows="2"
                                  placeholder="Remarks..."
                                  value={newQuestionData.remarks}
                                  onChange={(e) => setNewQuestionData((prev) => ({ ...prev, remarks: e.target.value }))}
                                  className="w-full px-3 py-2 text-sm bg-brand-light text-brand-dark rounded-lg border border-brand-dark/20 resize-none"
                                />
                              </div>
                              <div className="flex justify-end gap-2 pt-1">
                                <button
                                  type="button"
                                  onClick={() => setAddingToSessionId(null)}
                                  className="px-3 py-1.5 rounded-lg border text-xs font-semibold"
                                >
                                  Cancel
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleSaveNewQuestionToSession(item._id)}
                                  className="px-4 py-1.5 rounded-lg bg-brand-primary text-brand-dark font-bold text-xs"
                                >
                                  Save Question
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Questions list */}
                          <div className="divide-y divide-brand-primary/20">
                            {(item.questions || []).map((q, qIndex) => {
                              const isEditingThis =
                                editingQuestionState?.mentorLogId === item._id &&
                                editingQuestionState?.questionId === q._id;

                              if (isEditingThis) {
                                return (
                                  <div
                                    key={q._id}
                                    className="p-4 rounded-xl bg-brand-light border border-brand-dark my-2 space-y-3"
                                  >
                                    <span className="text-xs uppercase font-bold text-brand-dark">
                                      Editing Question #{qIndex + 1}
                                    </span>
                                    {editingError && (
                                      <p className="text-xs font-bold text-brand-dark bg-brand-soft p-2 rounded">
                                        {editingError}
                                      </p>
                                    )}
                                    <textarea
                                      rows="2"
                                      value={editingQuestionState.question}
                                      onChange={(e) => setEditingQuestionState((prev) => ({ ...prev, question: e.target.value }))}
                                      className="w-full px-3 py-2 text-sm bg-brand-light text-brand-dark rounded-lg border border-brand-dark/20 resize-none"
                                    />
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                      <div>
                                        <label className="text-xs font-semibold block mb-1">Category</label>
                                        <select
                                          value={editingQuestionState.category}
                                          onChange={(e) => setEditingQuestionState((prev) => ({ ...prev, category: e.target.value }))}
                                          className="w-full px-3 py-2 text-sm bg-brand-light text-brand-dark rounded-lg border border-brand-dark/20"
                                        >
                                          {QUESTION_CATEGORIES.map((c) => (
                                            <option key={c} value={c}>{c}</option>
                                          ))}
                                        </select>
                                        {editingQuestionState.category === 'Other' && (
                                          <input
                                            type="text"
                                            value={editingQuestionState.customCategory}
                                            onChange={(e) => setEditingQuestionState((prev) => ({ ...prev, customCategory: e.target.value }))}
                                            className="w-full mt-2 px-3 py-1.5 text-sm bg-brand-light text-brand-dark rounded-lg border border-brand-dark"
                                          />
                                        )}
                                      </div>
                                      <div>
                                        <label className="text-xs font-semibold block mb-1">Status</label>
                                        <select
                                          value={editingQuestionState.status}
                                          onChange={(e) => setEditingQuestionState((prev) => ({ ...prev, status: e.target.value }))}
                                          className="w-full px-3 py-2 text-sm bg-brand-light text-brand-dark rounded-lg border border-brand-dark/20"
                                        >
                                          {QUESTION_STATUSES.map((s) => (
                                            <option key={s} value={s}>{s}</option>
                                          ))}
                                        </select>
                                      </div>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                      <textarea
                                        rows="2"
                                        placeholder="Resolution..."
                                        value={editingQuestionState.resolution}
                                        onChange={(e) => setEditingQuestionState((prev) => ({ ...prev, resolution: e.target.value }))}
                                        className="w-full px-3 py-2 text-sm bg-brand-light text-brand-dark rounded-lg border border-brand-dark/20 resize-none"
                                      />
                                      <textarea
                                        rows="2"
                                        placeholder="Remarks..."
                                        value={editingQuestionState.remarks}
                                        onChange={(e) => setEditingQuestionState((prev) => ({ ...prev, remarks: e.target.value }))}
                                        className="w-full px-3 py-2 text-sm bg-brand-light text-brand-dark rounded-lg border border-brand-dark/20 resize-none"
                                      />
                                    </div>
                                    <div className="flex justify-end gap-2 pt-1">
                                      <button
                                        type="button"
                                        onClick={handleCancelEditQuestion}
                                        disabled={isSavingQuestion}
                                        className="px-3 py-1.5 rounded-lg border text-xs font-semibold"
                                      >
                                        Cancel
                                      </button>
                                      <button
                                        type="button"
                                        onClick={handleSaveEditedQuestion}
                                        disabled={isSavingQuestion}
                                        className="px-4 py-1.5 rounded-lg bg-brand-primary text-brand-dark font-bold text-xs"
                                      >
                                        {isSavingQuestion ? 'Saving...' : 'Save Changes'}
                                      </button>
                                    </div>
                                  </div>
                                );
                              }

                              return (
                                <div
                                  key={q._id}
                                  className="py-3 flex flex-col sm:flex-row sm:items-start justify-between gap-3"
                                >
                                  <div className="space-y-1.5 flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="text-xs font-bold text-brand-dark/60">
                                        #{qIndex + 1}
                                      </span>
                                      <span className="font-bold text-sm sm:text-base text-brand-dark">
                                        {q.question}
                                      </span>
                                      <span className="text-xs bg-brand-soft/70 px-2 py-0.5 rounded font-semibold text-brand-dark">
                                        {q.category}
                                      </span>
                                      <span className={`text-xs px-2.5 py-0.5 rounded-full ${getQuestionStatusBadge(q.status)}`}>
                                        {q.status}
                                      </span>
                                    </div>

                                    {q.resolution && (
                                      <p className="text-xs sm:text-sm text-brand-dark/80 pl-4 border-l-2 border-brand-primary/40">
                                        <strong className="text-brand-dark">Resolution:</strong> {q.resolution}
                                      </p>
                                    )}

                                    {q.remarks && (
                                      <p className="text-xs text-brand-dark/70 pl-4 border-l-2 border-brand-dark/20 italic">
                                        <strong className="not-italic text-brand-dark/80">Remarks:</strong> {q.remarks}
                                      </p>
                                    )}
                                  </div>

                                  {/* In-place edit/delete controls */}
                                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-start pt-1">
                                    <button
                                      type="button"
                                      onClick={() => handleStartEditQuestion(item._id, q)}
                                      className="p-1 text-xs font-semibold text-brand-dark hover:underline"
                                    >
                                      Edit
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setDeleteTarget({ mentorLogId: item._id, questionId: q._id })}
                                      className="p-1 text-xs font-semibold text-brand-dark/60 hover:text-brand-dark hover:underline"
                                    >
                                      Delete
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Delete confirmation dialog */}
      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        title="Delete Question"
        message="Are you sure you want to delete this mentoring question? The corresponding row in the Mentor Logs Google Sheet will also be removed."
        confirmText="Delete"
        cancelText="Cancel"
        isDestructive
        isLoading={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};

export default MentorLogView;
