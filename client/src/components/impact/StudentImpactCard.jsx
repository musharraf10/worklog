import { useState } from 'react';
import Input from '../common/Input';
import Button from '../common/Button';
import { formatDate } from '../../utils/dateUtils';
import GoogleDriveEvidenceSection from './GoogleDriveEvidenceSection';

export const StudentImpactCard = ({
  student,
  onSave,
  onDelete,
  onRetrySync,
  isSelected = false,
  onToggleSelect,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isDeletingConfirm, setIsDeletingConfirm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const [editData, setEditData] = useState({
    studentName: student.studentName || '',
    studentBatch: student.studentBatch || '',
    date: student.date ? student.date.split('T')[0] : '',
    initialChallenge: student.initialChallenge || '',
    howIHelped: student.howIHelped || '',
    achievement: student.achievement || '',
    isPrivate: student.isPrivate !== undefined ? student.isPrivate : true,
    evidenceLinks: student.evidenceLinks || [],
  });

  const handleFieldChange = (e) => {
    const { name, value, type, checked } = e.target;
    const val = type === 'checkbox' ? checked : value;
    setEditData((prev) => ({ ...prev, [name]: val }));
    setError('');
  };

  const handleSave = async () => {
    if (!editData.studentName.trim()) {
      setError('Student Name is required');
      return;
    }
    if (!editData.date) {
      setError('Date is required');
      return;
    }
    if (!editData.initialChallenge.trim()) {
      setError('Initial Challenge is required');
      return;
    }
    if (!editData.howIHelped.trim()) {
      setError('How I Helped is required');
      return;
    }
    if (!editData.achievement.trim()) {
      setError('Achievement is required');
      return;
    }

    setIsSaving(true);
    try {
      await onSave(student._id, editData);
      setIsEditing(false);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to update record');
    } finally {
      setIsSaving(false);
    }
  };

  const evidenceLinks = student.evidenceLinks || [];
  const attachments = student.attachments || [];

  return (
    <div
      className={`bg-brand-light border rounded-2xl p-4 sm:p-5 shadow-xs text-left mb-4 transition-all ${
        isSelected
          ? 'border-brand-primary ring-1 ring-brand-primary bg-brand-soft/20'
          : 'border-brand-primary/25 hover:border-brand-primary/45'
      }`}
    >
      {/* Inline Editing Mode */}
      {isEditing ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-brand-primary/20">
            <h3 className="text-base font-bold text-brand-dark">Edit Student Impact Record</h3>
            <span className="text-xs text-brand-dark/60 font-semibold">Editing inline</span>
          </div>

          {error && (
            <div className="p-3 bg-brand-soft border border-brand-dark/30 rounded-xl text-xs font-semibold text-brand-dark">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 items-start">
            <div className="min-w-0 w-full">
              <Input
                label="Student Name"
                name="studentName"
                value={editData.studentName}
                onChange={handleFieldChange}
                required
              />
            </div>
            <div className="min-w-0 w-full">
              <Input
                label="Batch / Cohort"
                name="studentBatch"
                value={editData.studentBatch}
                onChange={handleFieldChange}
              />
            </div>
            <div className="min-w-0 w-full">
              <Input
                label="Date"
                type="date"
                name="date"
                value={editData.date}
                onChange={handleFieldChange}
                required
              />
            </div>
            {/* Privacy Toggle (Structured to match adjacent input height) */}
            <div className="w-full flex flex-col gap-1.5 text-left min-w-0">
              <span className="text-sm font-semibold text-brand-dark tracking-wide">
                Privacy Setting
              </span>
              <label
                htmlFor={`editIsPrivate_${student._id}`}
                className="h-[46px] px-3.5 flex items-center justify-between rounded-lg border border-brand-dark/20 hover:border-brand-dark/40 bg-brand-light transition-colors cursor-pointer select-none"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <input
                    type="checkbox"
                    id={`editIsPrivate_${student._id}`}
                    name="isPrivate"
                    checked={editData.isPrivate}
                    onChange={handleFieldChange}
                    className="w-4 h-4 rounded text-brand-primary border-brand-dark/30 focus:ring-brand-primary shrink-0 accent-brand-primary"
                  />
                  <span className="text-sm font-semibold text-brand-dark truncate">
                    Keep Private
                  </span>
                </div>
                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${
                  editData.isPrivate
                    ? 'bg-brand-soft text-brand-dark border border-brand-primary/20'
                    : 'text-brand-dark/60'
                }`}>
                  {editData.isPrivate ? 'Protected' : 'Public'}
                </span>
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 items-start">
            <div className="w-full flex flex-col gap-1.5 text-left min-w-0">
              <label className="text-sm font-semibold text-brand-dark tracking-wide">
                Initial Challenge
              </label>
              <textarea
                name="initialChallenge"
                rows={3}
                value={editData.initialChallenge}
                onChange={handleFieldChange}
                placeholder="Initial student struggle..."
                className="w-full px-4 py-2.5 text-base bg-brand-light text-brand-dark placeholder-brand-dark/40 rounded-lg border border-brand-dark/20 hover:border-brand-dark/40 focus:border-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-primary/60 transition-all duration-150 leading-relaxed min-h-[80px] resize-y"
                required
              />
            </div>
            <div className="w-full flex flex-col gap-1.5 text-left min-w-0">
              <label className="text-sm font-semibold text-brand-dark tracking-wide">
                How I Helped
              </label>
              <textarea
                name="howIHelped"
                rows={3}
                value={editData.howIHelped}
                onChange={handleFieldChange}
                placeholder="Mentorship actions taken..."
                className="w-full px-4 py-2.5 text-base bg-brand-light text-brand-dark placeholder-brand-dark/40 rounded-lg border border-brand-dark/20 hover:border-brand-dark/40 focus:border-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-primary/60 transition-all duration-150 leading-relaxed min-h-[80px] resize-y"
                required
              />
            </div>
          </div>

          <div className="w-full flex flex-col gap-1.5 text-left min-w-0">
            <label className="text-sm font-semibold text-brand-dark tracking-wide">
              Documented Achievement / Outcome
            </label>
            <textarea
              name="achievement"
              rows={3}
              value={editData.achievement}
              onChange={handleFieldChange}
              placeholder="Verifiable student outcome..."
              className="w-full px-4 py-2.5 text-base bg-brand-light text-brand-dark placeholder-brand-dark/40 rounded-lg border border-brand-dark/20 hover:border-brand-dark/40 focus:border-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-primary/60 transition-all duration-150 leading-relaxed min-h-[80px] resize-y"
              required
            />
          </div>

          {/* Google Drive Evidence Section in Edit Mode */}
          <div className="pt-2 border-t border-brand-primary/20">
            <GoogleDriveEvidenceSection
              links={editData.evidenceLinks}
              onChange={(newLinks) =>
                setEditData((prev) => ({ ...prev, evidenceLinks: newLinks }))
              }
              showNotice={false}
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-brand-primary/20">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setIsEditing(false);
                setEditData({
                  studentName: student.studentName || '',
                  studentBatch: student.studentBatch || '',
                  date: student.date ? student.date.split('T')[0] : '',
                  initialChallenge: student.initialChallenge || '',
                  howIHelped: student.howIHelped || '',
                  achievement: student.achievement || '',
                  isPrivate: student.isPrivate !== undefined ? student.isPrivate : true,
                  evidenceLinks: student.evidenceLinks || [],
                });
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleSave}
              isLoading={isSaving}
            >
              Save Changes
            </Button>
          </div>
        </div>
      ) : (
        /* Regular View Mode */
        <div className="space-y-3">
          {/* Card Top Line */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-brand-primary/15 pb-2.5">
            <div className="flex items-center gap-2.5">
              {onToggleSelect && (
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => onToggleSelect(student._id)}
                  className="w-4 h-4 rounded text-brand-primary border-brand-primary/40 focus:ring-brand-primary cursor-pointer"
                  title="Select for appraisal report"
                />
              )}
              <span className="text-xs font-semibold text-brand-dark/70">
                {formatDate(student.date)}
              </span>
              {student.studentBatch && (
                <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-brand-soft text-brand-dark border border-brand-primary/15">
                  {student.studentBatch}
                </span>
              )}
              {student.isPrivate && (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-brand-soft text-brand-dark border border-brand-primary/25">
                  Private
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {/* Sheets Sync Status Badge */}
              <button
                type="button"
                onClick={() => onRetrySync && onRetrySync(student._id)}
                title={
                  student.googleSheetSyncStatus === 'synced'
                    ? 'Synced to Google Sheets. Click to re-sync.'
                    : student.googleSheetSyncStatus === 'failed'
                    ? `Sync failed: ${student.googleSheetSyncError || 'Click to retry'}`
                    : 'Sync pending. Click to sync now.'
                }
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold transition-all border ${
                  student.googleSheetSyncStatus === 'synced'
                    ? 'bg-brand-soft text-brand-dark border-brand-primary/30'
                    : student.googleSheetSyncStatus === 'failed'
                    ? 'bg-red-100 text-red-700 border-red-300'
                    : 'bg-amber-100 text-amber-800 border-amber-300'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    student.googleSheetSyncStatus === 'synced'
                      ? 'bg-brand-primary'
                      : student.googleSheetSyncStatus === 'failed'
                      ? 'bg-red-600'
                      : 'bg-amber-500'
                  }`}
                />
                <span className="capitalize">{student.googleSheetSyncStatus || 'pending'}</span>
              </button>

              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="px-2.5 py-1 text-xs font-bold text-brand-dark rounded-lg hover:bg-brand-soft transition-colors"
              >
                Edit
              </button>

              <button
                type="button"
                onClick={() => setIsDeletingConfirm(true)}
                className="px-2.5 py-1 text-xs font-bold text-red-700 rounded-lg hover:bg-red-100/60 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>

          {/* Inline Deletion Confirmation */}
          {isDeletingConfirm && (
            <div className="p-3 rounded-xl bg-brand-soft border border-brand-dark/25 flex items-center justify-between gap-3 text-xs">
              <span className="font-semibold text-brand-dark">
                Delete this student record and remove from Google Sheets?
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsDeletingConfirm(false)}
                  className="px-3 py-1 rounded-lg border border-brand-dark/20 text-brand-dark font-medium hover:bg-brand-light"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsDeletingConfirm(false);
                    onDelete(student._id);
                  }}
                  className="px-3 py-1 rounded-lg bg-brand-dark text-brand-light font-bold hover:bg-brand-dark/90"
                >
                  Delete
                </button>
              </div>
            </div>
          )}

          {/* Student Name */}
          <div>
            <h4 className="text-base sm:text-lg font-bold text-brand-dark leading-snug">
              {student.studentName}
            </h4>
          </div>

          {/* Narrative Breakdown Boxes */}
          <div className="space-y-2 pt-1 text-sm text-brand-dark/85">
            <div className="bg-brand-soft/25 p-3 rounded-xl border border-brand-primary/15">
              <span className="text-xs block uppercase font-bold text-brand-dark/60 mb-0.5">
                Initial Challenge
              </span>
              <p className="leading-relaxed">{student.initialChallenge}</p>
            </div>

            <div className="bg-brand-soft/25 p-3 rounded-xl border border-brand-primary/15">
              <span className="text-xs block uppercase font-bold text-brand-dark/60 mb-0.5">
                How I Helped (Intervention)
              </span>
              <p className="leading-relaxed">{student.howIHelped}</p>
            </div>

            <div className="bg-brand-soft/40 p-3 rounded-xl border border-brand-primary/30">
              <span className="text-xs block uppercase font-bold text-brand-dark/70 mb-0.5">
                Tangible Achievement & Outcome
              </span>
              <p className="font-bold text-brand-dark leading-relaxed">
                {student.achievement}
              </p>
            </div>
          </div>

          {/* Google Drive Evidence Section (Multiple Drive links with Open in Drive buttons) */}
          {evidenceLinks.length > 0 && (
            <div className="pt-2.5 border-t border-brand-primary/15 space-y-2">
              <span className="font-bold text-brand-dark/65 uppercase text-[11px] block">
                Google Drive Evidence ({evidenceLinks.length}):
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {evidenceLinks.map((link, idx) => (
                  <div
                    key={link._id || idx}
                    className="p-2.5 rounded-xl bg-brand-soft/30 border border-brand-primary/20 flex items-center justify-between gap-2 text-xs"
                  >
                    <div className="min-w-0 flex-1">
                      <span className="font-bold text-brand-dark truncate block">
                        {link.description || link.title || 'Drive Proof'}
                      </span>
                      <span className="text-[10px] text-brand-dark/60 font-mono truncate block">
                        {link.url}
                      </span>
                    </div>

                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-brand-primary text-brand-light hover:bg-brand-primary/90 transition-all shrink-0 shadow-2xs"
                    >
                      <span>Open Drive</span>
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Legacy Attachments if any exist */}
          {attachments.length > 0 && (
            <div className="pt-2 border-t border-brand-primary/15 flex items-center gap-2 flex-wrap text-xs">
              <span className="font-bold text-brand-dark/60 uppercase text-[11px]">
                Supporting Proof Files:
              </span>
              {attachments.map((att) => (
                <a
                  key={att.fileId}
                  href={`${att.url || `/api/impact/files/${att.fileId}`}?download=true`}
                  download={att.originalName}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-semibold bg-brand-soft/60 border border-brand-primary/20 text-brand-dark hover:bg-brand-soft"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  <span className="truncate max-w-[150px]">{att.originalName}</span>
                </a>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default StudentImpactCard;
