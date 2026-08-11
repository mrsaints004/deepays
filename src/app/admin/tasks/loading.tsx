export default function TasksLoading() {
  return (
    <div className="animate-pulse">
      <div className="flex items-center justify-between mb-6">
        <div className="h-7 w-16 rounded-lg bg-card" />
        <div className="h-9 w-24 rounded-xl bg-card" />
      </div>
      <div className="rounded-2xl border border-border overflow-hidden">
        <div className="bg-card/50 h-10 border-b border-border" />
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-16 border-b border-border bg-white" />
        ))}
      </div>
    </div>
  );
}
