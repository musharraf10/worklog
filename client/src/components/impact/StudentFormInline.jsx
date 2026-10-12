import { useState, useEffect } from 'react';
import Input from '../common/Input';
import Button from '../common/Button';
import impactService from '../../services/impactService';
import GoogleDriveEvidenceSection from './GoogleDriveEvidenceSection';

export const StudentFormInline = ({
  onSubmit,
  isLoading = false,
  onCancel,
}) => {
  const [formMode, setFormMode] = useState('detailed');
  const [isExpanded, setIsExpanded] = useState(true);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    studentName: '',
    studentBatch: '',
    date: new Date().toISOString().split('T')[0],
    initialChallenge: '',
    howIHelped: '',
    achievement: '',
    isPrivate: true, // Default to private per requirements
    evidenceLinks: [],
    tags: '',
  });

  useEffect(() => {
    const draft = impactService.getStudentDraft();
    if (draft) {
      setFormData(draft);
    }
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const val = type === 'checkbox' ? checked : value;
    const updated = { ...formData, [name]: val };
    setFormData(updated);
    impactService.saveStudentDraft(updated);
    if (error) setError('');
  };

  const handleEvidenceLinksChange = (newLinks) => {
    const updated = { ...formData, evidenceLinks: newLinks };
    setFormData(updated);
    impactService.saveStudentDraft(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.studentName.trim()) {
      setError('Student Name is required');
      return;
    }
    if (!formData.date) {
      setError('Date is required');
      return;
    }
    if (!formData.initialChallenge.trim()) {
      setError('Initial Challenge is required');
      return;
    }
    if (!formData.howIHelped.trim()) {
      setError('How I Helped is required');
      return;
    }
    if (!formData.achievement.trim()) {
      setError('Achievement is required');
      return;
    }

    try {
      const payload = {
        ...formData,
        tags: formData.tags
          ? formData.tags
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean)
          : [],
      };

      await onSubmit(payload);
      impactService.clearStudentDraft();
      setFormData({
        studentName: '',
        studentBatch: '',
        date: new Date().toISOString().split('T')[0],
        initialChallenge: '',
        howIHelped: '',
        achievement: '',
        isPrivate: true,
        evidenceLinks: [],
        tags: '',
      });
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to save student record');
    }
  };

  return (
    <div className="w-full min-w-0 bg-brand-light border border-brand-primary/30 rounded-2xl p-4 shadow-xs sm:p-5 text-left">
      {/* Header with expand / collapse */}
      <div className="mb-4 flex min-w-0 flex-col items-stretch gap-3 border-b border-brand-primary/20 pb-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3 sm:flex-1">
          <div className="w-9 h-9 rounded-lg bg-brand-soft border border-brand-primary/30 flex items-center justify-center text-brand-dark shadow-xs shrink-0">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </div>
          <div className="min-w-0">
            <h3 className="text-base font-bold leading-tight text-brand-dark sm:text-lg">Record Student Mentorship Story</h3>
            <p className="mt-1 text-xs leading-snug text-brand-dark/70 font-medium sm:text-sm">
              Document student challenges, mentorship interventions, and verifiable outcomes
            </p>
          </div>
        </div>

        <div className="flex w-full min-w-0 flex-wrap items-center gap-2 sm:w-auto sm:shrink-0">
          {/* Quick / Detailed Mode Segmented Control */}
          <div className="inline-flex min-w-0 flex-1 rounded-xl bg-brand-soft/70 p-1 border border-brand-primary/20 text-xs font-semibold sm:flex-none">
            <button
              type="button"
              onClick={() => setFormMode('quick')}
              className={`flex-1 px-2 py-1.5 rounded-lg transition-all sm:flex-none sm:px-3 sm:py-1 ${formMode === 'quick'
                  ? 'bg-brand-primary text-brand-light shadow-2xs font-bold'
                  : 'text-brand-dark/80 hover:text-brand-dark'
                }`}
            >
              Quick Entry
            </button>
            <button
              type="button"
              onClick={() => setFormMode('detailed')}
              className={`flex-1 px-2 py-1.5 rounded-lg transition-all sm:flex-none sm:px-3 sm:py-1 ${formMode === 'detailed'
                  ? 'bg-brand-primary text-brand-light shadow-2xs font-bold'
                  : 'text-brand-dark/80 hover:text-brand-dark'
                }`}
            >
              Detailed Entry
            </button>
          </div>

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="shrink-0 text-sm font-semibold text-brand-dark/80 hover:text-brand-dark px-3 py-1.5 rounded-lg bg-brand-soft/40 hover:bg-brand-soft/70 transition-colors flex items-center gap-1.5"
            title={isExpanded ? 'Collapse form' : 'Expand form'}
          >
            <span>{isExpanded ? 'Collapse' : 'Expand'}</span>
            <svg
              className={`w-4 h-4 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      </div>

      {isExpanded && (
        <form onSubmit={handleSubmit} className="min-w-0 space-y-4">
          {error && (
            <div className="p-3 bg-brand-soft border border-brand-dark/30 rounded-xl text-xs font-semibold text-brand-dark flex items-center justify-between">
              <span>{error}</span>
              <button
                type="button"
                onClick={() => setError('')}
                className="text-brand-dark font-bold ml-2 hover:opacity-75"
              >
                ✕
              </button>
            </div>
          )}

          <section className="space-y-3" aria-labelledby="student-basic-heading">
            <h4 id="student-basic-heading" className="text-sm font-bold text-brand-dark">Basic Information</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 items-start">
              <div className="min-w-0 w-full">
                <Input
                  label="Student Name"
                  name="studentName"
                  value={formData.studentName}
                  onChange={handleChange}
                  placeholder="e.g. Shaik Musharaf"
                  required
                  className="h-11 px-3 py-2 text-sm"
                />
              </div>

              <div className="min-w-0 w-full">
                <Input
                  label="Batch / Cohort"
                  name="studentBatch"
                  value={formData.studentBatch}
                  onChange={handleChange}
                  placeholder="e.g. 2026 Batch - Section B"
                  className="h-11 px-3 py-2 text-sm"
                />
              </div>

              <div className="min-w-0 w-full">
                <Input
                  label="Date of Impact"
                  type="date"
                  name="date"
                  value={formData.date}
                  onChange={handleChange}
                  required
                  className="h-11 px-3 py-2 text-sm"
                />
              </div>

              {/* Privacy Toggle (Private by default) - Styled to match adjacent inputs */}
              <div className="w-full flex flex-col gap-1.5 text-left min-w-0">
                <span className="text-sm font-semibold text-brand-dark tracking-wide">
                  Privacy Setting
                </span>
                <label
                  htmlFor="isPrivateCheckbox"
                  className="h-[46px] px-3.5 flex items-center justify-between rounded-lg border border-brand-dark/20 hover:border-brand-dark/40 bg-brand-light transition-colors cursor-pointer select-none"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <input
                      type="checkbox"
                      id="isPrivateCheckbox"
                      name="isPrivate"
                      checked={formData.isPrivate}
                      onChange={handleChange}
                      className="w-4 h-4 rounded text-brand-primary border-brand-dark/30 focus:ring-brand-primary shrink-0 accent-brand-primary"
                    />
                    <span className="text-sm font-semibold text-brand-dark truncate">
                      Keep Private
                    </span>
                  </div>
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${formData.isPrivate
                      ? 'bg-brand-soft text-brand-dark border border-brand-primary/20'
                      : 'text-brand-dark/60'
                    }`}>
                    {formData.isPrivate ? 'Protected' : 'Public'}
                  </span>
                </label>
              </div>
            </div>
          </section>

          <section className="space-y-3" aria-labelledby="student-contributions-heading">
            <h4 id="student-contributions-heading" className="text-sm font-bold text-brand-dark">Responsibilities & Contributions</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-start">
              <div className="w-full flex flex-col gap-1.5 text-left min-w-0">
                <label className="text-sm font-semibold text-brand-dark tracking-wide">
                  Initial Challenge / Struggle Faced by Student <span className="ml-1 text-brand-dark/70">*</span>
                </label>
                <textarea
                  name="initialChallenge"
                  rows={formMode === 'quick' ? 3 : 4}
                  value={formData.initialChallenge}
                  onChange={handleChange}
                  placeholder="e.g. Struggling with dynamic programming in mock interviews; repeated rejection in round 1; blocked on building capstone backend"
                  className="w-full min-w-0 px-3 py-2 text-sm bg-brand-light text-brand-dark placeholder-brand-dark/40 rounded-lg border border-brand-dark/20 hover:border-brand-dark/40 focus:border-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-primary/60 transition-all duration-150 leading-relaxed min-h-[78px] resize-y"
                  required
                />
              </div>

              <div className="w-full flex flex-col gap-1.5 text-left min-w-0">
                <label className="text-sm font-semibold text-brand-dark tracking-wide">
                  How I Helped / Mentorship Intervention <span className="ml-1 text-brand-dark/70">*</span>
                </label>
                <textarea
                  name="howIHelped"
                  rows={formMode === 'quick' ? 3 : 4}
                  value={formData.howIHelped}
                  onChange={handleChange}
                  placeholder="e.g. Conducted 3 one-on-one debugging sessions; restructured project architecture into MVC; ran 2 targeted mock interviews"
                  className="w-full min-w-0 px-3 py-2 text-sm bg-brand-light text-brand-dark placeholder-brand-dark/40 rounded-lg border border-brand-dark/20 hover:border-brand-dark/40 focus:border-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-primary/60 transition-all duration-150 leading-relaxed min-h-[78px] resize-y"
                  required
                />
              </div>
            </div>
          </section>

          <section className="space-y-3" aria-labelledby="student-outcomes-heading">
            <h4 id="student-outcomes-heading" className="text-sm font-bold text-brand-dark">Outcomes</h4>
            <div className={formMode === 'detailed' ? 'grid grid-cols-1 md:grid-cols-2 gap-3 items-start' : 'w-full'}>
              <div className="w-full flex flex-col gap-1.5 text-left min-w-0">
                <label className="text-sm font-semibold text-brand-dark tracking-wide">
                  Documented Achievement / Outcome <span className="ml-1 text-brand-dark/70">*</span>
                </label>
                <textarea
                  name="achievement"
                  rows={formMode === 'quick' ? 3 : 3}
                  value={formData.achievement}
                  onChange={handleChange}
                  placeholder="e.g. Placed as SDE intern at Acme Corp; Finished full capstone deployment; Won 2nd place in hackathon"
                  className="w-full min-w-0 px-3 py-2 text-sm bg-brand-light text-brand-dark placeholder-brand-dark/40 rounded-lg border border-brand-dark/20 hover:border-brand-dark/40 focus:border-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-primary/60 transition-all duration-150 leading-relaxed min-h-[78px] resize-y"
                  required
                />
              </div>
              {formMode === 'detailed' && (
                <div className="w-full flex flex-col gap-1.5 text-left min-w-0">
                  <Input
                    label="Tags (comma-separated, Optional)"
                    name="tags"
                    value={formData.tags}
                    onChange={handleChange}
                    placeholder="e.g. dsa, mock-interviews, placement"
                    helperText="Add keywords to categorize and filter this student story"
                  />
                </div>
              )}
            </div>
          </section>

          {/* Google Drive Evidence Section (Multiple Drive links with optional descriptions) */}
          <section className="pt-3 border-t border-brand-primary/20">
            <GoogleDriveEvidenceSection
              links={formData.evidenceLinks}
              onChange={handleEvidenceLinksChange}
              showNotice={true}
            />
          </section>

          {/* Action Buttons */}
          <div className="pt-3 border-t border-brand-primary/20 flex flex-wrap items-center justify-end gap-3">
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                size="md"
                onClick={onCancel}
              >
                Cancel
              </Button>
            )}
            <Button
              type="submit"
              variant="primary"
              size="md"
              isLoading={isLoading}
            >
              Save Student Record
            </Button>
          </div>
        </form>
      )}
    </div>
  );
};

export default StudentFormInline;
