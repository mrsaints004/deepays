export default function PayoutsLoading() {
  return (
    <div className="animate-pulse">
      <div className="flex items-center justify-between mb-6">
        <div className="h-7 w-20 rounded-lg bg-card" />
        <div className="flex gap-2">
          <div className="h-9 w-36 rounded-xl bg-card" />
          <div className="h-9 w-20 rounded-xl bg-card" />
        </div>
      </div>
      <div className="rounded-2xl border border-border overflow-hidden">
        <div className="bg-card/50 h-10 border-b border-border" />
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-14 border-b border-border bg-white" />
        ))}
      </div>
    </div>
  );
}
