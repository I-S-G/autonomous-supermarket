import { useEffect, useState } from "react";
import { fetchCommercialAssurance } from "../../lib/api";
import { formatCurrency, formatNumber } from "../../lib/format";
import type {
  AssuranceCheck,
  CommercialAssuranceResponse,
} from "../../types/commercial-assurance";

function StatusBadge({ status }: { status: string }) {
  const passed = status === "PASS";

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
        passed ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
      }`}
    >
      {status}
    </span>
  );
}

function describeValue(value: unknown): string {
  if (value === undefined || value === null) return "Not provided";

  if (typeof value === "object") {
    return JSON.stringify(value);
  }

  return String(value);
}

function CheckDetails({ check }: { check: AssuranceCheck }) {
  const excluded = new Set(["name", "status"]);

  const details = Object.entries(check).filter(
    ([key, value]) => !excluded.has(key) && value !== undefined,
  );

  if (details.length === 0) return null;

  return (
    <dl className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
      {details.map(([key, value]) => (
        <div key={key} className="rounded-lg bg-slate-50 p-3">
          <dt className="text-xs font-medium text-slate-500">
            {key
              .replace(/([A-Z])/g, " $1")
              .replace(/^./, (character) => character.toUpperCase())}
          </dt>
          <dd className="mt-1 break-words text-sm text-slate-800">
            {describeValue(value)}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function AssuranceCheckCard({ check }: { check: AssuranceCheck }) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h3 className="font-semibold text-slate-900">{check.name}</h3>
        <StatusBadge status={check.status} />
      </div>
      <CheckDetails check={check} />
    </article>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-5">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 text-xl font-semibold text-slate-900">{value}</p>
    </article>
  );
}

export default function CommercialAssuranceSection() {
  const [report, setReport] = useState<CommercialAssuranceResponse | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError(null);

        const result = await fetchCommercialAssurance();

        if (!cancelled) {
          setReport(result);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load Commercial Assurance.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <p className="text-sm text-slate-600">
          Loading Commercial Assurance...
        </p>
      </section>
    );
  }

  if (error || !report) {
    return (
      <section className="rounded-xl border border-red-200 bg-white p-6">
        <h2 className="text-xl font-bold text-slate-900">
          Commercial Assurance
        </h2>
        <p role="alert" className="mt-2 text-sm text-red-700">
          {error ?? "No assurance report is available."}
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">
          Commercial Assurance
        </h2>
        <p className="mt-1 text-sm leading-6 text-slate-600">
          Validation of simulation completion, financial reconciliation,
          inventory movements and replenishment rules.
        </p>
      </div>

      <div
        className={`rounded-xl border p-5 ${
          report.overallStatus === "PASS"
            ? "border-green-200 bg-green-50"
            : "border-red-200 bg-red-50"
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">
              Overall validation
            </h3>
            <p className="mt-1 text-sm text-slate-700">
              {report.overallStatus === "PASS"
                ? "All backend assurance checks passed."
                : `${formatNumber(report.failedChecks.length)} check(s) failed. Review the details below.`}
            </p>
          </div>
          <StatusBadge status={report.overallStatus} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <MetricCard
          label="Opening inventory cost"
          value={formatCurrency(report.inventory.openingInventoryCostCents)}
        />
        <MetricCard
          label="Opening inventory budget"
          value={formatCurrency(report.inventory.openingInventoryBudgetCents)}
        />
        <MetricCard
          label="Opening operating cash"
          value={formatCurrency(report.financials.openingCashCents)}
        />
        <MetricCard
          label="Total revenue"
          value={formatCurrency(report.financials.revenueCents)}
        />
        <MetricCard
          label="Replenishment cost"
          value={formatCurrency(report.replenishment.totalCostCents)}
        />
        <MetricCard
          label="Calculated closing cash"
          value={formatCurrency(report.financials.calculatedClosingCashCents)}
        />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h3 className="text-lg font-semibold text-slate-900">
          Inventory reconciliation
        </h3>
        <p className="mt-2 text-sm text-slate-600">
          Opening stock + received stock − sold stock − expired stock must equal
          closing stock.
        </p>

        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
          <MetricCard
            label="Opening units"
            value={formatNumber(report.inventory.openingUnits)}
          />
          <MetricCard
            label="Received units"
            value={formatNumber(report.inventory.receivedUnits)}
          />
          <MetricCard
            label="Sold units"
            value={formatNumber(report.inventory.soldUnits)}
          />
          <MetricCard
            label="Expired units"
            value={formatNumber(report.inventory.expiredUnits)}
          />
          <MetricCard
            label="Calculated remaining"
            value={formatNumber(report.inventory.calculatedRemainingUnits)}
          />
          <MetricCard
            label="Recorded remaining"
            value={formatNumber(report.inventory.remainingUnits)}
          />
        </div>
      </div>

      <div>
        <h3 className="mb-3 text-lg font-semibold text-slate-900">
          Validation checks
        </h3>

        <div className="space-y-3">
          {report.checks.map((check) => (
            <AssuranceCheckCard key={check.name} check={check} />
          ))}
        </div>
      </div>

      {report.failedChecks.length > 0 && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-5">
          <h3 className="font-semibold text-red-900">
            Checks requiring attention
          </h3>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-red-800">
            {report.failedChecks.map((check) => (
              <li key={check.name}>{check.name}</li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
