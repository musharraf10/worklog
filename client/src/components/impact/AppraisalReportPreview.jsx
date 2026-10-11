import { useState } from 'react';
import Button from '../common/Button';
import { exportReportToPdf, triggerPrintReport } from '../../utils/pdfGenerator';
import ImpactShareInline from './ImpactShareInline';

export const AppraisalReportPreview = ({
  report,
  selectedEventIds = [],
  selectedStudentImpactIds = [],
  onReset,
}) => {
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);

  if (!report) return null;

  const isAiReport = report.reportType === 'ai';
  const metrics = report.metrics || {};
  const events = report.eventsSummary || [];
  const students = report.studentsSummary || [];
  const evidenceList = report.evidenceAuditList || [];
  const highlights = report.appraisalHighlights || [];

  const handleExportPdf = async () => {
    setIsExportingPdf(true);
    try {
      await exportReportToPdf(
        'appraisal-report-printable-area',
        `Impact_Appraisal_${(report.userName || 'Report').replace(/\s+/g, '_')}.pdf`,
      );
    } catch (err) {
      console.error('PDF generation error:', err);
    } finally {
      setIsExportingPdf(false);
    }
  };

  return (
    <div className="space-y-6 text-left">
      {/* Top Controls Bar (hidden during print) */}
      <div className="p-4 bg-brand-light rounded-2xl border border-brand-primary/25 flex flex-wrap items-center justify-between gap-3 shadow-xs print:hidden">
        <div className="flex items-center gap-2">
          <span
            className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
              isAiReport
                ? 'bg-brand-soft border border-brand-primary text-brand-dark'
                : 'bg-brand-soft/70 border border-brand-primary/30 text-brand-dark'
            }`}
          >
            {isAiReport ? 'AI-Synthesized Appraisal' : 'Standard Verified Appraisal'}
          </span>
          <span className="text-xs text-brand-dark/70 font-medium">
            Generated: {new Date(report.generatedAt).toLocaleDateString()}
          </span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {onReset && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onReset}
            >
              Modify Selection
            </Button>
          )}

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={triggerPrintReport}
            icon={
              <svg className="w-4 h-4 text-brand-dark" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
            }
          >
            Print
          </Button>

          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={handleExportPdf}
            isLoading={isExportingPdf}
            icon={
              <svg className="w-4 h-4 text-brand-light" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            }
          >
            Export PDF
          </Button>

          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setIsShareOpen(!isShareOpen)}
            icon={
              <svg className="w-4 h-4 text-brand-light" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
            }
          >
            {isShareOpen ? 'Hide Share Settings' : 'Share with Manager'}
          </Button>
        </div>
      </div>

      {/* Inline Manager Sharing Drawer */}
      {isShareOpen && (
        <ImpactShareInline
          selectedEventIds={selectedEventIds}
          selectedStudentImpactIds={selectedStudentImpactIds}
          reportSummarySnapshot={{
            executiveSummary: report.executiveSummary,
            metrics: report.metrics,
            generatedAt: report.generatedAt,
          }}
          onClose={() => setIsShareOpen(false)}
        />
      )}

      {/* Printable Report Canvas Area */}
      <div
        id="appraisal-report-printable-area"
        className="p-6 sm:p-10 bg-brand-light rounded-2xl border border-brand-primary/25 space-y-8 shadow-xs"
      >
        {/* Document Header */}
        <div className="border-b-2 border-brand-primary/25 pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-brand-soft text-brand-dark border border-brand-primary/20">
                Official Self-Appraisal Document
              </span>
              <span className="text-xs font-semibold text-brand-dark/60 font-mono">
                Work Log Impact Portfolio
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-brand-dark mt-1.5 tracking-tight">
              {report.title || 'Impact & Performance Appraisal Report'}
            </h1>
            <p className="text-sm font-medium text-brand-dark/80 mt-1">
              Candidate: <strong className="text-brand-dark">{report.userName}</strong>
              {report.userEmail ? ` (${report.userEmail})` : ''}
            </p>
          </div>

          <div className="text-left sm:text-right text-xs font-medium text-brand-dark/70 bg-brand-soft/40 p-3 rounded-xl border border-brand-primary/20">
            <div>
              Generated Date:{' '}
              <strong className="text-brand-dark">
                {new Date(report.generatedAt).toLocaleDateString()}
              </strong>
            </div>
            {report.dateRange?.startDate && report.dateRange?.endDate && (
              <div className="mt-0.5">
                Period: {report.dateRange.startDate} to {report.dateRange.endDate}
              </div>
            )}
            <div className="mt-0.5 text-brand-primary font-bold">
              Evidence Backed • Google Drive Verified
            </div>
          </div>
        </div>

        {/* Executive Metrics Dashboard */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-4 rounded-xl bg-brand-soft/30 border border-brand-primary/20">
            <span className="text-[11px] font-bold uppercase tracking-wider text-brand-dark/70 block">
              Programs Spearheaded
            </span>
            <span className="text-2xl sm:text-3xl font-extrabold text-brand-dark mt-0.5 block">
              {metrics.totalEvents || 0}
            </span>
            <span className="text-[10px] text-brand-dark/60 font-medium">Workshops & Hackathons</span>
          </div>

          <div className="p-4 rounded-xl bg-brand-soft/30 border border-brand-primary/20">
            <span className="text-[11px] font-bold uppercase tracking-wider text-brand-dark/70 block">
              Total Community Reach
            </span>
            <span className="text-2xl sm:text-3xl font-extrabold text-brand-primary mt-0.5 block">
              {metrics.totalParticipants || 0}
            </span>
            <span className="text-[10px] text-brand-dark/60 font-medium">Verified attendees</span>
          </div>

          <div className="p-4 rounded-xl bg-brand-soft/30 border border-brand-primary/20">
            <span className="text-[11px] font-bold uppercase tracking-wider text-brand-dark/70 block">
              Students Mentored
            </span>
            <span className="text-2xl sm:text-3xl font-extrabold text-brand-dark mt-0.5 block">
              {metrics.totalStudents || 0}
            </span>
            <span className="text-[10px] text-brand-dark/60 font-medium">1-on-1 transformations</span>
          </div>

          <div className="p-4 rounded-xl bg-brand-soft/30 border border-brand-primary/20">
            <span className="text-[11px] font-bold uppercase tracking-wider text-brand-dark/70 block">
              Evidence Links
            </span>
            <span className="text-2xl sm:text-3xl font-extrabold text-brand-primary mt-0.5 block">
              {metrics.totalEvidenceItems || 0}
            </span>
            <span className="text-[10px] text-brand-dark/60 font-medium">Google Drive assets</span>
          </div>
        </div>

        {/* Executive Appraisal Narrative */}
        {isAiReport && report.aiAppraisalNarrative ? (
          <div className="p-5 sm:p-6 rounded-2xl bg-brand-soft/20 border border-brand-primary/30 space-y-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-brand-primary animate-pulse"></span>
              <h2 className="text-base font-bold text-brand-dark">
                Executive Synthesis & Leadership Assessment
              </h2>
            </div>
            <div className="prose prose-sm max-w-none text-brand-dark leading-relaxed whitespace-pre-wrap font-medium">
              {report.aiAppraisalNarrative}
            </div>
          </div>
        ) : (
          <div className="p-5 sm:p-6 rounded-2xl bg-brand-soft/20 border border-brand-primary/25 space-y-3">
            <h2 className="text-base font-bold text-brand-dark flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-brand-primary"></span>
              <span>Executive Overview</span>
            </h2>
            <p className="text-sm font-medium text-brand-dark/90 leading-relaxed">
              {report.executiveSummary}
            </p>

            {highlights.length > 0 && (
              <div className="pt-3 border-t border-brand-primary/15 space-y-1.5">
                <span className="text-xs font-bold uppercase tracking-wider text-brand-dark/70 block">
                  Core Performance Indicators
                </span>
                <ul className="space-y-1">
                  {highlights.map((h, i) => (
                    <li key={i} className="text-xs text-brand-dark/85 font-medium flex items-start gap-2">
                      <span className="text-brand-primary font-bold">✓</span>
                      <span>{h}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Events & Initiatives Inventory */}
        {events.length > 0 && (
          <div className="space-y-3">
            <div className="border-b border-brand-primary/20 pb-2">
              <h2 className="text-base font-bold text-brand-dark">
                1. Institutional Initiatives & Leadership ({events.length})
              </h2>
            </div>

            <div className="space-y-3">
              {events.map((e) => (
                <div
                  key={e._id}
                  className="p-4 rounded-xl border border-brand-primary/20 bg-brand-soft/15 space-y-2 text-xs"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <h3 className="font-bold text-sm text-brand-dark">
                      {e.title}
                    </h3>
                    <div className="flex items-center gap-2 font-semibold text-brand-dark/70">
                      <span className="px-2 py-0.5 rounded-full bg-brand-soft border border-brand-primary/20">
                        {e.eventType}
                      </span>
                      <span>{new Date(e.startDate).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <p className="text-brand-dark/80 font-medium">
                    Role: <strong className="text-brand-dark">{e.myRole}</strong> | Participants: <strong className="text-brand-dark">{e.participantsCount}</strong>
                  </p>

                  {e.contributions && (
                    <p className="text-brand-dark/85 font-medium leading-relaxed">
                      <strong className="text-brand-dark">Contributions:</strong> {e.contributions}
                    </p>
                  )}
                  {e.outcomes && (
                    <p className="text-brand-dark/85 font-medium leading-relaxed">
                      <strong className="text-brand-dark">Outcomes & Achievements:</strong> {e.outcomes}
                    </p>
                  )}

                  {/* Attached Google Drive links in Event card */}
                  {(e.evidenceLinks || []).length > 0 && (
                    <div className="pt-2 border-t border-brand-primary/10 flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-brand-dark/70 text-[11px] uppercase">
                        Drive Evidence:
                      </span>
                      {e.evidenceLinks.map((link, lIdx) => (
                        <a
                          key={link._id || lIdx}
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-brand-soft text-brand-dark font-semibold text-[11px] border border-brand-primary/20 hover:underline"
                        >
                          <span>{link.description || link.title || 'Drive Link'}</span>
                          <span className="text-[10px]">↗</span>
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Student Mentorship Outcomes */}
        {students.length > 0 && (
          <div className="space-y-3">
            <div className="border-b border-brand-primary/20 pb-2">
              <h2 className="text-base font-bold text-brand-dark">
                2. Student Mentorship Outcomes ({students.length})
              </h2>
            </div>

            <div className="space-y-3">
              {students.map((s) => (
                <div
                  key={s._id}
                  className="p-4 rounded-xl border border-brand-primary/20 bg-brand-soft/15 space-y-1.5 text-xs font-medium"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-sm text-brand-dark">
                      {s.studentName} {s.studentBatch ? `(${s.studentBatch})` : ''}
                    </h3>
                    <span className="text-brand-dark/60">
                      {new Date(s.date).toLocaleDateString()}
                    </span>
                  </div>

                  <p className="text-brand-dark/85">
                    <strong>Challenge:</strong> {s.initialChallenge}
                  </p>
                  <p className="text-brand-dark/85">
                    <strong>Intervention:</strong> {s.howIHelped}
                  </p>
                  <p className="font-bold text-brand-dark bg-brand-soft/30 p-2 rounded-lg border border-brand-primary/15">
                    Outcome: {s.achievement}
                  </p>

                  {/* Attached Google Drive links in Student card */}
                  {(s.evidenceLinks || []).length > 0 && (
                    <div className="pt-2 border-t border-brand-primary/10 flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-brand-dark/70 text-[11px] uppercase">
                        Drive Proof:
                      </span>
                      {s.evidenceLinks.map((link, lIdx) => (
                        <a
                          key={link._id || lIdx}
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-brand-soft text-brand-dark font-semibold text-[11px] border border-brand-primary/20 hover:underline"
                        >
                          <span>{link.description || link.title || 'Proof Link'}</span>
                          <span className="text-[10px]">↗</span>
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Evidence Audit Trail */}
        {evidenceList.length > 0 && (
          <div className="space-y-3 pt-3 border-t border-brand-primary/20">
            <h2 className="text-base font-bold text-brand-dark">
              3. Verified Evidence Audit Trail ({evidenceList.length})
            </h2>

            {/* Permissions & Privacy Helper Notice */}
            <div className="p-3 rounded-xl bg-brand-soft/40 border border-brand-primary/20 text-xs text-brand-dark/85 space-y-1">
              <strong className="text-brand-dark block font-bold">
                Google Drive Permissions & Access Guidance:
              </strong>
              <p className="leading-relaxed">
                Evidence links point directly to assets in Google Drive. Ensure that permissions on shared files and folders allow reviewer viewing (e.g. <em>&quot;Anyone with the link can view&quot;</em> or shared directly with your manager&apos;s email). Keep other private folders restricted.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border border-brand-primary/20 rounded-xl overflow-hidden">
                <thead className="bg-brand-soft/60 text-brand-dark font-bold uppercase tracking-wider">
                  <tr>
                    <th className="p-2.5">Source</th>
                    <th className="p-2.5">Associated Record</th>
                    <th className="p-2.5">Evidence Description / Label</th>
                    <th className="p-2.5">Type</th>
                    <th className="p-2.5">Google Drive Link</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-primary/10 bg-brand-light">
                  {evidenceList.map((item, idx) => (
                    <tr key={idx} className="hover:bg-brand-soft/20 font-medium text-brand-dark">
                      <td className="p-2.5 font-semibold">{item.sourceType}</td>
                      <td className="p-2.5 truncate max-w-xs">{item.sourceTitle}</td>
                      <td className="p-2.5 font-semibold text-brand-dark">
                        {item.description || item.title || 'Evidence Item'}
                      </td>
                      <td className="p-2.5">
                        <span className="px-2 py-0.5 rounded font-bold uppercase text-[10px] bg-brand-soft text-brand-dark border border-brand-primary/15">
                          {item.driveType || 'Drive'}
                        </span>
                      </td>
                      <td className="p-2.5">
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 font-bold text-brand-primary hover:underline"
                        >
                          <span>Open in Drive</span>
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </a>
                        <span className="hidden print:inline text-[9px] font-mono text-brand-dark/70 ml-1">
                          ({item.url})
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Document Footer */}
        <div className="pt-5 border-t-2 border-brand-primary/20 flex flex-col sm:flex-row items-center justify-between text-xs text-brand-dark/70 font-medium">
          <p>Generated by Work Log System • Google Drive Evidence Verification</p>
          <p className="mt-1 sm:mt-0">Confidential Self-Appraisal Document</p>
        </div>
      </div>
    </div>
  );
};

export default AppraisalReportPreview;
