import { useState } from 'react';
import Button from '../common/Button';
import Input from '../common/Input';
import Select from '../common/Select';
import {
  CATEGORIES,
  ACTIVITY_TYPES,
  STATUS_OPTIONS,
  PRIORITY_OPTIONS,
} from '../../constants/workLogConstants';
import { formatDate, formatDateForInput } from '../../utils/dateUtils';
import {
  formatMinutes,
  calculateSpentMinutes,
  formatDisplayTime,
} from '../../utils/timeUtils';

export const WorkLogCard = ({
  log,
  onSave,
  onDelete,
  isEditing = false,
  onStartEdit,
  onCancelEdit,
}) => {
  const isKnownCategory =
    CATEGORIES.includes(log.category) && log.category !== 'Other';
  const isKnownActivity =
    ACTIVITY_TYPES.includes(log.activityType) && log.activityType !== 'Other';

  const [editData, setEditData] = useState({
    date: formatDateForInput(log.date),
    task: log.task || '',
    category: isKnownCategory ? log.category : 'Other',
    customCategory: isKnownCategory
      ? ''
      : log.category === 'Other'
        ? ''
        : log.category || '',
    activityType: isKnownActivity ? log.activityType : 'Other',
    customActivityType: isKnownActivity
      ? ''
      : log.activityType === 'Other'
        ? ''
        : log.activityType || '',
    timeFrom: log.timeFrom || '09:00',
    timeTo: log.timeTo || '10:00',
    hallSection: log.hallSection || '',
    status: log.status || 'Completed',
    priority: log.priority || 'Normal',
    remarks: log.remarks || '',
  });

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const liveSpentMinutes = calculateSpentMinutes(
    editData.timeFrom,
    editData.timeTo,
  );

  const handleFieldChange = (e) => {
    const { name, value } = e.target;
    setEditData((prev) => ({ ...prev, [name]: value }));
    setError('');
  };

  const handleSave = async () => {
    if (!editData.task || editData.task.trim().length < 2) {
      setError('Task must be at least 2 characters');
      return;
    }

    if (
      editData.category === 'Other' &&
      (!editData.customCategory || !editData.customCategory.trim())
    ) {
      setError('Custom category is required');
      return;
    }

    if (
      editData.activityType === 'Other' &&
      (!editData.customActivityType || !editData.customActivityType.trim())
    ) {
      setError('Custom activity type is required');
      return;
    }

    if (liveSpentMinutes <= 0) {
      setError('Time To must be after Time From');
      return;
    }

    const finalCategory =
      editData.category === 'Other'
        ? editData.customCategory.trim()
        : editData.category;

    const finalActivityType =
      editData.activityType === 'Other'
        ? editData.customActivityType.trim()
        : editData.activityType;

    const payload = {
      ...editData,
      category: finalCategory,
      activityType: finalActivityType,
    };
    delete payload.customCategory;
    delete payload.customActivityType;

    setIsSaving(true);
    try {
      await onSave(log._id, payload);
      onCancelEdit();
    } catch (err) {
      setError(err.message || 'Failed to save changes');
    } finally {
      setIsSaving(false);
    }
  };

  const getPriorityBadge = (priority) => {
    switch (priority) {
      case 'Urgent':
        return 'bg-brand-dark text-brand-light font-bold';
      case 'Important':
        return 'bg-brand-primary text-brand-dark font-semibold';
      default:
        return 'bg-brand-soft text-brand-dark';
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Completed':
        return 'bg-brand-soft/80 text-brand-dark border border-brand-primary/50';
      case 'In Progress':
        return 'bg-brand-primary/40 text-brand-dark border border-brand-dark/20';
      default:
        return 'bg-brand-light text-brand-dark/80 border border-brand-dark/30';
    }
  };

  if (isEditing) {
    return (
      <div className="bg-brand-light border-2 border-brand-primary rounded-2xl p-5 sm:p-6 shadow-sm space-y-4 text-left">
        <div className="flex items-center justify-between pb-3 border-b border-brand-primary/20">
          <span className="text-sm font-bold uppercase tracking-wider text-brand-dark">
            Editing Work Log
          </span>
          <span className="text-sm font-bold text-brand-dark">
            Spent: {formatMinutes(liveSpentMinutes)}
          </span>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-brand-soft border border-brand-dark/30 text-sm font-semibold text-brand-dark">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <Input
            label="Date"
            type="date"
            name="date"
            value={editData.date}
            onChange={handleFieldChange}
            required
          />
          <Input
            label="Task"
            name="task"
            value={editData.task}
            onChange={handleFieldChange}
            required
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          <Select
            label="Category"
            name="category"
            options={CATEGORIES}
            value={editData.category}
            onChange={handleFieldChange}
          />
          <Select
            label="Activity Type"
            name="activityType"
            options={ACTIVITY_TYPES}
            value={editData.activityType}
            onChange={handleFieldChange}
          />
          <Input
            label="Hall / Section"
            name="hallSection"
            value={editData.hallSection}
            onChange={handleFieldChange}
          />
        </div>

        {/* Conditional Custom Category & Activity Type Inputs */}
        {(editData.category === 'Other' || editData.activityType === 'Other') && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 p-3.5 rounded-xl bg-brand-soft/30 border border-brand-primary/20">
            {editData.category === 'Other' && (
              <div>
                <Input
                  label="Custom Category"
                  name="customCategory"
                  placeholder="Enter custom category name"
                  value={editData.customCategory || ''}
                  onChange={handleFieldChange}
                  required
                />
              </div>
            )}
            {editData.activityType === 'Other' && (
              <div>
                <Input
                  label="Custom Activity Type"
                  name="customActivityType"
                  placeholder="Enter custom activity type name"
                  value={editData.customActivityType || ''}
                  onChange={handleFieldChange}
                  required
                />
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
          <Input
            label="Time From"
            type="time"
            name="timeFrom"
            value={editData.timeFrom}
            onChange={handleFieldChange}
          />
          <Input
            label="Time To"
            type="time"
            name="timeTo"
            value={editData.timeTo}
            onChange={handleFieldChange}
          />
          <Select
            label="Status"
            name="status"
            options={STATUS_OPTIONS}
            value={editData.status}
            onChange={handleFieldChange}
          />
          <Select
            label="Priority"
            name="priority"
            options={PRIORITY_OPTIONS}
            value={editData.priority}
            onChange={handleFieldChange}
          />
        </div>

        <div>
          <label className="text-sm font-semibold text-brand-dark uppercase tracking-wider block mb-1.5">
            Remarks
          </label>
          <textarea
            name="remarks"
            rows="2"
            value={editData.remarks}
            onChange={handleFieldChange}
            className="w-full px-4 py-2.5 text-base bg-brand-light text-brand-dark rounded-xl border border-brand-dark/20 focus:border-brand-dark focus:ring-1 focus:ring-brand-primary outline-none resize-none"
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-brand-primary/20">
          <Button
            type="button"
            variant="outline"
            size="md"
            onClick={onCancelEdit}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            size="md"
            onClick={handleSave}
            isLoading={isSaving}
          >
            Save
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-brand-light border border-brand-primary/20 rounded-2xl p-5 sm:p-6 shadow-xs hover:border-brand-primary/50 transition-all text-left space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap text-sm">
        <div className="flex items-center gap-2.5">
          <span className="font-bold text-brand-dark">
            {formatDate(log.date)}
          </span>
          <span
            className={`px-3 py-1 rounded-full text-xs font-bold ${getPriorityBadge(
              log.priority,
            )}`}
          >
            {log.priority || 'Normal'}
          </span>
          <span
            className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusBadge(
              log.status,
            )}`}
          >
            {log.status || 'Completed'}
          </span>
        </div>

        <div>
          {log.isLocal ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-soft border border-brand-primary text-xs font-bold text-brand-dark">
              <span className="w-2 h-2 rounded-full bg-brand-dark animate-pulse" />
              Saved locally (Pending Sync)
            </span>
          ) : log.googleSheetSyncStatus === 'synced' ? (
            <span className="inline-flex items-center gap-1.5 text-sm text-brand-dark/75 font-semibold">
              <svg className="w-4 h-4 text-brand-dark" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
              Synced
            </span>
          ) : (
            <span className="text-xs font-medium text-brand-dark/70">
              Sheet: {log.googleSheetSyncStatus || 'pending'}
            </span>
          )}
        </div>
      </div>

      <div>
        <h4 className="text-base sm:text-lg font-bold text-brand-dark leading-snug">
          {log.task}
        </h4>
        {log.remarks && (
          <p className="text-sm sm:text-base text-brand-dark/75 mt-2 leading-relaxed bg-brand-soft/20 p-3 rounded-xl border border-brand-primary/15">
            {log.remarks}
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-brand-primary/15 text-sm text-brand-dark/80">
        <div>
          <span className="text-xs block uppercase font-bold text-brand-dark/60">
            Category
          </span>
          <span className="font-semibold text-brand-dark">{log.category}</span>
        </div>
        <div>
          <span className="text-xs block uppercase font-bold text-brand-dark/60">
            Activity
          </span>
          <span className="font-semibold text-brand-dark">{log.activityType}</span>
        </div>
        <div>
          <span className="text-xs block uppercase font-bold text-brand-dark/60">
            Time & Duration
          </span>
          <span className="font-semibold text-brand-dark">
            {formatDisplayTime(log.timeFrom)} - {formatDisplayTime(log.timeTo)} (
            {formatMinutes(log.spentMinutes)})
          </span>
        </div>
        <div>
          <span className="text-xs block uppercase font-bold text-brand-dark/60">
            Hall / Section
          </span>
          <span className="font-semibold text-brand-dark">
            {log.hallSection || 'None'}
          </span>
        </div>
      </div>

      <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-brand-primary/15">
        <Button
          type="button"
          variant="outline"
          size="md"
          onClick={() => onStartEdit(log._id)}
          icon={
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          }
        >
          Edit
        </Button>
        <Button
          type="button"
          variant="danger"
          size="md"
          onClick={() => onDelete(log)}
          icon={
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          }
        >
          Delete
        </Button>
      </div>
    </div>
  );
};

export default WorkLogCard;
