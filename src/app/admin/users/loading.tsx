export default function UsersLoading() {
  return (
    <div className="animate-pulse">
      <div className="h-7 w-28 rounded-lg bg-card mb-6" />
      <div className="h-10 rounded-xl border border-border bg-white mb-4" />
      <div className="rounded-2xl border border-border overflow-hidden">
        <div className="bg-card/50 h-10 border-b border-border" />
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-14 border-b border-border bg-white" />
        ))}
      </div>
    </div>
  );
}
