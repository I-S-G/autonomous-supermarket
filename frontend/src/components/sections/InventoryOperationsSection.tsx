import { useEffect, useMemo, useState } from "react";
import { fetchStoreBrainReport } from "../../lib/api";
import { formatCurrency, formatNumber } from "../../lib/format";
import type {
  StoreBrainEvent,
  StoreBrainReport,
} from "../../types/store-brain";

function MetricCard({
  label,
  value,
  description,
}: {
  label: string;
  value: string;
  description: string;
}) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p>
      <p className="mt-2 text-sm text-slate-500">{description}</p>
    </article>
  );
}

function severityClass(severity: StoreBrainEvent["severity"]) {
  switch (severity) {
    case "critical":
      return "bg-red-100 text-red-800";
    case "warning":
      return "bg-amber-100 text-amber-800";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

function eventLabel(eventType: string) {
  const labels: Record<string, string> = {
    low_stock: "Low stock",
    sold_out: "Sold out",
    expiry_warning: "Expiry warning",
    expiry_writeoff: "Expiry write-off",
    slow_moving: "Slow-moving stock",
    replenishment_ordered: "Replenishment ordered",
    replenishment_received: "Replenishment received",
    cash_constraint: "Cash constraint",
  };

  return labels[eventType] ?? eventType.replaceAll("_", " ");
}

export default function InventoryOperationsSection() {
  const [report, setReport] = useState<StoreBrainReport | null>(null);
  const [selectedDay, setSelectedDay] = useState("1");
  const [selectedType, setSelectedType] = useState("1");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadReport() {
      try {
        setLoading(true);
        setError(null);

        const data = await fetchStoreBrainReport();

        if (!cancelled) {
          setReport(data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load inventory operations.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadReport();

    return () => {
      cancelled = true;
    };
  }, []);

  const filteredEvents = useMemo(() => {
    if (!report) return [];

    return report.events.filter((event) => {
      const matchesDay =
        selectedDay === "all" || event.dayNumber === Number(selectedDay);

      const matchesType =
        selectedType === "all" || event.eventType === selectedType;

      return matchesDay && matchesType;
    });
  }, [report, selectedDay, selectedType]);

  const eventTypes = useMemo(
    () => [...new Set(report?.events.map((event) => event.eventType) ?? [])],
    [report],
  );

  if (loading) {
    return (
      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <p className="text-slate-600">Loading inventory operations…</p>
      </section>
    );
  }

  if (error || !report) {
    return (
      <section className="rounded-xl border border-red-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-slate-900">
          Inventory & Autonomous Operations
        </h2>
        <p className="mt-2 text-sm text-red-700">
          {error ?? "No inventory report is available."}
        </p>
      </section>
    );
  }

  const inventoryReconciles =
    report.inventory.remainingUnits ===
    report.inventory.calculatedRemainingUnits;

  const ordersReconcile =
    report.replenishment.orderCount === report.replenishment.receivedOrderCount;

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">
          Inventory & Autonomous Operations
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Recorded inventory movements, replenishment and Store Brain events for
          the selected simulation run.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Opening inventory"
          value={formatNumber(report.inventory.openingUnits)}
          description="Units available at the start"
        />
        <MetricCard
          label="Units received"
          value={formatNumber(report.inventory.receivedUnits)}
          description="Recorded replenishment receipts"
        />
        <MetricCard
          label="Units sold"
          value={formatNumber(report.inventory.soldUnits)}
          description="Units deducted through sales"
        />
        <MetricCard
          label="Units expired"
          value={formatNumber(report.inventory.expiredUnits)}
          description="Units removed through expiry"
        />
        <MetricCard
          label="Closing inventory"
          value={formatNumber(report.inventory.remainingUnits)}
          description="Units remaining at the end of the run"
        />
        <MetricCard
          label="Closing stock value"
          value={formatCurrency(report.inventory.remainingValueCents)}
          description="Remaining stock valued at recorded unit cost"
        />
        <MetricCard
          label="Replenishment orders"
          value={formatNumber(report.replenishment.orderCount)}
          description={`${formatNumber(report.replenishment.receivedOrderCount)} recorded as received`}
        />
        <MetricCard
          label="Replenishment cost"
          value={formatCurrency(report.replenishment.totalCostCents)}
          description="Total recorded order cost"
        />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h3 className="text-lg font-semibold text-slate-900">
          Inventory reconciliation
        </h3>

        <p className="mt-2 text-sm text-slate-600">
          Opening units + received units − sold units − expired units should
          equal closing units.
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <span
            className={`rounded-full px-3 py-1 text-sm font-semibold ${
              inventoryReconciles
                ? "bg-green-100 text-green-800"
                : "bg-red-100 text-red-800"
            }`}
          >
            Inventory: {inventoryReconciles ? "PASS" : "FAIL"}
          </span>

          <span
            className={`rounded-full px-3 py-1 text-sm font-semibold ${
              ordersReconcile
                ? "bg-green-100 text-green-800"
                : "bg-amber-100 text-amber-800"
            }`}
          >
            Order receipts: {ordersReconcile ? "PASS" : "CHECK"}
          </span>
        </div>

        {!inventoryReconciles && (
          <p className="mt-3 text-sm text-red-700">
            Calculated closing stock is{" "}
            {formatNumber(report.inventory.calculatedRemainingUnits)} units, but
            recorded closing stock is{" "}
            {formatNumber(report.inventory.remainingUnits)} units. Investigate
            the difference before declaring the run reconciled.
          </p>
        )}

        {!ordersReconcile && (
          <p className="mt-3 text-sm text-amber-800">
            Some replenishment orders are not marked as received. Review the
            order records before treating replenishment as fully reconciled.
          </p>
        )}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">
              Store Brain event history
            </h3>
            <p className="mt-1 text-sm text-slate-600">
              {formatNumber(filteredEvents.length)} matching recorded events
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <label className="text-sm text-slate-700">
              Simulation day
              <select
                value={selectedDay}
                onChange={(event) => setSelectedDay(event.target.value)}
                className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
              >
                <option value="all">All days</option>
                {Array.from({ length: 60 }, (_, index) => index + 1).map(
                  (day) => (
                    <option key={day} value={String(day)}>
                      Day {day}
                    </option>
                  ),
                )}
              </select>
            </label>

            <label className="text-sm text-slate-700">
              Event type
              <select
                value={selectedType}
                onChange={(event) => setSelectedType(event.target.value)}
                className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
              >
                <option value="all">All event types</option>
                {eventTypes.map((type) => (
                  <option key={type} value={type}>
                    {eventLabel(type)}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        {filteredEvents.length === 0 ? (
          <p className="mt-6 rounded-lg bg-slate-50 p-4 text-sm text-slate-600">
            No recorded events match these filters.
          </p>
        ) : (
          <div className="mt-5 space-y-3">
            {filteredEvents.map((event) => (
              <article
                key={event.id}
                className="rounded-lg border border-slate-200 p-4"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                    Day {event.dayNumber}
                  </span>
                  <span className="font-semibold text-slate-900">
                    {eventLabel(event.eventType)}
                  </span>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${severityClass(event.severity)}`}
                  >
                    {event.severity}
                  </span>
                </div>

                {event.productName && (
                  <p className="mt-2 text-sm font-medium text-slate-800">
                    Product: {event.productName}
                  </p>
                )}

                <p className="mt-2 text-sm text-slate-700">
                  {event.description}
                </p>

                {event.actionTaken && (
                  <p className="mt-2 text-sm text-slate-600">
                    <span className="font-medium">Action:</span>{" "}
                    {event.actionTaken}
                  </p>
                )}

                {event.outcome && (
                  <p className="mt-1 text-sm text-slate-600">
                    <span className="font-medium">Outcome:</span>{" "}
                    {event.outcome}
                  </p>
                )}
              </article>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h3 className="text-lg font-semibold text-slate-900">Event summary</h3>

        {report.eventSummary.length === 0 ? (
          <p className="mt-3 text-sm text-slate-600">
            No Store Brain events were recorded for this run.
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[420px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="px-3 py-3 font-medium">Event</th>
                  <th className="px-3 py-3 font-medium">Severity</th>
                  <th className="px-3 py-3 text-right font-medium">Count</th>
                </tr>
              </thead>
              <tbody>
                {report.eventSummary.map((item) => (
                  <tr
                    key={`${item.eventType}-${item.severity}`}
                    className="border-b border-slate-100 last:border-0"
                  >
                    <td className="px-3 py-3">{eventLabel(item.eventType)}</td>
                    <td className="px-3 py-3 capitalize">{item.severity}</td>
                    <td className="px-3 py-3 text-right">
                      {formatNumber(item.count)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
