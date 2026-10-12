import { useState, useEffect } from 'react';
import impactService from '../services/impactService';
import EventsSection from '../components/impact/EventsSection';
import StudentImpactSection from '../components/impact/StudentImpactSection';
import ImpactSummarySection from '../components/impact/ImpactSummarySection';

export const ImpactAchievements = () => {
  const [activeSection, setActiveSection] = useState('events'); // 'events' | 'students' | 'summary'
  const [view, setView] = useState('list'); // 'list' | 'form'
  const [stats, setStats] = useState(null);
  const [notice, setNotice] = useState('');

  // Selected records for appraisal report across tabs
  const [selectedEventIds, setSelectedEventIds] = useState([]);
  const [selectedStudentImpactIds, setSelectedStudentImpactIds] = useState([]);

  const fetchStats = async () => {
    try {
      const res = await impactService.getStats();
      setStats(res.data || null);
    } catch (err) {
      console.error('Failed to fetch impact stats:', err);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  // When changing section, default view to list unless user explicitly clicked Add
  const handleSectionChange = (section) => {
    setActiveSection(section);
    setView('list');
  };

  // Event Selection handlers
  const handleToggleSelectEvent = (id) => {
    setSelectedEventIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

  const handleSelectAllEvents = (pageIds, select) => {
    if (select) {
      setSelectedEventIds((prev) => Array.from(new Set([...prev, ...pageIds])));
    } else {
      setSelectedEventIds((prev) => prev.filter((id) => !pageIds.includes(id)));
    }
  };

  // Student Selection handlers
  const handleToggleSelectStudent = (id) => {
    setSelectedStudentImpactIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

  const handleSelectAllStudents = (pageIds, select) => {
    if (select) {
      setSelectedStudentImpactIds((prev) => Array.from(new Set([...prev, ...pageIds])));
    } else {
      setSelectedStudentImpactIds((prev) => prev.filter((id) => !pageIds.includes(id)));
    }
  };

  const handleClearSelection = () => {
    setSelectedEventIds([]);
    setSelectedStudentImpactIds([]);
  };

  const totalSelectedCount =
    selectedEventIds.length + selectedStudentImpactIds.length;

  const getHeaderMeta = () => {
    if (activeSection === 'events') {
      return {
        subtitle: 'Institutional Leadership & Events',
        title: view === 'form' ? 'Record new initiative' : 'Events & Initiatives',
        description:
          view === 'form'
            ? 'Add workshops, hackathons, and curriculum delivery milestones. Your saved records stay one tap away.'
            : 'Browse and filter your events, track participants, manage proof attachments, and select items for appraisal.',
        btnText: view === 'form' ? 'Show events' : '+ Add event',
      };
    }
    if (activeSection === 'students') {
      return {
        subtitle: 'Direct Mentorship Impact',
        title: view === 'form' ? 'Record student breakthrough' : 'Student Impact',
        description:
          view === 'form'
            ? 'Document 1-on-1 mentorship, technical interventions, and placements. Private by default.'
            : 'Browse your student mentoring stories, view achievements and proofs, and select entries for appraisal.',
        btnText: view === 'form' ? 'Show student records' : '+ Add student record',
      };
    }
    return {
      subtitle: 'Evaluation',
      title: 'Impact Summary',
      description:
        'Synthesize your selected initiatives, student outcomes, and evidence into an official self-appraisal document.',
      btnText: null,
    };
  };

  const headerMeta = getHeaderMeta();
  const pendingSync = stats?.pendingSyncCount || 0;
  const syncStatusText = pendingSync > 0 ? `Pending Sync (${pendingSync})` : 'All Synced';
  const syncColor = pendingSync > 0 ? 'bg-amber-500' : 'bg-emerald-600';

  return (
    <div className="w-full min-w-0 space-y-5 sm:space-y-6 text-left">
      {/* Section Switcher Tabs */}
      <div className="w-full space-y-3">
        {/* Mobile Dropdown (< md) */}
        <div className="w-full md:hidden">
          <label htmlFor="impact-section-select" className="sr-only">
            Choose an Impact section
          </label>
          <select
            id="impact-section-select"
            value={activeSection}
            onChange={(event) => handleSectionChange(event.target.value)}
            className="h-11 w-full rounded-xl border border-brand-primary/40 bg-brand-soft/60 px-3 text-sm font-bold text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-primary/40"
          >
            <option value="events">
              Events &amp; Initiatives{selectedEventIds.length ? ` (${selectedEventIds.length} selected)` : ''}
            </option>
            <option value="students">
              Student Impact{selectedStudentImpactIds.length ? ` (${selectedStudentImpactIds.length} selected)` : ''}
            </option>
            <option value="summary">Impact Summary</option>
          </select>
        </div>

        {/* Desktop Full-Width Segmented Tab Bar (>= md) */}
        <div className="hidden md:flex w-full items-center gap-3">
          <div className="flex-1 grid grid-cols-3 p-0.5 bg-brand-soft/60 rounded-xl border border-brand-primary/40 shadow-xs">
            <button
              type="button"
              onClick={() => handleSectionChange('events')}
              className={`flex items-center justify-center px-4 py-2.5 rounded-lg text-sm lg:text-base font-bold transition-all ${activeSection === 'events'
                ? 'bg-brand-primary text-brand-dark shadow-xs'
                : 'text-brand-dark/70 hover:text-brand-dark'
                }`}
            >
              <span>Events &amp; Initiatives</span>
              {selectedEventIds.length > 0 && (
                <span className="ml-2 px-1.5 py-0.5 rounded-full text-xs font-extrabold bg-brand-dark text-brand-light">
                  {selectedEventIds.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => handleSectionChange('students')}
              className={`flex items-center justify-center px-4 py-2.5 rounded-lg text-sm lg:text-base font-bold transition-all ${activeSection === 'students'
                ? 'bg-brand-primary text-brand-dark shadow-xs'
                : 'text-brand-dark/70 hover:text-brand-dark'
                }`}
            >
              <span>Student Impact</span>
              {selectedStudentImpactIds.length > 0 && (
                <span className="ml-2 px-1.5 py-0.5 rounded-full text-xs font-extrabold bg-brand-dark text-brand-light">
                  {selectedStudentImpactIds.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => handleSectionChange('summary')}
              className={`flex items-center justify-center px-4 py-2.5 rounded-lg text-sm lg:text-base font-bold transition-all ${activeSection === 'summary'
                ? 'bg-brand-primary text-brand-dark shadow-xs'
                : 'text-brand-dark/70 hover:text-brand-dark'
                }`}
            >
              Impact Summary
            </button>
          </div>

          {/* Appraisal Quick Jump Button when items are selected */}
          {totalSelectedCount > 0 && activeSection !== 'summary' && (
            <button
              type="button"
              onClick={() => setActiveSection('summary')}
              className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-brand-dark px-4 py-2.5 text-sm font-bold text-brand-light shadow-xs hover:bg-brand-dark/90 transition-colors"
            >
              <svg className="w-4 h-4 text-brand-light" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>Appraisal ({totalSelectedCount})</span>
            </button>
          )}
        </div>

        {/* Mobile Appraisal Trigger (< md) */}
        {totalSelectedCount > 0 && activeSection !== 'summary' && (
          <div className="block md:hidden">
            <button
              type="button"
              onClick={() => setActiveSection('summary')}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-brand-dark px-4 py-2.5 text-sm font-bold text-brand-light shadow-xs"
            >
              <svg className="w-4 h-4 text-brand-light" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>View Appraisal Report ({totalSelectedCount} Selected)</span>
            </button>
          </div>
        )}
      </div>

      {/* Main Header */}
      <header className="flex flex-wrap items-start justify-between gap-4 rounded-2xl border border-brand-primary/20 bg-brand-light p-4 shadow-xs sm:p-6">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.14em] text-brand-primary">
            {headerMeta.subtitle}
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-brand-dark sm:text-3xl">
            {headerMeta.title}
          </h1>
          <p className="mt-1 max-w-xl text-sm text-brand-dark/70 sm:text-base">
            {headerMeta.description}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {headerMeta.btnText && (
            <button
              type="button"
              onClick={() => setView(view === 'form' ? 'list' : 'form')}
              className="inline-flex items-center gap-2 rounded-lg border border-brand-dark/20 bg-brand-soft/40 px-3 py-2 text-sm font-semibold text-brand-dark transition hover:bg-brand-soft"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16m-7 4h7" />
              </svg>
              <span>{headerMeta.btnText}</span>
            </button>
          )}

          <span className="rounded-full bg-brand-soft px-3 py-2 text-sm font-semibold text-brand-dark">
            <i className={`mr-2 inline-block h-2 w-2 rounded-full ${syncColor}`} />
            {syncStatusText}
          </span>
        </div>
      </header>

      {/* KPI Overview Strip */}
      <section className="rounded-2xl border border-brand-primary/25 bg-brand-light p-4 shadow-xs sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-brand-primary/20 pb-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[.12em] text-brand-dark/60">
              Portfolio metrics
            </p>
            <h2 className="mt-0.5 text-xl font-bold leading-tight tracking-tight text-brand-dark sm:text-2xl">
              Verified Impact Overview
            </h2>
          </div>
          <p className="text-sm font-bold text-brand-dark">
            {stats?.totalEvents || 0} events <span className="mx-2 text-brand-dark/30">|</span> {stats?.totalStudents || 0} students
          </p>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div className="rounded-xl border border-brand-primary/15 bg-brand-soft/25 p-3">
            <p className="text-xs font-semibold text-brand-dark/60">Events &amp; workshops</p>
            <p className="mt-1 text-xl font-bold text-brand-dark">{stats?.totalEvents || 0}</p>
          </div>
          <div className="rounded-xl border border-brand-primary/15 bg-brand-soft/25 p-3">
            <p className="text-xs font-semibold text-brand-dark/60">Participants reached</p>
            <p className="mt-1 text-xl font-bold text-brand-dark">{stats?.totalParticipants || 0}</p>
          </div>
          <div className="rounded-xl border border-brand-primary/15 bg-brand-soft/25 p-3">
            <p className="text-xs font-semibold text-brand-dark/60">Students helped</p>
            <p className="mt-1 text-xl font-bold text-brand-dark">{stats?.totalStudents || 0}</p>
          </div>
          <div className="rounded-xl border border-brand-primary/15 bg-brand-soft/25 p-3">
            <p className="text-xs font-semibold text-brand-dark/60">Attached proofs</p>
            <p className="mt-1 text-xl font-bold text-brand-dark">{stats?.totalEvidenceFiles || 0} files</p>
          </div>
        </div>
      </section>

      {/* Active Section Content */}
      {activeSection === 'events' && (
        <EventsSection
          view={view}
          onToggleView={setView}
          selectedIds={selectedEventIds}
          onToggleSelect={handleToggleSelectEvent}
          onSelectAll={handleSelectAllEvents}
          onNotice={(msg) => {
            setNotice(msg);
            fetchStats();
          }}
        />
      )}

      {activeSection === 'students' && (
        <StudentImpactSection
          view={view}
          onToggleView={setView}
          selectedIds={selectedStudentImpactIds}
          onToggleSelect={handleToggleSelectStudent}
          onSelectAll={handleSelectAllStudents}
          onNotice={(msg) => {
            setNotice(msg);
            fetchStats();
          }}
        />
      )}

      {activeSection === 'summary' && (
        <ImpactSummarySection
          selectedEventIds={selectedEventIds}
          selectedStudentImpactIds={selectedStudentImpactIds}
          onClearSelection={handleClearSelection}
          onNotice={setNotice}
        />
      )}

      {/* Floating Notice Banner */}
      {notice && (
        <div
          role="status"
          className="fixed bottom-5 right-5 z-40 max-w-[calc(100vw-2.5rem)] rounded-lg bg-brand-dark px-4 py-3 text-sm font-semibold text-brand-light shadow-lg flex items-center justify-between gap-3"
        >
          <span>{notice}</span>
          <button
            type="button"
            className="ml-3 text-brand-light/70 hover:text-brand-light text-lg font-bold"
            onClick={() => setNotice('')}
            aria-label="Dismiss notification"
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
};

export default ImpactAchievements;