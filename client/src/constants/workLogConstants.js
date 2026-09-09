export const CATEGORIES = [
  'Teaching',
  'Student Support',
  'Interview',
  'Project Review',
  'Meeting',
  'Documentation',
  'Technical Work',
  'Administrative',
  'Mid Exam',
  'Sem',
  'Other',
];

export const ACTIVITY_TYPES = [
  'Class',
  'Interview',
  'Doubt Clarification',
  'Project Review',
  'Lab',
  'Meeting',
  'Preparation',
  'Follow-up',
  'Other',
];

export const STATUS_OPTIONS = ['Completed', 'In Progress', 'Pending'];

export const PRIORITY_OPTIONS = ['Normal', 'Important', 'Urgent'];

export const DEFAULT_WORK_LOG = {
  date: '',
  task: '',
  category: 'Teaching',
  activityType: 'Class',
  timeFrom: '09:00',
  timeTo: '10:00',
  hallSection: '',
  status: 'Completed',
  priority: 'Normal',
  remarks: '',
};

export const SYNC_STATUSES = {
  SYNCED: 'synced',
  SYNCING: 'syncing',
  PENDING: 'pending',
  FAILED: 'failed',
  LOCAL: 'local',
};
