import { useState } from 'react';
import Button from '../common/Button';
import impactService from '../../services/impactService';
import AppraisalReportPreview from './AppraisalReportPreview';

export const ImpactSummarySection = ({
  selectedEventIds = [],
  selectedStudentImpactIds = [],
  onClearSelection,
  onNotice,
}) => {
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: '',
  });

  const [quickDatePreset, setQuickDatePreset] = useState('all');
  const [isGenerating, setIsGenerating] = useState(false);
  const [reportResult, setReportResult] = useState(null);
  const [aiErrorWarning, setAiErrorWarning] = useState(null);
  const [error, setError] = useState('');

  const handlePresetChange = (preset) => {
    setQuickDatePreset(preset);
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const toYMD = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    if (preset === 'all') {
      setDateRange({ startDate: '', endDate: '' });
    } else if (preset === 'this-month') {
      const first = new Date(now.getFullYear(), now.getMonth(), 1);
      const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      setDateRange({ startDate: toYMD(first), endDate: toYMD(last) });
    } else if (preset === 'last-30') {
      const past = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      setDateRange({ startDate: toYMD(past), endDate: toYMD(now) });
    } else if (preset === 'this-year') {
      const first = new Date(now.getFullYear(), 0, 1);
      setDateRange({ startDate: toYMD(first), endDate: toYMD(now) });
    }
  };

  const handleGenerateReport = async (type = 'standard') => {
    setIsGenerating(true);
    setError('');
    setAiErrorWarning(null);

    try {
      const payload = {
        type,
        selectedEventIds: selectedEventIds.length > 0 ? selectedEventIds : undefined,
        selectedStudentImpactIds:
          selectedStudentImpactIds.length > 0 ? selectedStudentImpactIds : undefined,
        dateRange: {
          startDate: dateRange.startDate || undefined,
          endDate: dateRange.endDate || undefined,
        },
      };

      const res = await impactService.generateReport(payload);

      if (type === 'ai') {
        if (res.success && res.reportType === 'ai') {
          setReportResult(res);
          if (onNotice) onNotice('AI appraisal report generated');
        } else {
          setAiErrorWarning({
            message: res.message || 'AI provider unavailable.',
            fallback: res.standardFallback,
          });
          if (res.standardFallback) {
            setReportResult(res.standardFallback);
          }
          if (onNotice) onNotice('Standard Report generated (AI provider unavailable)');
        }
      } else {
        setReportResult(res.data);
        if (onNotice) onNotice('Standard appraisal report generated');
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
        'Failed to generate appraisal report. Ensure records exist for your filter.',
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const totalSelectedRecords =
    selectedEventIds.length + selectedStudentImpactIds.length;

  return (
    <div className="space-y-6 text-left">
      {!reportResult ? (
        <div className="rounded-2xl border border-brand-primary/25 bg-brand-light p-5 sm:p-6 shadow-xs space-y-5">
          <div>
            <h2 className="text-xl font-bold text-brand-dark">
              Performance Report
            </h2>
            <p className="text-sm text-brand-dark/70 mt-1 font-medium">
              Synthesize your events, workshops, student mentoring stories, and attached evidence into an executive self-appraisal document.
            </p>
          </div>

          {/* Quick Date Presets */}
          <div className="space-y-2.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-brand-dark/70">
              Evaluation Date Range
            </label>
            <div className="flex items-center gap-2 flex-wrap">
              {[
                { id: 'all', label: 'All Records' },
                { id: 'this-month', label: 'This Month' },
                { id: 'last-30', label: 'Last 30 Days' },
                { id: 'this-year', label: 'This Year' },
              ].map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handlePresetChange(p.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${quickDatePreset === p.id
                      ? 'bg-brand-dark text-brand-light border-brand-dark shadow-xs'
                      : 'bg-brand-light text-brand-dark border-brand-dark/20 hover:bg-brand-soft'
                    }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div>
                <span className="text-xs font-semibold text-brand-dark/70 block mb-1">
                  Start Date
                </span>
                <input
                  type="date"
                  value={dateRange.startDate}
                  onChange={(e) => {
                    setQuickDatePreset('custom');
                    setDateRange({ ...dateRange, startDate: e.target.value });
                  }}
                  className="w-full px-3.5 py-2 rounded-xl border border-brand-dark/20 bg-brand-light text-xs sm:text-sm font-medium text-brand-dark focus:outline-none focus:ring-1 focus:ring-brand-primary"
                />
              </div>

              <div>
                <span className="text-xs font-semibold text-brand-dark/70 block mb-1">
                  End Date
                </span>
                <input
                  type="date"
                  value={dateRange.endDate}
                  onChange={(e) => {
                    setQuickDatePreset('custom');
                    setDateRange({ ...dateRange, endDate: e.target.value });
                  }}
                  className="w-full px-3.5 py-2 rounded-xl border border-brand-dark/20 bg-brand-light text-xs sm:text-sm font-medium text-brand-dark focus:outline-none focus:ring-1 focus:ring-brand-primary"
                />
              </div>
            </div>
          </div>

          {/* Record Selection Summary Banner */}
          <div className="p-4 rounded-xl bg-brand-soft/30 border border-brand-primary/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-brand-dark block">
                Selected Records for Appraisal
              </span>
              <p className="text-xs text-brand-dark/75 font-medium mt-0.5">
                {totalSelectedRecords > 0 ? (
                  <span>
                    <strong>{selectedEventIds.length}</strong> Events and{' '}
                    <strong>{selectedStudentImpactIds.length}</strong> Student Impact records chosen.
                  </span>
                ) : (
                  <span>
                    No specific records selected manually. <strong>All records</strong> matching your date range will be automatically synthesized.
                  </span>
                )}
              </p>
            </div>

            {totalSelectedRecords > 0 && onClearSelection && (
              <button
                type="button"
                onClick={onClearSelection}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-brand-dark hover:bg-brand-soft transition-colors shrink-0"
              >
                Clear Manual Selection
              </button>
            )}
          </div>

          {error && (
            <div className="p-3 bg-brand-soft border border-brand-dark/30 rounded-xl text-sm font-semibold text-brand-dark">
              {error}
            </div>
          )}

          {/* Action Trigger Buttons */}
          <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
            <Button
              type="button"
              variant="primary"
              size="lg"
              className="w-full sm:w-auto flex-1"
              isLoading={isGenerating}
              onClick={() => handleGenerateReport('standard')}
              icon={
                <svg className="w-5 h-5 text-brand-light" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              }
            >
              Generate Standard Report (Always Available)
            </Button>

            <Button
              type="button"
              variant="brand"
              size="lg"
              className="w-full sm:w-auto flex-1 font-bold"
              isLoading={isGenerating}
              onClick={() => handleGenerateReport('ai')}
              icon={
                <svg className="w-5 h-5 text-brand-dark" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              }
            >
              Generate AI Report (Requires API Key)
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {aiErrorWarning && (
            <div className="p-4 bg-brand-soft/80 border border-brand-dark/30 rounded-2xl text-xs space-y-1">
              <span className="font-bold text-brand-dark block">
                AI Provider Notice — Fallback Activated
              </span>
              <p className="text-brand-dark/80 font-medium">
                {aiErrorWarning.message}
              </p>
              <p className="text-brand-dark/65 text-[11px]">
                A verified Standard Report has been generated for you below.
              </p>
            </div>
          )}

          <AppraisalReportPreview
            report={reportResult}
            selectedEventIds={selectedEventIds}
            selectedStudentImpactIds={selectedStudentImpactIds}
            onReset={() => setReportResult(null)}
          />
        </div>
      )}
    </div>
  );
};

export default ImpactSummarySection;
