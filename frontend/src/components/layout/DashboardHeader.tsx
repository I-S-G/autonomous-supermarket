interface DashboardHeaderProps {
  status?: string;
  onRefresh: () => void;
  loading: boolean;
}

export default function DashboardHeader({
  status,
  onRefresh,
  loading,
}: DashboardHeaderProps) {
  return (
    <header className="flex flex-col gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wider text-emerald-700">
          Autonomous Supermarket
        </p>

        <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          Commercial Dashboard
        </h1>

        <p className="mt-2 text-sm text-slate-500">
          Simulation performance, inventory and autonomous operations
        </p>
      </div>

      <div className="flex items-center gap-3">
        {status && (
          <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700">
            {status}
          </span>
        )}

        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Loading..." : "Refresh"}
        </button>
      </div>
    </header>
  );
}
