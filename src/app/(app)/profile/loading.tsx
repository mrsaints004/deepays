export default function ProfileLoading() {
  return (
    <div className="animate-pulse">
      <div className="lg:flex lg:items-start lg:gap-6">
        <div className="flex flex-col items-center pt-4 lg:flex-shrink-0 lg:pt-0">
          <div className="h-[72px] w-[72px] rounded-full bg-card" />
          <div className="mt-3 h-6 w-24 rounded-lg bg-card" />
        </div>
        <div className="mt-6 flex-1 lg:mt-0">
          <div className="rounded-2xl bg-card h-28" />
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-card h-20" />
            <div className="rounded-2xl bg-card h-20" />
          </div>
        </div>
      </div>
      <div className="mt-8">
        <div className="h-4 w-28 rounded bg-card mb-3" />
        <div className="rounded-2xl border border-border bg-white h-24" />
      </div>
      <div className="mt-8">
        <div className="h-4 w-28 rounded bg-card mb-3" />
        <div className="rounded-2xl border border-border bg-white h-24" />
      </div>
    </div>
  );
}
