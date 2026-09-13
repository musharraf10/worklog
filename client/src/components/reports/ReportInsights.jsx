import { formatDate } from '../../utils/dateUtils';
import { formatMinutes } from '../../utils/timeUtils';

export const ReportInsights = ({ reportData }) => {
  const dailyData = reportData?.dailySummary || [];
  const totalMinutes = reportData?.totalWorkedMinutes || 0;
  const activeDays = dailyData.length;
  const averageMinutes = activeDays ? Math.round(totalMinutes / activeDays) : 0;
  const peakDay = dailyData.reduce((peak, day) => (!peak || (day.workedMinutes || 0) > (peak.workedMinutes || 0) ? day : peak), null);
  const completed = (reportData?.statusSummary || []).find(item => item.status === 'Completed')?.tasks || 0;
  const completionRate = reportData?.totalTasks ? Math.round((completed / reportData.totalTasks) * 100) : 0;
  const maxMinutes = Math.max(...dailyData.map(day => day.workedMinutes || 0), 1);
  const chartWidth = 640; const chartHeight = 220; const baseline = 178; const chartTop = 28; const chartHeightAvailable = baseline - chartTop; const barGap = 12; const barWidth = Math.max(18, (chartWidth - 64 - Math.max(0, dailyData.length - 1) * barGap) / Math.max(dailyData.length, 1));

  return <section className="space-y-4">
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <div className="rounded-2xl border border-brand-primary/25 bg-brand-light p-5 shadow-xs"><p className="text-xs font-bold uppercase tracking-wide text-brand-dark/65">Average active day</p><p className="mt-2 text-2xl font-bold text-brand-dark">{formatMinutes(averageMinutes)}</p><p className="mt-1 text-sm text-brand-dark/65">Across {activeDays} active {activeDays === 1 ? 'day' : 'days'}</p></div>
      <div className="rounded-2xl border border-brand-primary/25 bg-brand-light p-5 shadow-xs"><p className="text-xs font-bold uppercase tracking-wide text-brand-dark/65">Most productive day</p><p className="mt-2 text-2xl font-bold text-brand-dark">{peakDay ? formatMinutes(peakDay.workedMinutes) : '—'}</p><p className="mt-1 text-sm text-brand-dark/65">{peakDay ? formatDate(peakDay.date, true) : 'No entries yet'}</p></div>
      <div className="rounded-2xl border border-brand-primary/25 bg-brand-light p-5 shadow-xs"><p className="text-xs font-bold uppercase tracking-wide text-brand-dark/65">Completed tasks</p><p className="mt-2 text-2xl font-bold text-brand-dark">{completionRate}%</p><p className="mt-1 text-sm text-brand-dark/65">{completed} of {reportData?.totalTasks || 0} tasks</p></div>
    </div>
    <div className="rounded-2xl border border-brand-primary/25 bg-brand-light p-4 shadow-xs sm:p-6"><div className="flex flex-wrap items-end justify-between gap-2 border-b border-brand-primary/20 pb-3.5"><div><h3 className="text-lg font-bold text-brand-dark">Work time trend</h3><p className="mt-1 text-sm text-brand-dark/70">Daily logged minutes for this period</p></div>{peakDay && <p className="text-sm font-semibold text-brand-dark">Peak: {formatMinutes(peakDay.workedMinutes)}</p>}</div>{dailyData.length ? <div className="mt-4 overflow-x-auto"><svg className="min-w-[360px] w-full" viewBox={`0 0 ${chartWidth} ${chartHeight}`} role="img" aria-label="Bar chart showing logged work time by day"><title>Daily work time trend</title><line x1="40" x2={chartWidth - 18} y1={baseline} y2={baseline} className="stroke-brand-primary/25" strokeWidth="1"/>{dailyData.map((day, index) => { const height = Math.max(3, ((day.workedMinutes || 0) / maxMinutes) * chartHeightAvailable); const x = 46 + index * (barWidth + barGap); const y = baseline - height; return <g key={day.date}><title>{`${formatDate(day.date, true)}: ${formatMinutes(day.workedMinutes)}`}</title><rect x={x} y={y} width={barWidth} height={height} rx="5" className="fill-brand-primary"/><text x={x + barWidth / 2} y={baseline + 18} textAnchor="middle" className="fill-brand-dark/70 text-[11px]">{new Date(`${day.date}T00:00:00`).toLocaleDateString(undefined, { weekday: 'short' })}</text><text x={x + barWidth / 2} y={Math.max(16, y - 7)} textAnchor="middle" className="fill-brand-dark text-[11px] font-semibold">{formatMinutes(day.workedMinutes)}</text></g>; })}</svg></div> : <p className="py-10 text-center text-sm text-brand-dark/65">No work time is available for this period.</p>}</div>
  </section>;
};

export default ReportInsights;
