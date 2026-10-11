import { useState } from 'react';
import Input from '../common/Input';
import Button from '../common/Button';

export const classifyDriveUrl = (url = '', description = '') => {
  const trimmed = url.trim();
  if (!trimmed) {
    return { isValid: false, error: 'URL is required' };
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return { isValid: false, error: 'URL must start with http:// or https://' };
    }
  } catch {
    return {
      isValid: false,
      error: 'Please enter a valid URL (e.g. https://drive.google.com/...)',
    };
  }

  const lower = trimmed.toLowerCase();
  let driveType = 'other';
  let title = description ? description.trim() : '';

  if (
    lower.includes('drive.google.com/drive/folders/') ||
    lower.includes('drive.google.com/folders/') ||
    lower.includes('drive.google.com/drive/u/')
  ) {
    driveType = 'folder';
    if (!title) title = 'Google Drive Folder';
  } else if (lower.includes('docs.google.com/document/')) {
    driveType = 'docs';
    if (!title) title = 'Google Doc';
  } else if (lower.includes('docs.google.com/spreadsheets/')) {
    driveType = 'sheets';
    if (!title) title = 'Google Sheet';
  } else if (lower.includes('docs.google.com/presentation/')) {
    driveType = 'slides';
    if (!title) title = 'Google Slides';
  } else if (
    lower.includes('drive.google.com/file/') ||
    lower.includes('drive.google.com/open') ||
    lower.includes('drive.google.com/uc')
  ) {
    driveType = 'file';
    if (!title) title = 'Google Drive File';
  } else if (lower.includes('drive.google.com')) {
    driveType = 'folder';
    if (!title) title = 'Google Drive';
  } else {
    driveType = 'other';
    if (!title) title = 'Web Evidence Link';
  }

  const isGoogleDrive =
    lower.includes('drive.google.com') || lower.includes('docs.google.com');

  return {
    isValid: true,
    url: trimmed,
    description: description ? description.trim() : '',
    title,
    driveType,
    isGoogleDrive,
  };
};

