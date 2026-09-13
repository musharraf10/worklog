/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect, useRef } from 'react';
import { QUESTION_CATEGORIES } from '../../constants/workLogConstants';

const blankQuestion = {
  question: '',
  category: 'Concept Clarification',
  status: 'Solved',
  resolution: '',
  remarks: '',
};

// Primary quick-select categories for 1-tap selection
const POPULAR_CATEGORIES = [
  'Concept Clarification',
  'Coding / Programming',
  'Debugging',
  'DSA / Problem Solving',
  'Frontend',
  'Backend',
  'Database',
  'Project Related',
  'Assignment',
  'Other',
];

export default function MentorQuestionForm({
  initial = blankQuestion,
  onSave,
  onCancel,
  isModal = false,
}) {
  const [form, setForm] = useState({ ...blankQuestion, ...initial });
  const [saving, setSaving] = useState(false);
  const [savingAnother, setSavingAnother] = useState(false);
  const [error, setError] = useState('');
  const questionInputRef = useRef(null);

  useEffect(() => {
    setForm({ ...blankQuestion, ...initial });
  }, [initial]);

  useEffect(() => {
    if (questionInputRef.current) {
      questionInputRef.current.focus();
    }
  }, []);

  const update = (name, value) => {
    setForm((prev) => ({ ...prev, [name]: value }));
    if (error) setError('');
  };

  const handleKeyDown = (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSubmit(e, false);
    }
  };

  const validate = () => {
    if (!form.question.trim()) {
      setError('Please enter the question or problem described by the student.');
      return false;
    }
    if (form.question.trim().length < 3) {
      setError('Question description should be at least 3 characters.');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e, addAnother = false) => {
    if (e) e.preventDefault();
    if (!validate()) return;

    if (addAnother) {
      setSavingAnother(true);
    } else {
      setSaving(true);
    }

    try {
      await onSave(
        {
          question: form.question.trim(),
          category: form.category,
          status: form.status,
          resolution: form.resolution.trim(),
          remarks: form.remarks.trim(),
        },
        addAnother
      );

      if (addAnother) {
        setForm((prev) => ({
          ...prev,
          question: '',
          resolution: '',
          remarks: '',
        }));
        if (questionInputRef.current) {
          questionInputRef.current.focus();
        }
      }
    } catch (err) {
      setError(err?.message || 'Unable to save question. Please check and retry.');
    } finally {
      setSaving(false);
      setSavingAnother(false);
    }
  };

  const isSolved = form.status === 'Solved';

  return (
    <form
      onSubmit={(e) => handleSubmit(e, false)}
      className={`${
        isModal
          ? 'space-y-4'
          : 'mentor-slide-down rounded-2xl border-2 border-brand-primary/25 bg-brand-light/95 p-4 sm:p-6 shadow-sm mb-5 transition-all'
      }`}
    >
      {/* Form Header (only when inline) */}
      {!isModal && (
        <div className="flex items-center justify-between border-b border-brand-primary/15 pb-3.5 mb-4">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-primary text-brand-light text-sm font-bold shadow-xs">
              +
            </span>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-brand-dark">
                Document Student Question
              </h3>
              <p className="text-xs text-brand-dark/65 hidden sm:block">
                Record the problem discussed and the resolution provided.
              </p>
            </div>
          </div>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="rounded-lg p-1.5 text-xs font-semibold text-brand-dark/60 hover:bg-brand-soft hover:text-brand-dark transition-colors"
            >
              ✕ Close
            </button>
          )}
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs sm:text-sm font-medium text-red-700 flex items-center gap-2">
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {/* 1. Status Segmented Switcher */}
      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-brand-dark/70 mb-1.5">
          Resolution Status
        </label>
        <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-brand-soft/50 border border-brand-primary/20 max-w-sm">
          <button
            type="button"
            onClick={() => update('status', 'Solved')}
            className={`flex items-center justify-center gap-2 rounded-lg py-2 px-3 text-xs sm:text-sm font-bold transition-all ${
              isSolved
                ? 'bg-brand-primary text-brand-light shadow-xs'
                : 'text-brand-dark/70 hover:text-brand-dark hover:bg-brand-light/60'
            }`}
          >
            <span className="text-base leading-none">✓</span>
            <span>Solved</span>
          </button>
          <button
            type="button"
            onClick={() => update('status', 'Carry Forward')}
            className={`flex items-center justify-center gap-2 rounded-lg py-2 px-3 text-xs sm:text-sm font-bold transition-all ${
              !isSolved
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-brand-dark/70 hover:text-brand-dark hover:bg-brand-light/60'
            }`}
          >
            <span className="text-base leading-none">⏱</span>
            <span>Carry Forward</span>
          </button>
        </div>
      </div>

      {/* 2. Category Quick Chips */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="block text-xs font-bold uppercase tracking-wider text-brand-dark/70">
            Category
          </label>
          <span className="text-xs text-brand-dark/50 hidden sm:inline">
            Tap a chip or pick from dropdown
          </span>
        </div>

        {/* Quick tap chips */}
        <div className="flex flex-wrap gap-1.5 mb-2">
          {POPULAR_CATEGORIES.map((cat) => {
            const isSelected = form.category === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => update('category', cat)}
                className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-all ${
                  isSelected
                    ? 'bg-brand-dark text-brand-light shadow-xs scale-100 font-semibold ring-2 ring-brand-dark/20'
                    : 'bg-brand-soft/40 border border-brand-primary/20 text-brand-dark/80 hover:bg-brand-soft hover:text-brand-dark active:scale-95'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>

        {/* Dropdown in case category is outside quick list */}
        <select
          value={form.category}
          onChange={(e) => update('category', e.target.value)}
          className="w-full sm:w-72 rounded-lg border border-brand-primary/25 bg-brand-light px-3 py-1.5 text-xs text-brand-dark outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
        >
          {QUESTION_CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </div>

      {/* 3. Question / Problem Textarea */}
      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-brand-dark/70 mb-1.5">
          Question / Problem <span className="text-red-500">*</span>
        </label>
        <textarea
          ref={questionInputRef}
          required
          rows={3}
          value={form.question}
          onChange={(e) => update('question', e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="What was the student asking or working through? (e.g. Cannot connect PostgreSQL database in Docker container)"
          className="w-full rounded-xl border border-brand-primary/25 bg-brand-light px-3.5 py-2.5 text-sm text-brand-dark placeholder:text-brand-dark/40 outline-none transition focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/25 resize-y"
        />
      </div>

      {/* 4. Resolution / Discussion Details */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="block text-xs font-bold uppercase tracking-wider text-brand-dark/70">
            {isSolved ? 'Resolution & Explanation' : 'Carry Forward Reason / Next Steps'}
          </label>
          <span className="text-[11px] text-brand-dark/50 italic">
            {isSolved ? 'What solution or explanation was given?' : 'Why is it pending?'}
          </span>
        </div>
        <textarea
          rows={2}
          value={form.resolution}
          onChange={(e) => update('resolution', e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            isSolved
              ? 'e.g. Corrected the host port binding in compose.yml and demonstrated environment variables configuration.'
              : 'e.g. Student needs to complete database schema design first; scheduled to review tomorrow.'
          }
          className="w-full rounded-xl border border-brand-primary/25 bg-brand-light px-3.5 py-2.5 text-sm text-brand-dark placeholder:text-brand-dark/40 outline-none transition focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/25 resize-y"
        />
      </div>

      {/* 5. Remarks (Optional) */}
      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-brand-dark/70 mb-1.5">
          Remarks / Follow-up Notes <span className="font-normal lowercase text-brand-dark/45">(optional)</span>
        </label>
        <input
          type="text"
          value={form.remarks}
          onChange={(e) => update('remarks', e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="e.g. Student grasped the concept quickly, shared documentation link"
          className="w-full rounded-xl border border-brand-primary/25 bg-brand-light px-3.5 py-2 text-sm text-brand-dark placeholder:text-brand-dark/40 outline-none transition focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/25"
        />
      </div>

      {/* Form Action Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-brand-primary/15">
        <span className="text-xs text-brand-dark/50 hidden sm:inline">
          Tip: Press <kbd className="px-1.5 py-0.5 rounded bg-brand-soft border border-brand-dark/20 text-[10px] font-semibold">Ctrl</kbd> + <kbd className="px-1.5 py-0.5 rounded bg-brand-soft border border-brand-dark/20 text-[10px] font-semibold">Enter</kbd> to save
        </span>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto sm:ml-auto">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 sm:flex-none rounded-xl border border-brand-dark/20 bg-transparent px-4 py-2.5 text-xs sm:text-sm font-semibold text-brand-dark hover:bg-brand-soft/40 transition active:scale-98"
            >
              Cancel
            </button>
          )}

          {!isModal && (
            <button
              type="button"
              disabled={saving || savingAnother}
              onClick={(e) => handleSubmit(e, true)}
              className="flex-1 sm:flex-none rounded-xl border border-brand-primary/40 bg-brand-soft/60 px-4 py-2.5 text-xs sm:text-sm font-bold text-brand-dark hover:bg-brand-soft transition active:scale-98 disabled:opacity-50"
            >
              {savingAnother ? 'Saving…' : '⚡ Save & Add Another'}
            </button>
          )}

          <button
            type="submit"
            disabled={saving || savingAnother}
            className="flex-1 sm:flex-none rounded-xl bg-brand-dark px-5 py-2.5 text-xs sm:text-sm font-bold text-brand-light hover:bg-brand-dark/90 shadow-sm transition active:scale-98 disabled:opacity-50"
          >
            {saving ? 'Saving…' : isModal ? 'Update Question' : 'Save Question'}
          </button>
        </div>
      </div>
    </form>
  );
}
