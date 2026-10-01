import { useState, useMemo } from 'react';
import { formatDate } from '../../utils/dateUtils';
import { formatMinutes } from '../../utils/timeUtils';

export const DailyWorkedTimeChart = ({ year, month, dailyData = [] }) => {
  const [hoveredDay, setHoveredDay] = useState(null);

  const daysInMonth = useMemo(() => {
    if (!year || !month) return 30;
    return new Date(year, month, 0).getDate();
  }, [year, month]);

  const { monthDays, maxMinutes, yAxisMaxMinutes, yTicks, peakDay } = useMemo(() => {
    const dayMap = new Map((dailyData || []).map((d) => [d.date, d]));
    const days = [];
    let highest = 0;
    let peak = null;

    for (let day = 1; day <= daysInMonth; day++) {
      const dateKey = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const entry = dayMap.get(dateKey);
      const minutes = entry?.workedMinutes || 0;
      const tasks = entry?.totalTasks || 0;
      const hours = entry?.workedHours || (minutes > 0 ? formatMinutes(minutes) : '0m');

      const dayObj = {
        day,
        date: dateKey,
        workedMinutes: minutes,
        workedHours: hours,
        tasks,
      };

      days.push(dayObj);

      if (minutes > highest) {
        highest = minutes;
        peak = dayObj;
      }
    }

    // Determine clean Y-axis scale based on max daily hours
    const maxHours = Math.max(Math.ceil(highest / 60), 2);
    let stepHours = 2;
    if (maxHours <= 4) stepHours = 1;
    else if (maxHours <= 8) stepHours = 2;
    else if (maxHours <= 12) stepHours = 3;
    else stepHours = 4;

    const yMaxHours = Math.ceil(maxHours / stepHours) * stepHours;
    const ticks = [];
    for (let h = stepHours; h <= yMaxHours; h += stepHours) {
      ticks.push(h);
    }

    return {
      monthDays: days,
      maxMinutes: highest,
      yAxisMaxMinutes: yMaxHours * 60,
      yTicks: ticks,
      peakDay: peak,
    };
  }, [year, month, daysInMonth, dailyData]);

  if (!dailyData || dailyData.length === 0) {
    return (
      <div className="bg-brand-light border border-brand-primary/25 rounded-2xl p-6 shadow-xs text-center">
        <h3 className="text-lg sm:text-xl font-bold text-brand-dark mb-1">Daily Worked Time</h3>
        <p className="text-sm text-brand-dark/70">No daily records logged for this month.</p>
      </div>
    );
  }

  const svgWidth = 760;
  const svgHeight = 250;
  const padLeft = 45;
  const padRight = 18;
  const padTop = 30;
  const padBottom = 42;
  const chartW = svgWidth - padLeft - padRight;
  const chartH = svgHeight - padTop - padBottom;
  const slotW = chartW / daysInMonth;
  const barW = Math.max(10, Math.min(18, slotW - 5));

  const activeDisplay = hoveredDay || peakDay;

  return (
    <section className="bg-brand-light border border-brand-primary/25 rounded-2xl p-5 sm:p-6 shadow-xs text-left">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-brand-primary/20 pb-3.5 mb-4">
        <div>
          <h3 className="text-lg sm:text-xl font-bold text-brand-dark">Daily Worked Time</h3>
          <p className="mt-1 text-sm text-brand-dark/75">
            Workload distribution across each calendar day of the month
          </p>
        </div>

        {activeDisplay && (
          <div className="px-3.5 py-1.5 rounded-xl bg-brand-soft border border-brand-primary/30 text-xs sm:text-sm font-semibold text-brand-dark">
            <span className="text-brand-dark/70">
              {hoveredDay ? 'Selected: ' : 'Peak Day: '}
            </span>
            <span className="font-bold text-brand-primary">
              {formatDate(activeDisplay.date, true)}
            </span>
            <span className="mx-1.5 text-brand-dark/40">•</span>
            <span className="font-extrabold">{activeDisplay.workedHours}</span>
            {activeDisplay.tasks > 0 && (
              <span className="ml-1 text-brand-dark/70">
                ({activeDisplay.tasks} {activeDisplay.tasks === 1 ? 'task' : 'tasks'})
              </span>
            )}
          </div>
        )}
      </div>

      <div className="w-full overflow-hidden">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-auto select-none"
          role="img"
          aria-label="Bar chart showing daily worked hours across the month"
        >
          {/* Y-axis reference lines and labels */}
          <line
            x1={padLeft}
            x2={svgWidth - padRight}
            y1={padTop + chartH}
            y2={padTop + chartH}
            stroke="currentColor"
            className="stroke-brand-dark/20"
            strokeWidth="1.2"
          />

          <text
            x={padLeft - 10}
            y={padTop + chartH + 4}
            textAnchor="end"
            className="fill-brand-dark/60 text-[10px] sm:text-[11px] font-semibold"
          >
            0h
          </text>

          {yTicks.map((h) => {
            const y = padTop + chartH - ((h * 60) / yAxisMaxMinutes) * chartH;
            return (
              <g key={h}>
                <line
                  x1={padLeft}
                  x2={svgWidth - padRight}
                  y1={y}
                  y2={y}
                  stroke="currentColor"
                  className="stroke-brand-dark/10"
                  strokeDasharray="4 4"
                  strokeWidth="1"
                />
                <text
                  x={padLeft - 10}
                  y={y + 4}
                  textAnchor="end"
                  className="fill-brand-dark/65 text-[10px] sm:text-[11px] font-semibold"
                >
                  {h}h
                </text>
              </g>
            );
          })}

          {/* Daily bars */}
          {monthDays.map((d) => {
            const x = padLeft + (d.day - 1) * slotW + (slotW - barW) / 2;
            const hasWork = d.workedMinutes > 0;
            const barH = hasWork
              ? Math.max(4, (d.workedMinutes / yAxisMaxMinutes) * chartH)
              : 2;
            const y = padTop + chartH - barH;
            const isHovered = hoveredDay?.day === d.day;
            const isPeak = peakDay?.day === d.day && d.workedMinutes > 0;

            let barFill = 'fill-brand-primary';
            if (isPeak) {
              barFill = 'fill-brand-dark';
            } else if (isHovered) {
              barFill = 'fill-brand-primary/80';
            }

            return (
              <g
                key={d.day}
                onMouseEnter={() => setHoveredDay(d)}
                onMouseLeave={() => setHoveredDay(null)}
                onClick={() => setHoveredDay(d)}
                className="cursor-pointer transition-opacity"
              >
                <title>{`${formatDate(d.date, true)}\nTasks: ${d.tasks}\nWorked Hours: ${d.workedHours}`}</title>

                {/* Transparent hit area for easy hover/tap */}
                <rect
                  x={padLeft + (d.day - 1) * slotW}
                  y={padTop}
                  width={slotW}
                  height={chartH + padBottom}
                  fill="transparent"
                />

                {/* The actual bar */}
                <rect
                  x={x}
                  y={y}
                  width={barW}
                  height={barH}
                  rx={hasWork ? '4' : '1'}
                  className={hasWork ? barFill : 'fill-brand-dark/15'}
                />

                {/* X-axis date tick */}
                <text
                  x={x + barW / 2}
                  y={padTop + chartH + 18}
                  textAnchor="middle"
                  className={`text-[10px] font-medium ${
                    isHovered || isPeak
                      ? 'fill-brand-dark font-bold'
                      : hasWork
                      ? 'fill-brand-dark/80'
                      : 'fill-brand-dark/40'
                  }`}
                >
                  {d.day}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <div className="mt-3 flex items-center justify-between text-xs text-brand-dark/65 px-1 border-t border-brand-primary/10 pt-2.5">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <i className="inline-block w-3 h-3 rounded-xs bg-brand-primary" /> Logged Days
          </span>
          <span className="flex items-center gap-1.5">
            <i className="inline-block w-3 h-3 rounded-xs bg-brand-dark" /> Peak Day
          </span>
        </div>
        <span className="text-[11px] sm:text-xs text-brand-dark/60">
          Showing 1 – {daysInMonth} {new Date(year, month - 1, 1).toLocaleDateString(undefined, { month: 'short' })}
        </span>
      </div>
    </section>
  );
};

export default DailyWorkedTimeChart;
