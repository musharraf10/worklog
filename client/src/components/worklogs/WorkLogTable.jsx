import { useState, useMemo } from 'react';
import WorkLogGroup from './WorkLogGroup';
import EmptyState from '../common/EmptyState';
import { groupLogsByDate } from '../../utils/dateUtils';

export const WorkLogTable = ({
  logs = [],
  onSave,
  onDelete,
  activeDateKey = null,
}) => {
  // Group logs by date
  const dateGroups = useMemo(() => {
    return groupLogsByDate(logs);
  }, [logs]);

  // Sets of keys explicitly expanded or collapsed by user
  const [manualExpanded, setManualExpanded] = useState(() => new Set());
  const [manualCollapsed, setManualCollapsed] = useState(() => new Set());

  // Determine if a date is currently expanded
  const isGroupExpanded = (dateKey) => {
    if (manualCollapsed.has(dateKey)) return false;
    if (manualExpanded.has(dateKey)) return true;
    if (dateKey === activeDateKey) return true;
    if (dateGroups.length === 1) return true;
    return false;
  };

  const toggleGroup = (dateKey) => {
    const currentlyExpanded = isGroupExpanded(dateKey);
    if (currentlyExpanded) {
      setManualCollapsed((prev) => new Set(prev).add(dateKey));
      setManualExpanded((prev) => {
        const next = new Set(prev);
        next.delete(dateKey);
        return next;
      });
    } else {
      setManualExpanded((prev) => new Set(prev).add(dateKey));
      setManualCollapsed((prev) => {
        const next = new Set(prev);
        next.delete(dateKey);
        return next;
      });
    }
  };

  const allExpanded =
    dateGroups.length > 0 &&
    dateGroups.every((g) => isGroupExpanded(g.dateKey));

  const handleToggleAll = () => {
    if (allExpanded) {
      setManualExpanded(new Set());
      setManualCollapsed(new Set(dateGroups.map((g) => g.dateKey)));
    } else {
      setManualCollapsed(new Set());
      setManualExpanded(new Set(dateGroups.map((g) => g.dateKey)));
    }
  };

  if (dateGroups.length === 0) {
    return (
      <EmptyState
        title="No work logs found"
        description="There are no entries for the selected filters."
      />
    );
  }

  return (
    <div className="space-y-3 text-left">
      {/* Accordion Controls Bar */}
      {dateGroups.length > 1 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1 text-sm text-brand-dark/75 pb-1">
          <span className="font-medium">
            {dateGroups.length} date groups — click any date to view its tasks
          </span>
          <button
            type="button"
            onClick={handleToggleAll}
            className="self-start sm:self-auto font-semibold text-brand-dark hover:underline px-3.5 py-1.5 rounded-lg bg-brand-soft/50 hover:bg-brand-soft text-sm transition-colors"
          >
            {allExpanded ? 'Collapse All Dates' : 'Expand All Dates'}
          </button>
        </div>
      )}

      {/* Accordion Date Groups */}
      <div className="space-y-4">
        {dateGroups.map((group) => (
          <WorkLogGroup
            key={group.dateKey}
            group={group}
            isExpanded={isGroupExpanded(group.dateKey)}
            onToggle={() => toggleGroup(group.dateKey)}
            onSave={onSave}
            onDelete={onDelete}
          />
        ))}
      </div>
    </div>
  );
};

export default WorkLogTable;
