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
import { formatMinutes, calculateSpentMinutes, formatDisplayTime } from '../../utils/timeUtils';

export const WorkLogGroup = ({
  group,
  isExpanded: controlledExpanded,
  onToggle,
  onSave,
  onDelete,
}) => {
  const [internalExpanded, setInternalExpanded] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [rowError, setRowError] = useState('');

  const isControlled = controlledExpanded !== undefined;
  const isExpanded = isControlled ? controlledExpanded : internalExpanded;
  const isOpen = isExpanded || Boolean(editingId);

  const handleToggle = () => {
    if (isControlled && onToggle) {
      onToggle();
    } else {
      setInternalExpanded(!internalExpanded);
    }
  };

  const handleStartEdit = (log) => {
    setEditingId(log._id);
    const isKnownCategory =
      CATEGORIES.includes(log.category) && log.category !== 'Other';
    const isKnownActivity =
      ACTIVITY_TYPES.includes(log.activityType) && log.activityType !== 'Other';

    setEditFormData({
      date: group.dateKey,
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
    setRowError('');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditFormData({});
    setRowError('');
  };

  const handleFieldChange = (e) => {
    const { name, value } = e.target;
    setEditFormData((prev) => ({ ...prev, [name]: value }));
    setRowError('');
  };

  const handleSave = async (id) => {
    if (!editFormData.task || editFormData.task.trim().length < 2) {
      setRowError('Task description must be at least 2 characters');
      return;
    }

    if (
      editFormData.category === 'Other' &&
      (!editFormData.customCategory || !editFormData.customCategory.trim())
    ) {
      setRowError('Custom category is required');
      return;
    }

    if (
      editFormData.activityType === 'Other' &&
      (!editFormData.customActivityType || !editFormData.customActivityType.trim())
    ) {
      setRowError('Custom activity type is required');
      return;
    }

    const spent = calculateSpentMinutes(editFormData.timeFrom, editFormData.timeTo);
    if (spent <= 0) {
      setRowError('End time must be after start time');
      return;
    }

    const finalCategory =
      editFormData.category === 'Other'
        ? editFormData.customCategory.trim()
        : editFormData.category;

    const finalActivityType =
      editFormData.activityType === 'Other'
        ? editFormData.customActivityType.trim()
        : editFormData.activityType;

    const payload = {
      ...editFormData,
      category: finalCategory,
      activityType: finalActivityType,
    };
    delete payload.customCategory;
    delete payload.customActivityType;

    setIsSaving(true);
    try {
      await onSave(id, payload);
      setEditingId(null);
      setEditFormData({});
    } catch (err) {
      setRowError(err.message || 'Failed to save changes');
    } finally {
      setIsSaving(false);
    }
  };

  const getPriorityBadge = (priority) => {
    switch (priority) {
      case 'Urgent':
        return 'bg-brand-dark text-brand-light font-bold';
      case 'Important':
        return 'bg-brand-primary text-brand-dark font-bold';
      default:
        return 'bg-brand-soft/80 text-brand-dark font-semibold';
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Completed':
        return 'bg-brand-soft border border-brand-primary/40 text-brand-dark font-semibold';
      case 'In Progress':
        return 'bg-brand-primary/40 border border-brand-dark/20 text-brand-dark font-semibold';
      default:
        return 'bg-brand-light border border-brand-dark/25 text-brand-dark/85 font-semibold';
    }
  };

  return (
    <div className="bg-brand-light border border-brand-primary/30 rounded-2xl overflow-hidden shadow-xs text-left mb-6 transition-all">
      {/* Date Accordion Header: Click to view or hide tasks for this date */}
      <button
        type="button"
        onClick={handleToggle}
        aria-expanded={isOpen}
        className={`w-full text-left bg-gradient-to-r from-brand-soft/50 via-brand-soft/25 to-transparent px-5 sm:px-6 py-4 sm:py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-brand-soft/50 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-primary/50 cursor-pointer ${
          isOpen ? 'border-b border-brand-primary/25' : ''
        }`}
      >
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-brand-dark text-brand-light flex items-center justify-center font-bold text-base shrink-0 shadow-xs">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h3 className="text-lg sm:text-xl font-bold text-brand-dark tracking-tight">
                {group.formattedDate}
              </h3>
              {group.isToday && (
                <span className="px-2.5 py-0.5 rounded-full bg-brand-dark text-brand-light text-xs sm:text-sm font-bold">
                  Today
                </span>
              )}
              {group.isYesterday && (
                <span className="px-2.5 py-0.5 rounded-full bg-brand-soft border border-brand-primary text-brand-dark text-xs sm:text-sm font-bold">
                  Yesterday
                </span>
              )}
            </div>
            <p className="text-sm sm:text-base text-brand-dark/80 mt-1">
              Total: <strong className="text-brand-dark">{group.totalHoursStr}</strong> |{' '}
              {group.taskCount} {group.taskCount === 1 ? 'task' : 'tasks'}
            </p>
          </div>
        </div>

        {/* Right side: Click hint & Chevron indicator */}
        <div className="flex items-center gap-2.5 text-sm font-semibold text-brand-dark/80 self-end sm:self-center">
          <span className="hidden sm:inline">
            {isOpen ? 'Hide tasks' : 'View tasks'}
          </span>
          <div
            className={`w-8 h-8 rounded-full bg-brand-soft/80 border border-brand-primary/40 flex items-center justify-center transition-transform duration-200 ${
              isOpen ? 'rotate-180' : ''
            }`}
          >
            <svg
              className="w-4 h-4 text-brand-dark"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </button>

      {/* Task List under Date: only shown when accordion is open */}
      {isOpen && (
        <div className="divide-y divide-brand-primary/15">
        {group.tasks.map((task) => {
          const isEditing = editingId === task._id;

          /* =========================================================================
             IN-PLACE EDITING VIEW FOR A TASK
             ========================================================================= */
          if (isEditing) {
            const liveSpent = calculateSpentMinutes(editFormData.timeFrom, editFormData.timeTo);

            return (
              <div
                key={task._id}
                className="p-5 sm:p-6 bg-brand-soft/20 border-l-4 border-brand-primary space-y-5 transition-colors"
              >
                <div className="flex items-center justify-between pb-3 border-b border-brand-primary/20">
                  <span className="text-sm font-bold uppercase tracking-wide text-brand-dark">
                    Editing Task Entry
                  </span>
                  <span className="text-sm font-bold text-brand-dark bg-brand-soft/60 px-3.5 py-1.5 rounded-md">
                    Spent: {formatMinutes(liveSpent)}
                  </span>
                </div>

                {rowError && (
                  <p className="text-sm font-semibold text-brand-dark p-3 rounded-lg bg-brand-soft border border-brand-dark/30">
                    {rowError}
                  </p>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="sm:col-span-2">
                    <Input
                      label="Task Description"
                      name="task"
                      value={editFormData.task}
                      onChange={handleFieldChange}
                      required
                    />
                  </div>
                  <div>
                    <Select
                      label="Category"
                      name="category"
                      options={CATEGORIES}
                      value={editFormData.category}
                      onChange={handleFieldChange}
                    />
                  </div>
                  <div>
                    <Select
                      label="Activity Type"
                      name="activityType"
                      options={ACTIVITY_TYPES}
                      value={editFormData.activityType}
                      onChange={handleFieldChange}
                    />
                  </div>
                </div>

                {/* Conditional Custom Category & Activity Type Inputs */}
                {(editFormData.category === 'Other' ||
                  editFormData.activityType === 'Other') && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-brand-soft/30 border border-brand-primary/20">
                    {editFormData.category === 'Other' && (
                      <div>
                        <Input
                          label="Custom Category"
                          name="customCategory"
                          placeholder="Enter custom category name"
                          value={editFormData.customCategory || ''}
                          onChange={handleFieldChange}
                          required
                        />
                      </div>
                    )}
                    {editFormData.activityType === 'Other' && (
                      <div>
                        <Input
                          label="Custom Activity Type"
                          name="customActivityType"
                          placeholder="Enter custom activity type name"
                          value={editFormData.customActivityType || ''}
                          onChange={handleFieldChange}
                          required
                        />
                      </div>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div>
                    <Input
                      label="Time From"
                      type="time"
                      name="timeFrom"
                      value={editFormData.timeFrom}
                      onChange={handleFieldChange}
                    />
                  </div>
                  <div>
                    <Input
                      label="Time To"
                      type="time"
                      name="timeTo"
                      value={editFormData.timeTo}
                      onChange={handleFieldChange}
                    />
                  </div>
                  <div>
                    <Select
                      label="Status"
                      name="status"
                      options={STATUS_OPTIONS}
                      value={editFormData.status}
                      onChange={handleFieldChange}
                    />
                  </div>
                  <div>
                    <Select
                      label="Priority"
                      name="priority"
                      options={PRIORITY_OPTIONS}
                      value={editFormData.priority}
                      onChange={handleFieldChange}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <Input
                      label="Hall / Section"
                      name="hallSection"
                      placeholder="e.g. Lab 2, Hall B"
                      value={editFormData.hallSection}
                      onChange={handleFieldChange}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Input
                      label="Remarks (Optional)"
                      name="remarks"
                      placeholder="Notes or outcomes"
                      value={editFormData.remarks}
                      onChange={handleFieldChange}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-brand-primary/20">
                  <Button
                    type="button"
                    variant="outline"
                    size="md"
                    onClick={handleCancelEdit}
                    disabled={isSaving}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    size="md"
                    onClick={() => handleSave(task._id)}
                    isLoading={isSaving}
                  >
                    Save Changes
                  </Button>
                </div>
              </div>
            );
          }

          /* =========================================================================
             READ-ONLY TASK ROW / CARD
             ========================================================================= */
          return (
            <div
              key={task._id}
              className="p-5 sm:px-6 sm:py-5 hover:bg-brand-soft/20 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4 text-left"
            >
              {/* Left Column: Time range, task title, badges, details */}
              <div className="flex-1 min-w-0 space-y-2">
                <div className="flex items-center gap-3 flex-wrap">
                  {/* Time Range & Spent */}
                  <span className="inline-flex items-center gap-2 font-bold text-brand-dark text-sm sm:text-base bg-brand-soft/40 px-3 py-1.5 rounded-lg">
                    <svg className="w-4 h-4 text-brand-dark/70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {formatDisplayTime(task.timeFrom)} → {formatDisplayTime(task.timeTo)}
                    <span className="text-brand-dark/70 font-semibold">
                      ({formatMinutes(task.spentMinutes)})
                    </span>
                  </span>

                  {/* Status badge */}
                  <span className={`px-3 py-1 rounded-full text-sm ${getStatusBadge(task.status)}`}>
                    {task.status || 'Completed'}
                  </span>

                  {/* Priority badge */}
                  <span className={`px-3 py-1 rounded-full text-sm ${getPriorityBadge(task.priority)}`}>
                    {task.priority || 'Normal'}
                  </span>

                  {/* Sync status badge */}
                  {task.isLocal ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-soft border border-brand-primary text-sm font-semibold text-brand-dark">
                      <span className="w-2 h-2 rounded-full bg-brand-dark animate-pulse" />
                      Saved locally — syncing when online
                    </span>
                  ) : task.googleSheetSyncStatus === 'synced' ? (
                    <span className="inline-flex items-center gap-1.5 text-sm text-brand-dark/80 font-semibold">
                      <svg className="w-4 h-4 text-brand-dark" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                      </svg>
                      Synced
                    </span>
                  ) : task.googleSheetSyncStatus === 'failed' ? (
                    <span className="inline-flex items-center gap-1.5 text-sm text-brand-dark/80 font-semibold">
                      Sync failed — will retry
                    </span>
                  ) : (
                    <span className="text-sm text-brand-dark/70 font-medium">
                      Syncing...
                    </span>
                  )}
                </div>

                {/* Task Title */}
                <div className="pt-0.5">
                  <h4 className="text-base sm:text-lg font-bold text-brand-dark leading-snug break-words">
                    {task.task}
                  </h4>
                </div>

                {/* Category, Activity Type, Hall/Section */}
                <div className="flex items-center gap-2.5 text-sm sm:text-base text-brand-dark/75 flex-wrap">
                  <span className="font-semibold text-brand-dark/90">
                    {task.category}
                  </span>
                  <span>•</span>
                  <span>{task.activityType}</span>
                  {task.hallSection && (
                    <>
                      <span>•</span>
                      <span className="font-semibold text-brand-dark/85">
                        {task.hallSection}
                      </span>
                    </>
                  )}
                </div>

                {/* Remarks if present */}
                {task.remarks && (
                  <p className="text-sm sm:text-base text-brand-dark/80 bg-brand-soft/25 p-3 rounded-lg border border-brand-primary/20 mt-1.5 leading-relaxed">
                    {task.remarks}
                  </p>
                )}
              </div>

              {/* Right Column: Actions */}
              <div className="flex items-center gap-2.5 shrink-0 self-end md:self-center pt-2 md:pt-0">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleStartEdit(task)}
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
                  size="sm"
                  onClick={() => onDelete(task)}
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
        })}
        </div>
      )}
    </div>
  );
};

export default WorkLogGroup;
