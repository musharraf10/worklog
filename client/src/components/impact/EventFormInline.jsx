import { useState, useEffect } from 'react';
import Input from '../common/Input';
import Select from '../common/Select';
import Button from '../common/Button';
import impactService from '../../services/impactService';
import GoogleDriveEvidenceSection from './GoogleDriveEvidenceSection';

const EVENT_TYPES = [
  'Workshop',
  'Hackathon',
  'Seminar',
  'Bootcamp',
  'Webinar',
  'Mentorship Program',
  'Competition',
  'Training Session',
  'Other',
];

export const EventFormInline = ({
  onSubmit,
  isLoading = false,
  onCancel,
}) => {
  const [formMode, setFormMode] = useState('detailed'); // 'quick' | 'detailed'
  const [isExpanded, setIsExpanded] = useState(true);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    title: '',
    eventType: 'Workshop',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    myRole: '',
    responsibilities: '',
    contributions: '',
    participantsCount: 0,
    participantDetails: '',
    outcomes: '',
    achievements: '',
    evidenceLinks: [],
    tags: '',
    isPrivate: false,
  });

  useEffect(() => {
    const draft = impactService.getEventDraft();
    if (draft) {
      setFormData(draft);
    }
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const val = type === 'checkbox' ? checked : value;
    const updated = { ...formData, [name]: val };
    setFormData(updated);
    impactService.saveEventDraft(updated);
    if (error) setError('');
  };

  const handleEvidenceLinksChange = (newLinks) => {
    const updated = { ...formData, evidenceLinks: newLinks };
    setFormData(updated);
    impactService.saveEventDraft(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      setError('Event / Initiative Title is required');
      return;
    }
    if (!formData.startDate) {
      setError('Start Date is required');
      return;
    }
    if (!formData.myRole.trim()) {
      setError('My Role is required');
      return;
    }

    const payload = {
      ...formData,
      participantsCount: Number(formData.participantsCount) || 0,
      tags: formData.tags
        ? formData.tags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean)
        : [],
    };

    const success = await onSubmit(payload);
    if (success) {
      impactService.clearEventDraft();
      setFormData({
        title: '',
        eventType: 'Workshop',
        startDate: new Date().toISOString().split('T')[0],
        endDate: '',
        myRole: '',
        responsibilities: '',
        contributions: '',
        participantsCount: 0,
        participantDetails: '',
        outcomes: '',
        achievements: '',
        evidenceLinks: [],
        tags: '',
        isPrivate: false,
      });
      setError('');
    }
  };

  return (
    <div className="w-full min-w-0 bg-brand-light border border-brand-primary/30 rounded-2xl p-4 shadow-xs sm:p-5 text-left">
      {/* Header bar matching Work Log inline expansion */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 mb-4 border-b border-brand-primary/20">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="w-9 h-9 rounded-lg bg-brand-soft border border-brand-primary/30 flex items-center justify-center text-brand-dark shadow-xs shrink-0">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
          </div>
          <div className="min-w-0">
            <h3 className="text-lg font-bold text-brand-dark">
              Record New Event & Initiative
            </h3>
            <p className="text-xs sm:text-sm text-brand-dark/70 font-medium">
              Document leadership, workshops, hackathons, and community contributions
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Quick / Detailed Mode Segmented Control */}
          <div className="inline-flex rounded-xl bg-brand-soft/70 p-1 border border-brand-primary/20 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setFormMode('quick')}
              className={`px-3 py-1 rounded-lg transition-all ${
                formMode === 'quick'
                  ? 'bg-brand-primary text-brand-light shadow-2xs font-bold'
                  : 'text-brand-dark/80 hover:text-brand-dark'
              }`}
            >
              Quick Entry
            </button>
            <button
              type="button"
              onClick={() => setFormMode('detailed')}
              className={`px-3 py-1 rounded-lg transition-all ${
                formMode === 'detailed'
                  ? 'bg-brand-primary text-brand-light shadow-2xs font-bold'
                  : 'text-brand-dark/80 hover:text-brand-dark'
              }`}
            >
              Detailed Entry
            </button>
          </div>

          {/* Toggle Expand / Collapse */}
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

          <section className="space-y-3" aria-labelledby="event-basic-heading">
          <h4 id="event-basic-heading" className="text-sm font-bold text-brand-dark">Basic Information</h4>
          <div className="grid grid-cols-1 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-3 items-start">
            <div className="min-w-0 w-full">
              <Input
                label="Event / Initiative Title"
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder="e.g. Full-Stack Web Development Bootcamp 2026"
                required
                className="h-11 px-3 py-2 text-sm"
              />
            </div>
            <div className="min-w-0 w-full">
              <Select
                label="Event Category"
                name="eventType"
                value={formData.eventType}
                onChange={handleChange}
                options={EVENT_TYPES.map((t) => ({ value: t, label: t }))}
                className="h-11 px-3 py-2 text-sm"
              />
            </div>
          </div>

          {/* Row 2: Dates, Role, Participants */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 items-start">
            <div className="min-w-0 w-full">
              <Input
                label="Start Date"
                type="date"
                name="startDate"
                value={formData.startDate}
                onChange={handleChange}
                required
                className="h-11 px-3 py-2 text-sm"
              />
            </div>
            <div className="min-w-0 w-full">
              <Input
                label="End Date"
                type="date"
                name="endDate"
                value={formData.endDate}
                onChange={handleChange}
                className="h-11 px-3 py-2 text-sm"
              />
            </div>
            <div className="min-w-0 w-full">
              <Input
                label="My Role / Designation"
                name="myRole"
                value={formData.myRole}
                onChange={handleChange}
                placeholder="e.g. Lead Instructor, Judge"
                required
                className="h-11 px-3 py-2 text-sm"
              />
            </div>
            <div className="min-w-0 w-full">
              <Input
                label="Attendees / Participants"
                type="number"
                name="participantsCount"
                min="0"
                value={formData.participantsCount}
                onChange={handleChange}
                placeholder="0"
                className="h-11 px-3 py-2 text-sm"
              />
            </div>
          </div>
          </section>

          {/* Detailed Mode Additional Fields */}
          {formMode === 'detailed' && (
            <>
              <section className="space-y-3" aria-labelledby="event-contributions-heading">
              <h4 id="event-contributions-heading" className="text-sm font-bold text-brand-dark">Responsibilities & Contributions</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-start">
                <div className="w-full flex flex-col gap-1.5 text-left min-w-0">
                  <label className="text-sm font-semibold text-brand-dark tracking-wide">
                    My Responsibilities
                  </label>
                  <textarea
                    name="responsibilities"
                    rows={3}
                    value={formData.responsibilities}
                    onChange={handleChange}
                    placeholder="Specific areas of ownership, syllabus preparation, coordination..."
                    className="w-full px-4 py-2.5 text-base bg-brand-light text-brand-dark placeholder-brand-dark/40 rounded-lg border border-brand-dark/20 hover:border-brand-dark/40 focus:border-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-primary/60 transition-all duration-150 leading-relaxed min-h-[85px] resize-y"
                  />
                </div>
                <div className="w-full flex flex-col gap-1.5 text-left min-w-0">
                  <label className="text-sm font-semibold text-brand-dark tracking-wide">
                    Key Contributions & Innovations
                  </label>
                  <textarea
                    name="contributions"
                    rows={3}
                    value={formData.contributions}
                    onChange={handleChange}
                    placeholder="Curriculum built, live problem sets deployed, mentoring sessions conducted..."
                    className="w-full px-4 py-2.5 text-base bg-brand-light text-brand-dark placeholder-brand-dark/40 rounded-lg border border-brand-dark/20 hover:border-brand-dark/40 focus:border-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-primary/60 transition-all duration-150 leading-relaxed min-h-[85px] resize-y"
                  />
                </div>
              </div>

              </section>

              <section className="space-y-3" aria-labelledby="event-outcomes-heading">
              <h4 id="event-outcomes-heading" className="text-sm font-bold text-brand-dark">Outcomes</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-start">
                <div className="w-full flex flex-col gap-1.5 text-left min-w-0">
                  <label className="text-sm font-semibold text-brand-dark tracking-wide">
                    Outcomes & Metrics
                  </label>
                  <textarea
                    name="outcomes"
                    rows={3}
                    value={formData.outcomes}
                    onChange={handleChange}
                    placeholder="95% completion rate, 12 final project repositories launched..."
                    className="w-full px-4 py-2.5 text-base bg-brand-light text-brand-dark placeholder-brand-dark/40 rounded-lg border border-brand-dark/20 hover:border-brand-dark/40 focus:border-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-primary/60 transition-all duration-150 leading-relaxed min-h-[85px] resize-y"
                  />
                </div>
                <div className="w-full flex flex-col gap-1.5 text-left min-w-0">
                  <label className="text-sm font-semibold text-brand-dark tracking-wide">
                    Recognitions & Achievements
                  </label>
                  <textarea
                    name="achievements"
                    rows={3}
                    value={formData.achievements}
                    onChange={handleChange}
                    placeholder="Commendation letter from department head, best workshop rating..."
                    className="w-full px-4 py-2.5 text-base bg-brand-light text-brand-dark placeholder-brand-dark/40 rounded-lg border border-brand-dark/20 hover:border-brand-dark/40 focus:border-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-primary/60 transition-all duration-150 leading-relaxed min-h-[85px] resize-y"
                  />
                </div>
              </div>

              {/* Participant Details & Tags */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-start">
                <div className="min-w-0 w-full">
                  <Input
                    label="Participant Demographics (Optional)"
                    name="participantDetails"
                    value={formData.participantDetails}
                    onChange={handleChange}
                    placeholder="e.g. 2nd-year CSE students, junior developers"
                  />
                </div>
                <div className="min-w-0 w-full">
                  <Input
                    label="Tags (comma-separated)"
                    name="tags"
                    placeholder="bootcamp, react, mentoring"
                    value={formData.tags}
                    onChange={handleChange}
                  />
                </div>
              </div>
              </section>
            </>
          )}

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
              Save Event Record
            </Button>
          </div>
        </form>
      )}
    </div>
  );
};

export default EventFormInline;
