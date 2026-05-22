export default function AdminLoading() {
  return (
    <div className="space-y-6">
      {/* Page header skeleton */}
      <div className="space-y-2">
        <div className="h-7 w-48 rounded-xl bg-muted animate-pulse" />
        <div className="h-4 w-80 rounded-lg bg-muted animate-pulse opacity-60" />
      </div>

      {/* Stat cards skeleton */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="rounded-2xl border border-border/70 bg-card p-6 shadow-card"
            style={{ animationDelay: `${i * 80}ms` }}
          >
            <div className="flex items-start justify-between">
              <div className="h-3 w-24 rounded-full bg-muted animate-pulse" />
              <div className="h-2.5 w-2.5 rounded-full bg-muted animate-pulse" />
            </div>
            <div className="mt-5 h-8 w-28 rounded-xl bg-muted animate-pulse" />
            <div className="mt-4 h-5 w-20 rounded-full bg-muted animate-pulse opacity-60" />
          </div>
        ))}
      </div>

      {/* Main content skeleton */}
      <div className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
        {/* Activity list */}
        <div className="rounded-2xl border border-border/70 bg-card p-6 shadow-card">
          <div className="mb-6 space-y-2">
            <div className="h-3 w-28 rounded-full bg-muted animate-pulse" />
            <div className="h-6 w-64 rounded-xl bg-muted animate-pulse" />
          </div>
          <div className="space-y-3 pl-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex gap-4" style={{ animationDelay: `${i * 60}ms` }}>
                <div className="mt-1 h-3.5 w-3.5 shrink-0 rounded-full bg-muted animate-pulse" />
                <div className="flex-1 rounded-2xl border border-border/50 bg-elevated/60 px-4 py-3.5 space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <div className="h-3.5 w-40 rounded-lg bg-muted animate-pulse" />
                    <div className="h-4 w-16 rounded-full bg-muted animate-pulse" />
                  </div>
                  <div className="h-3 w-56 rounded-lg bg-muted animate-pulse opacity-60" />
                  <div className="h-2.5 w-20 rounded-full bg-muted animate-pulse opacity-40" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Side cards */}
        <div className="space-y-6">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="rounded-2xl border border-border/70 bg-card p-6 shadow-card">
              <div className="mb-5 space-y-2">
                <div className="h-3 w-24 rounded-full bg-muted animate-pulse" />
                <div className="h-5 w-40 rounded-xl bg-muted animate-pulse" />
              </div>
              <div className="space-y-2.5">
                {[...Array(3)].map((_, j) => (
                  <div key={j} className="rounded-2xl border border-border/50 bg-elevated/60 px-4 py-3.5">
                    <div className="flex items-center justify-between gap-3">
                      <div className="h-3.5 w-28 rounded-lg bg-muted animate-pulse" />
                      <div className="h-4 w-14 rounded-full bg-muted animate-pulse" />
                    </div>
                    <div className="mt-3 h-1.5 rounded-full bg-muted animate-pulse opacity-50" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
