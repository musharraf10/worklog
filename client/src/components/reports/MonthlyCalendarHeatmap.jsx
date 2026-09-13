import { formatMinutes } from '../../utils/timeUtils';

const getDateKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

export const MonthlyCalendarHeatmap = ({ year, month, dailyData = [] }) => {
  const minutesByDate = new Map(dailyData.map(day => [day.date, day.workedMinutes || 0]));
  const firstDay = new Date(year, month - 1, 1);
  const daysInMonth = new Date(year, month, 0).getDate();
  const maxMinutes = Math.max(...dailyData.map(day => day.workedMinutes || 0), 1);
  const cells = Array.from({ length: firstDay.getDay() + daysInMonth }, (_, index) => index < firstDay.getDay() ? null : index - firstDay.getDay() + 1);
  while (cells.length % 7) cells.push(null);
  const intensity = minutes => minutes === 0 ? 'bg-brand-soft/20 text-brand-dark/45' : minutes / maxMinutes < 0.34 ? 'bg-brand-primary/25 text-brand-dark' : minutes / maxMinutes < 0.67 ? 'bg-brand-primary/55 text-brand-dark' : 'bg-brand-dark text-brand-light';

  return <section className="rounded-2xl border border-brand-primary/25 bg-brand-light p-4 shadow-xs sm:p-6"><div className="flex flex-wrap items-end justify-between gap-3 border-b border-brand-primary/20 pb-3.5"><div><h3 className="text-lg font-bold text-brand-dark">Monthly calendar heatmap</h3><p className="mt-1 text-sm text-brand-dark/70">Darker dates represent more logged work time.</p></div><div className="flex items-center gap-1.5 text-xs font-semibold text-brand-dark/70"><span>Less</span><i className="h-4 w-4 rounded bg-brand-soft/20"/><i className="h-4 w-4 rounded bg-brand-primary/25"/><i className="h-4 w-4 rounded bg-brand-primary/55"/><i className="h-4 w-4 rounded bg-brand-dark"/><span>More</span></div></div><div className="mt-4 grid grid-cols-7 gap-1.5 sm:gap-2"><>{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => <span key={day} className="text-center text-[10px] font-bold uppercase tracking-wide text-brand-dark/60 sm:text-xs">{day}</span>)}</>{cells.map((day, index) => { if (!day) return <div key={`empty-${index}`} aria-hidden="true"/>; const dateKey = getDateKey(new Date(year, month - 1, day)); const minutes = minutesByDate.get(dateKey) || 0; return <div key={dateKey} title={`${dateKey}: ${formatMinutes(minutes)}`} className={`aspect-square min-h-9 rounded-lg p-1.5 transition-colors sm:p-2 ${intensity(minutes)}`}><span className="block text-xs font-bold sm:text-sm">{day}</span><span className="hidden text-[10px] font-medium sm:block">{minutes ? formatMinutes(minutes) : '—'}</span></div>; })}</div></section>;
};

export default MonthlyCalendarHeatmap;
