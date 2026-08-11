export default function AdminLoading() {
  return (
    <div className="animate-pulse">
      <div className="h-7 w-28 rounded-lg bg-card mb-6" />
      <div className="grid grid-cols-2 gap-4 mb-8 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-2xl bg-card p-5 h-20" />
        ))}
      </div>
      <div className="h-4 w-28 rounded bg-card mb-3" />
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-xl border border-border bg-white p-4 h-16" />
        ))}
      </div>
    </div>
  );
}
