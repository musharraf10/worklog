/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useMemo, useEffect } from 'react';
import Input from '../common/Input';
import Select from '../common/Select';
import Button from '../common/Button';
import {
  CATEGORIES,
  ACTIVITY_TYPES,
  STATUS_OPTIONS,
  PRIORITY_OPTIONS,
  DEFAULT_WORK_LOG,
} from '../../constants/workLogConstants';
import { getTodayDateString } from '../../utils/dateUtils';
import { calculateSpentMinutes, formatMinutes } from '../../utils/timeUtils';

export const WorkLogForm = ({ onSubmit, isLoading = false, initialDate }) => {
  const [formData, setFormData] = useState({
    ...DEFAULT_WORK_LOG,
    date: getTodayDateString(),
    customCategory: '',
    customActivityType: '',
  });

  const [errors, setErrors] = useState({});
  const [isExpanded, setIsExpanded] = useState(true);

  useEffect(() => {
    if (initialDate) setFormData((previous) => ({ ...previous, date: initialDate }));
  }, [initialDate]);

  // Live spent time calculation
  const calculatedMinutes = useMemo(() => {
    return calculateSpentMinutes(formData.timeFrom, formData.timeTo);
  }, [formData.timeFrom, formData.timeTo]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.date) {
      newErrors.date = 'Date is required';
    }

    if (!formData.task || formData.task.trim().length < 2) {
      newErrors.task = 'Task must be at least 2 characters';
    }

    if (!formData.category) {
      newErrors.category = 'Category is required';
    } else if (
      formData.category === 'Other' &&
      (!formData.customCategory || !formData.customCategory.trim())
    ) {
      newErrors.customCategory = 'Custom category is required';
    }

    if (!formData.activityType) {
      newErrors.activityType = 'Activity type is required';
    } else if (
      formData.activityType === 'Other' &&
      (!formData.customActivityType || !formData.customActivityType.trim())
    ) {
      newErrors.customActivityType = 'Custom activity type is required';
    }

    if (!formData.timeFrom) {
      newErrors.timeFrom = 'Start time is required';
    }

    if (!formData.timeTo) {
      newErrors.timeTo = 'End time is required';
    }

    if (formData.timeFrom && formData.timeTo && calculatedMinutes <= 0) {
      newErrors.timeTo = 'Time To must be after Time From';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      const finalCategory =
        formData.category === 'Other'
          ? formData.customCategory.trim()
          : formData.category;

      const finalActivityType =
        formData.activityType === 'Other'
          ? formData.customActivityType.trim()
          : formData.activityType;

      const payload = {
        ...formData,
        category: finalCategory,
        activityType: finalActivityType,
      };
      delete payload.customCategory;
      delete payload.customActivityType;

      await onSubmit(payload);
      setFormData({
        ...DEFAULT_WORK_LOG,
        date: formData.date,
        customCategory: '',
        customActivityType: '',
      });
      setErrors({});
    } catch (err) {
      console.error('Work log submission error:', err);
    }
  };

  const handleReset = () => {
    setFormData({
      ...DEFAULT_WORK_LOG,
      date: getTodayDateString(),
      customCategory: '',
      customActivityType: '',
    });
    setErrors({});
  };

  return (
    <div className="bg-brand-light border border-brand-primary/30 rounded-2xl p-4 shadow-xs sm:p-6">
      <div className="flex items-start justify-between gap-3 pb-4 mb-5 border-b border-brand-primary/20">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-brand-soft flex items-center justify-center text-brand-dark shadow-xs">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-bold text-brand-dark">Add work log</h2>
            <p className="text-sm text-brand-dark/70 mt-0.5">Record this entry for the selected day.</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="shrink-0 text-sm font-semibold text-brand-dark/80 hover:text-brand-dark px-3 py-1.5 rounded-lg bg-brand-soft/40 hover:bg-brand-soft/70 transition-colors"
        >
          {isExpanded ? 'Collapse' : 'Expand Form'}
        </button>
      </div>

      {isExpanded && (
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <Input
                label="Date"
                type="date"
                name="date"
                value={formData.date}
                onChange={handleChange}
                error={errors.date}
                required
              />
            </div>
            <div>
              <Input
                label="Time From"
                type="time"
                name="timeFrom"
                value={formData.timeFrom}
                onChange={handleChange}
                error={errors.timeFrom}
                required
              />
            </div>
            <div>
              <Input
                label="Time To"
                type="time"
                name="timeTo"
                value={formData.timeTo}
                onChange={handleChange}
                error={errors.timeTo}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,2fr)_minmax(190px,1fr)] items-end">
            <div className="min-w-0">
              <Input
                label="Task Description"
                name="task"
                placeholder="What did you work on? (e.g. Conducted React & Node lecture)"
                value={formData.task}
                onChange={handleChange}
                error={errors.task}
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-semibold text-brand-dark tracking-wide">Spent Time</span>
              <div className={`h-[46px] px-4 flex items-center rounded-lg border text-base font-bold transition-colors ${calculatedMinutes > 0 ? 'bg-brand-soft/60 border-brand-primary text-brand-dark' : 'bg-brand-light border-brand-dark/20 text-brand-dark/50'}`}>
                {calculatedMinutes > 0 ? <span className="flex items-center gap-2"><svg className="w-5 h-5 text-brand-dark" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>{formatMinutes(calculatedMinutes)}</span> : '--'}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Select
                label="Category"
                name="category"
                options={CATEGORIES}
                value={formData.category}
                onChange={handleChange}
                error={errors.category}
                required
              />
            </div>
            <div>
              <Select
                label="Activity Type"
                name="activityType"
                options={ACTIVITY_TYPES}
                value={formData.activityType}
                onChange={handleChange}
                error={errors.activityType}
                required
              />
            </div>
            <div>
              <Input
                label="Hall / Section (Optional)"
                name="hallSection"
                placeholder="e.g. Lab 3, Hall B, Room 204"
                value={formData.hallSection}
                onChange={handleChange}
              />
            </div>
          </div>

          {/* Conditional Custom Category & Activity Type Inputs */}
          {(formData.category === 'Other' || formData.activityType === 'Other') && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-brand-soft/30 border border-brand-primary/20">
              {formData.category === 'Other' && (
                <div>
                  <Input
                    label="Custom Category"
                    name="customCategory"
                    placeholder="Enter custom category name"
                    value={formData.customCategory}
                    onChange={handleChange}
                    error={errors.customCategory}
                    required
                  />
                </div>
              )}
              {formData.activityType === 'Other' && (
                <div>
                  <Input
                    label="Custom Activity Type"
                    name="customActivityType"
                    placeholder="Enter custom activity type name"
                    value={formData.customActivityType}
                    onChange={handleChange}
                    error={errors.customActivityType}
                    required
                  />
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 items-end">
            <div>
              <Select
                label="Status"
                name="status"
                options={STATUS_OPTIONS}
                value={formData.status}
                onChange={handleChange}
              />
            </div>
            <div className="sm:col-span-2 lg:col-span-1">
              <Select
                label="Priority"
                name="priority"
                options={PRIORITY_OPTIONS}
                value={formData.priority}
                onChange={handleChange}
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-semibold text-brand-dark tracking-wide block mb-1.5">
              Remarks (Optional)
            </label>
            <textarea
              name="remarks"
              rows="3"
              placeholder="Additional notes, key outcomes, or next steps..."
              value={formData.remarks}
              onChange={handleChange}
              className="w-full px-4 py-2.5 text-base bg-brand-light text-brand-dark placeholder-brand-dark/40 rounded-lg border border-brand-dark/20 focus:border-brand-dark focus:ring-2 focus:ring-brand-primary/60 outline-none resize-none leading-relaxed"
            />
          </div>

          <div className="flex flex-col-reverse gap-3 pt-3 border-t border-brand-primary/20 sm:flex-row sm:items-center sm:justify-end">
            <Button
              type="button"
              variant="outline"
              size="md"
              className="w-full sm:w-auto"
              onClick={handleReset}
              disabled={isLoading}
            >
              Clear
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              className="w-full sm:w-auto"
              isLoading={isLoading}
            >
              Add Work Log
            </Button>
          </div>
        </form>
      )}
    </div>
  );
};

export default WorkLogForm;
