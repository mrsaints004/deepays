export default function EarnLoading() {
  return (
    <div className="animate-pulse">
      <div className="mb-6">
        <div className="h-7 w-16 rounded-lg bg-card" />
        <div className="mt-2 h-4 w-48 rounded-lg bg-card" />
      </div>
      {/* Progress bar skeleton */}
      <div className="mb-6 rounded-2xl bg-card p-4">
        <div className="flex justify-between mb-2">
          <div className="h-4 w-32 rounded bg-border" />
          <div className="h-4 w-16 rounded bg-border" />
        </div>
        <div className="h-2 rounded-full bg-border" />
      </div>
      {/* Filter tabs skeleton */}
      <div className="flex gap-1.5 mb-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-8 w-20 rounded-xl bg-card" />
        ))}
      </div>
      {/* Task cards skeleton */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-2xl border border-border bg-white p-4">
            <div className="flex justify-between gap-3">
              <div className="flex-1">
                <div className="h-5 w-3/4 rounded bg-card" />
                <div className="mt-2 h-4 w-full rounded bg-card" />
              </div>
              <div className="h-8 w-16 rounded-xl bg-card" />
            </div>
            <div className="mt-3 flex gap-2">
              <div className="h-9 w-24 rounded-xl bg-card" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
