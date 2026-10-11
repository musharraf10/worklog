import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import impactService from '../../services/impactService';

export const SharedImpactPortal = () => {
  const { token } = useParams();
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [previewAttachment, setPreviewAttachment] = useState(null);

  useEffect(() => {
    const fetchSharedPortal = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await impactService.getSharedImpactPortal(token);
        setData(res.data);
      } catch (err) {
        setError(
          err.response?.data?.message ||
            'Unable to load shared appraisal portal. Link may have expired or been revoked.',
        );
      } finally {
        setIsLoading(false);
      }
    };

    if (token) {
      fetchSharedPortal();
    }
  }, [token]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-brand-light flex items-center justify-center p-6 text-brand-dark">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 mx-auto border-3 border-brand-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="font-bold text-sm">Verifying manager access token...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-brand-light flex items-center justify-center p-6 text-brand-dark">
        <div className="max-w-md w-full p-8 bg-brand-light rounded-2xl border border-brand-primary/25 shadow-xs text-center space-y-4">
          <div className="w-14 h-14 mx-auto rounded-full bg-red-100 flex items-center justify-center text-red-600">
            <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-brand-dark">Access Unavailable</h2>
          <p className="text-xs text-brand-dark/70 font-medium leading-relaxed">
            {error || 'This manager appraisal link is invalid or no longer active.'}
          </p>
        </div>
      </div>
    );
  }

  const { user, shareLink, events = [], students = [], reportSummarySnapshot } = data;

  const renderLegacyAttachmentPreview = (att) => {
    const isImage =
      att.fileType === 'Photo' ||
      att.fileType === 'Screenshot' ||
      att.mimeType?.startsWith('image/');
    const isPdf =
      att.fileType === 'PDF' || att.mimeType === 'application/pdf';
    const streamUrl = `${att.url || `/api/impact/files/${att.fileId}`}?token=${token}`;
    const downloadUrl = `${streamUrl}&download=true`;

    return (
      <div className="mt-3 p-3.5 rounded-xl bg-brand-soft/40 border border-brand-primary/25 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-brand-dark">
            {att.originalName} ({att.fileType})
          </span>
          <div className="flex items-center gap-2">
            <a
              href={downloadUrl}
              download={att.originalName}
              className="font-bold text-brand-primary hover:underline"
            >
              Download File
            </a>
            <button
              type="button"
              onClick={() => setPreviewAttachment(null)}
              className="text-brand-dark/60 hover:text-brand-dark ml-2 font-medium"
            >
              Close
            </button>
          </div>
        </div>

        <div className="rounded-lg overflow-hidden border border-brand-primary/20 bg-brand-light flex items-center justify-center p-2">
          {isImage ? (
            <img
              src={streamUrl}
              alt={att.originalName}
              className="max-h-60 max-w-full object-contain rounded"
            />
          ) : isPdf ? (
            <iframe
              src={streamUrl}
              title={att.originalName}
              className="w-full h-64 rounded"
            />
          ) : (
            <p className="text-xs text-brand-dark/70 py-4">
              Direct inline viewer not available for this format. Click Download File above.
            </p>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-brand-light text-brand-dark p-4 sm:p-8 max-w-5xl mx-auto space-y-8 text-left">
      {/* Executive Header */}
      <div className="p-6 sm:p-8 bg-brand-light rounded-2xl border border-brand-primary/25 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {user?.profilePicture ? (
            <img
              src={user.profilePicture}
              alt={user.name}
              className="w-14 h-14 rounded-2xl object-cover border border-brand-primary/30"
            />
          ) : (
            <div className="w-14 h-14 rounded-2xl bg-brand-primary text-brand-light font-bold text-xl flex items-center justify-center">
              {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </div>
          )}

          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-brand-soft text-brand-dark border border-brand-primary/20">
                Verified Appraisal Review
              </span>
              <span className="text-xs font-semibold text-brand-dark/60">
                Read-Only Manager Portal
              </span>
            </div>
            <h1 className="text-2xl font-extrabold text-brand-dark mt-1">
              {user?.name || 'Employee'}&apos;s Impact Portfolio
            </h1>
            <p className="text-xs text-brand-dark/70 font-medium mt-0.5">
              {shareLink?.label || 'Performance Appraisal Records'}
            </p>
          </div>
        </div>

        <div className="p-3 bg-brand-soft/40 rounded-xl border border-brand-primary/20 text-xs text-right sm:text-right font-medium">
          <span className="font-bold text-brand-dark block">
            Access Expires
          </span>
          <span className="text-brand-dark/70 text-[11px] block mt-0.5">
            {new Date(shareLink.expiresAt).toLocaleString()}
          </span>
        </div>
      </div>

      {/* Reviewer Drive Permissions Notice */}
      <div className="p-4 rounded-2xl bg-brand-soft/40 border border-brand-primary/25 text-xs text-brand-dark/85 space-y-1">
        <div className="flex items-start gap-2.5">
          <svg className="w-5 h-5 text-brand-primary shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <strong className="text-brand-dark block font-bold text-sm">
              Reviewing Manager Google Drive Notice:
            </strong>
            <p className="leading-relaxed mt-0.5">
              All supporting evidence (photos, presentations, certificates, reports) are hosted securely in Google Drive. If a link shows an access permission barrier, please ensure you are logged into your organization Google account or notify the employee to grant viewer access.
            </p>
          </div>
        </div>
      </div>

      {/* Snapshot Summary if provided */}
      {reportSummarySnapshot?.executiveSummary && (
        <div className="p-6 bg-brand-light rounded-2xl border border-brand-primary/25 shadow-xs space-y-3">
          <h2 className="text-base font-bold text-brand-dark flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-brand-primary"></span>
            <span>Executive Appraisal Summary</span>
          </h2>
          <p className="text-xs sm:text-sm text-brand-dark/90 leading-relaxed font-medium">
            {reportSummarySnapshot.executiveSummary}
          </p>
        </div>
      )}

      {/* Events & Initiatives */}
      {events.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-brand-dark">
              Events & Institutional Leadership ({events.length})
            </h2>
          </div>

          <div className="space-y-4">
            {events.map((event) => {
              const evidenceLinks = event.evidenceLinks || [];
              const attachments = event.attachments || [];

              return (
                <div
                  key={event._id}
                  className="p-5 bg-brand-light rounded-2xl border border-brand-primary/25 shadow-xs space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <h3 className="text-base font-bold text-brand-dark">
                      {event.title}
                    </h3>
                    <div className="flex items-center gap-2 text-xs font-semibold">
                      <span className="px-2.5 py-0.5 rounded-full bg-brand-soft text-brand-dark border border-brand-primary/20">
                        {event.eventType}
                      </span>
                      <span className="text-brand-dark/60">
                        {new Date(event.startDate).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-semibold text-brand-dark/80">
                    <p>Role: <strong className="text-brand-dark">{event.myRole}</strong></p>
                    {event.participantsCount > 0 && (
                      <p>Participants: <strong className="text-brand-dark">{event.participantsCount}</strong> attendees</p>
                    )}
                  </div>

                  {event.contributions && (
                    <p className="text-xs text-brand-dark/85 font-medium leading-relaxed">
                      <strong className="text-brand-dark block text-[11px] uppercase tracking-wider">Contributions:</strong>
                      {event.contributions}
                    </p>
                  )}

                  {event.outcomes && (
                    <p className="text-xs text-brand-dark/85 font-medium leading-relaxed">
                      <strong className="text-brand-dark block text-[11px] uppercase tracking-wider">Outcomes & Achievements:</strong>
                      {event.outcomes}
                    </p>
                  )}

                  {/* Google Drive Evidence Links */}
                  {evidenceLinks.length > 0 && (
                    <div className="pt-2.5 border-t border-brand-primary/15 space-y-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-brand-dark/70 block">
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
                                {link.description || link.title || 'Drive Evidence'}
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

                  {/* Legacy Attached Files Chips */}
                  {attachments.length > 0 && (
                    <div className="pt-2 border-t border-brand-primary/10 flex items-center gap-2 flex-wrap">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-brand-dark/70">
                        Files:
                      </span>
                      {attachments.map((att) => {
                        const isCurrentPreview = previewAttachment?.fileId === att.fileId;
                        return (
                          <button
                            key={att.fileId}
                            type="button"
                            onClick={() => setPreviewAttachment(isCurrentPreview ? null : att)}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
                              isCurrentPreview
                                ? 'bg-brand-dark text-brand-light border-brand-dark'
                                : 'bg-brand-soft border border-brand-primary/20 text-brand-dark hover:bg-brand-soft/75'
                            }`}
                          >
                            <span className="truncate max-w-[150px]">{att.originalName}</span>
                            <span className="text-[10px] opacity-70">
                              {isCurrentPreview ? '▲' : '▼'}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Inline Legacy Preview within this card */}
                  {previewAttachment &&
                    attachments.some((a) => a.fileId === previewAttachment.fileId) &&
                    renderLegacyAttachmentPreview(previewAttachment)}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Student Impact */}
      {students.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-brand-dark">
              Student Mentorship Stories ({students.length})
            </h2>
          </div>

          <div className="space-y-4">
            {students.map((student) => {
              const evidenceLinks = student.evidenceLinks || [];
              const attachments = student.attachments || [];

              return (
                <div
                  key={student._id}
                  className="p-5 bg-brand-light rounded-2xl border border-brand-primary/25 shadow-xs space-y-2.5 text-xs font-medium"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-bold text-brand-dark">
                      {student.studentName} {student.studentBatch ? `(${student.studentBatch})` : ''}
                    </h3>
                    <span className="text-brand-dark/60 font-semibold">
                      {new Date(student.date).toLocaleDateString()}
                    </span>
                  </div>

                  <p className="text-brand-dark/85 leading-relaxed">
                    <strong className="text-brand-dark font-bold">Challenge:</strong> {student.initialChallenge}
                  </p>
                  <p className="text-brand-dark/85 leading-relaxed">
                    <strong className="text-brand-dark font-bold">Mentorship Provided:</strong> {student.howIHelped}
                  </p>
                  <p className="p-2.5 rounded-xl bg-brand-soft/40 border border-brand-primary/20 text-brand-dark font-semibold leading-relaxed">
                    <strong className="text-brand-primary font-bold">Documented Outcome:</strong> {student.achievement}
                  </p>

                  {/* Google Drive Evidence Links for Student */}
                  {evidenceLinks.length > 0 && (
                    <div className="pt-2.5 border-t border-brand-primary/15 space-y-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-brand-dark/70 block">
                        Google Drive Proof ({evidenceLinks.length}):
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

                  {/* Legacy Files Chips */}
                  {attachments.length > 0 && (
                    <div className="pt-2 border-t border-brand-primary/10 flex items-center gap-2 flex-wrap">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-brand-dark/70">
                        Files:
                      </span>
                      {attachments.map((att) => {
                        const isCurrentPreview = previewAttachment?.fileId === att.fileId;
                        return (
                          <button
                            key={att.fileId}
                            type="button"
                            onClick={() => setPreviewAttachment(isCurrentPreview ? null : att)}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
                              isCurrentPreview
                                ? 'bg-brand-dark text-brand-light border-brand-dark'
                                : 'bg-brand-soft border border-brand-primary/20 text-brand-dark hover:bg-brand-soft/75'
                            }`}
                          >
                            <span className="truncate max-w-[150px]">{att.originalName}</span>
                            <span className="text-[10px] opacity-70">
                              {isCurrentPreview ? '▲' : '▼'}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Inline Legacy Preview within this card */}
                  {previewAttachment &&
                    attachments.some((a) => a.fileId === previewAttachment.fileId) &&
                    renderLegacyAttachmentPreview(previewAttachment)}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default SharedImpactPortal;
