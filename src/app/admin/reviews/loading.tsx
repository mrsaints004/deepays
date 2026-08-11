export default function ReviewsLoading() {
  return (
    <div className="animate-in">
      <div className="h-7 w-40 rounded-lg bg-card mb-6" />
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="rounded-2xl border border-border bg-white p-5 space-y-3"
          >
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <div className="h-4 w-32 rounded bg-card" />
                <div className="h-4 w-48 rounded bg-card" />
                <div className="h-3 w-24 rounded bg-card" />
              </div>
              <div className="h-8 w-16 rounded-xl bg-card" />
            </div>
            <div className="h-24 rounded-xl bg-card/50" />
            <div className="flex items-center gap-2 justify-end">
              <div className="h-9 w-24 rounded-xl bg-card" />
              <div className="h-9 w-20 rounded-xl bg-card" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