export const GoogleDriveEvidenceSection = ({
  links = [],
  onChange,
  readOnly = false,
  showNotice = true,
}) => {
  const [newUrl, setNewUrl] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [validationError, setValidationError] = useState('');
  const [editingIndex, setEditingIndex] = useState(null);
  const [editUrl, setEditUrl] = useState('');
  const [editDescription, setEditDescription] = useState('');

  const handleAddLink = () => {
    setValidationError('');
    const classified = classifyDriveUrl(newUrl, newDescription);

    if (!classified.isValid) {
      setValidationError(classified.error);
      return;
    }

    const updated = [
      ...links,
      {
        url: classified.url,
        description: newDescription.trim(),
        title: classified.title,
        driveType: classified.driveType,
        addedAt: new Date().toISOString(),
      },
    ];

    onChange(updated);
    setNewUrl('');
    setNewDescription('');
    setValidationError('');
  };

  const handleRemoveLink = (index) => {
    const updated = links.filter((_, i) => i !== index);
    onChange(updated);
    if (editingIndex === index) {
      setEditingIndex(null);
    }
  };

  const handleStartEdit = (index) => {
    setEditingIndex(index);
    setEditUrl(links[index].url || '');
    setEditDescription(links[index].description || '');
  };

  const handleSaveEdit = (index) => {
    const classified = classifyDriveUrl(editUrl, editDescription);
    if (!classified.isValid) {
      setValidationError(classified.error);
      return;
    }

    const updated = [...links];
    updated[index] = {
      ...updated[index],
      url: classified.url,
      description: editDescription.trim(),
      title: classified.title,
      driveType: classified.driveType,
    };

    onChange(updated);
    setEditingIndex(null);
    setValidationError('');
  };

  const renderDriveIcon = (type) => {
    switch (type) {
      case 'folder':
        return (
          <svg className="w-4 h-4 text-amber-700 shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
          </svg>
        );
      case 'sheets':
        return (
          <svg className="w-4 h-4 text-emerald-700 shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" />
          </svg>
        );
      case 'docs':
        return (
          <svg className="w-4 h-4 text-blue-700 shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
          </svg>
        );
      case 'slides':
        return (
          <svg className="w-4 h-4 text-amber-600 shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
          </svg>
        );
      default:
        return (
          <svg className="w-4 h-4 text-brand-primary shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
        );
    }
  };

  return (
    <div className="space-y-3.5 text-left">
      <div className="flex items-center justify-between">
        <label className="text-sm font-bold text-brand-dark flex items-center gap-2">
          <span>Google Drive Evidence & Documentation</span>
          {links.length > 0 && (
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold bg-brand-soft text-brand-dark border border-brand-primary/20">
              {links.length}
            </span>
          )}
        </label>
      </div>

      {/* Permissions & Privacy Helper Notice */}
      {showNotice && (
        <div className="p-3 sm:p-3.5 rounded-xl bg-brand-soft/40 border border-brand-primary/20 text-xs text-brand-dark/85">
          <div className="flex items-start gap-2.5">
            <svg className="w-4 h-4 text-brand-primary shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="min-w-0 flex-1">
              <strong className="text-brand-dark block font-bold">
                Google Drive Permissions & Privacy Guidance:
              </strong>
              <p className="leading-relaxed mt-0.5">
                Upload your evidence files to Google Drive and paste the shared link below. Make sure link permissions allow viewing (e.g., <em>&quot;Anyone with the link can view&quot;</em> or shared directly with your manager&apos;s email). Keep your root folders private and share only the specific evidence required for appraisal.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Existing Evidence Links List */}
      {links.length > 0 && (
        <div className="space-y-2.5">
          {links.map((link, idx) => {
            const isEditing = editingIndex === idx;

            if (isEditing) {
              return (
                <div
                  key={idx}
                  className="p-3.5 rounded-xl bg-brand-soft/50 border border-brand-primary/30 space-y-3"
                >
                  <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,2fr)_minmax(0,1.2fr)] gap-3 items-start">
                    <div className="min-w-0 w-full">
                      <Input
                        label="Edit Evidence URL"
                        type="url"
                        value={editUrl}
                        onChange={(e) => setEditUrl(e.target.value)}
                        placeholder="https://drive.google.com/..."
                        required
                      />
                    </div>
                    <div className="min-w-0 w-full">
                      <Input
                        label="Edit Description (Optional)"
                        type="text"
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        placeholder="e.g. Workshop Photos Folder, Completion Certificate"
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-end gap-2 pt-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setEditingIndex(null)}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      onClick={() => handleSaveEdit(idx)}
                    >
                      Save Changes
                    </Button>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={idx}
                className="p-3 sm:p-3.5 rounded-xl bg-brand-light border border-brand-primary/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs"
              >
                <div className="flex items-start gap-2.5 min-w-0 flex-1">
                  <div className="p-2 rounded-lg bg-brand-soft/70 mt-0.5 shrink-0">
                    {renderDriveIcon(link.driveType)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-brand-dark truncate max-w-full">
                        {link.description || link.title || 'Google Drive Evidence'}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase bg-brand-soft text-brand-dark/80 border border-brand-primary/15">
                        {link.driveType || 'Drive'}
                      </span>
                    </div>
                    <p className="text-xs text-brand-dark/65 font-mono truncate mt-0.5">
                      {link.url}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  {/* Open in Drive Button */}
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-brand-primary text-brand-light hover:bg-brand-primary/90 transition-all shadow-2xs"
                  >
                    <span>Open in Drive</span>
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>

                  {!readOnly && (
                    <>
                      <button
                        type="button"
                        onClick={() => handleStartEdit(idx)}
                        className="px-2 py-1 text-xs font-semibold text-brand-dark/70 hover:text-brand-dark hover:underline"
                        title="Edit link"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveLink(idx)}
                        className="px-2 py-1 text-xs font-semibold text-red-700 hover:text-red-900 hover:underline"
                        title="Remove link"
                      >
                        Remove
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add New Link Form (Inline, no popups) */}
      {!readOnly && (
        <div className="p-3.5 sm:p-4 rounded-xl bg-brand-soft/25 border border-brand-primary/20 space-y-3">
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,2fr)_minmax(0,1.2fr)] gap-3 items-start">
            <div className="min-w-0 w-full">
              <Input
                label="Google Drive URL / Shared Link"
                type="url"
                value={newUrl}
                onChange={(e) => {
                  setNewUrl(e.target.value);
                  if (validationError) setValidationError('');
                }}
                placeholder="https://drive.google.com/drive/folders/... or /file/d/..."
              />
            </div>
            <div className="min-w-0 w-full">
              <Input
                label="Description / Label (Optional)"
                type="text"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="e.g. Workshop Photos, Participant Certificates PDF"
              />
            </div>
          </div>

          {validationError && (
            <p className="text-xs text-red-600 font-semibold">{validationError}</p>
          )}

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-1">
            <span className="text-[11px] text-brand-dark/65 font-medium">
              Supports Google Drive folders, files, Docs, Sheets, and Slides.
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddLink}
              disabled={!newUrl.trim()}
              className="self-end sm:self-auto shrink-0"
              icon={
                <svg className="w-3.5 h-3.5 text-brand-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                </svg>
              }
            >
              Add Drive Link
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default GoogleDriveEvidenceSection;
