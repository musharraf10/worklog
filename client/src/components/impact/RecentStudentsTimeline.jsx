import { formatDate } from '../../utils/dateUtils';

export const RecentStudentsTimeline = ({ students = [] }) => {
  return (
    <section className="rounded-2xl border border-brand-primary/25 bg-brand-light p-4 shadow-xs sm:p-5 text-left">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.12em] text-brand-primary">
            Mentorship records
          </p>
          <h2 className="mt-1 text-lg font-bold text-brand-dark">
            Student breakthroughs
          </h2>
        </div>
        <span className="rounded-full bg-brand-soft px-3 py-1 text-sm font-bold text-brand-dark">
          {students.length} {students.length === 1 ? 'student' : 'students'}
        </span>
      </div>

      {students.length > 0 ? (
        <div className="relative mt-5 space-y-4 before:absolute before:bottom-2 before:left-[13px] before:top-2 before:w-px before:bg-brand-primary/25">
          {students.slice(0, 5).map((student) => (
            <div key={student._id} className="relative flex gap-3">
              <span className="relative z-10 mt-1 h-[27px] w-[27px] shrink-0 rounded-full border-[5px] border-brand-light bg-brand-primary" />
              <div className="min-w-0 flex-1 rounded-xl bg-brand-soft/25 px-3 py-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-bold text-brand-dark text-sm truncate">
                    {student.studentName}
                  </p>
                  <span className="text-xs font-bold text-brand-dark/70">
                    {formatDate(student.date)}
                  </span>
                </div>
                <p className="mt-1 text-xs text-brand-dark/65 font-medium truncate">
                  {student.achievement}
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-5 rounded-xl border border-dashed border-brand-primary/25 py-8 text-center text-sm text-brand-dark/65">
          No student impact recorded yet. Your new entries will appear here.
        </div>
      )}
    </section>
  );
};

export default RecentStudentsTimeline;
