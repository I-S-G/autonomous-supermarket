import { useMemo, useState } from "react";

import type { DailyReport } from "../../types/simulation";
import { formatCurrency, formatDate, formatNumber } from "../../lib/format";
import MetricCard from "../ui/MetricCard";

interface DailyReportsSectionProps {
  reports: DailyReport[];
}

export default function DailyReportsSection({
  reports,
}: DailyReportsSectionProps) {
  const sortedReports = useMemo(
    () => [...reports].sort((a, b) => a.dayNumber - b.dayNumber),
    [reports],
  );

  const [selectedDay, setSelectedDay] = useState<number>(1);

  const selectedReport =
    sortedReports.find((report) => report.dayNumber === selectedDay) ??
    sortedReports[0] ??
    null;

  if (!selectedReport) {
    return (
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-slate-900">Daily Reports</h2>
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
          No daily reports are available.
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Daily Reports</h2>
        <p className="mt-1 text-sm text-slate-500">
          Inspect the performance of each simulated day.
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <label
          htmlFor="daily-report-day"
          className="mb-2 block text-sm font-medium text-slate-700"
        >
          Select simulation day
        </label>

        <select
          id="daily-report-day"
          value={selectedReport.dayNumber}
          onChange={(event) => setSelectedDay(Number(event.target.value))}
          className="w-full max-w-xs rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
        >
          {sortedReports.map((report) => (
            <option key={report.dayNumber} value={report.dayNumber}>
              Day {report.dayNumber} — {formatDate(report.simulatedDate)}
            </option>
          ))}
        </select>

        <p className="mt-3 text-sm text-slate-500">
          {formatDate(selectedReport.simulatedDate)}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <MetricCard
          label="Customers"
          value={formatNumber(selectedReport.customers)}
          description="Customers served that day"
        />

        <MetricCard
          label="Transactions"
          value={formatNumber(selectedReport.transactionCount)}
          description="Completed transactions"
        />

        <MetricCard
          label="Units Sold"
          value={formatNumber(selectedReport.unitsSold)}
          description="Total units sold that day"
        />

        <MetricCard
          label="Revenue"
          value={formatCurrency(selectedReport.revenueCents)}
          description="Daily transaction revenue"
        />

        <MetricCard
          label="Gross Profit"
          value={formatCurrency(selectedReport.grossProfitCents)}
          description="Daily revenue less cost of goods sold"
        />

        <MetricCard
          label="Expiry Write-off"
          value={formatCurrency(selectedReport.expiryWriteoffCents)}
          description="Value lost through expired inventory"
        />

        <MetricCard
          label="Closing Cash"
          value={formatCurrency(selectedReport.closingCashCents)}
          description="Cash at the end of this day"
        />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h3 className="mb-4 text-base font-semibold text-slate-900">
          Simulation History
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 text-slate-500">
              <tr>
                <th className="py-3 pr-4 font-medium">Day</th>
                <th className="py-3 pr-4 font-medium">Date</th>
                <th className="py-3 pr-4 text-right font-medium">Customers</th>
                <th className="py-3 pr-4 text-right font-medium">
                  Transactions
                </th>
                <th className="py-3 pr-4 text-right font-medium">Units sold</th>
                <th className="py-3 text-right font-medium">Revenue</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {sortedReports.map((report) => {
                const isSelected =
                  report.dayNumber === selectedReport.dayNumber;

                return (
                  <tr
                    key={report.dayNumber}
                    className={
                      isSelected ? "bg-emerald-50" : "hover:bg-slate-50"
                    }
                  >
                    <td className="py-3 pr-4">
                      <button
                        type="button"
                        onClick={() => setSelectedDay(report.dayNumber)}
                        aria-pressed={isSelected}
                        className={
                          isSelected
                            ? "font-semibold text-emerald-800 underline"
                            : "font-medium text-slate-700 hover:text-emerald-700"
                        }
                      >
                        Day {report.dayNumber}
                      </button>
                    </td>

                    <td className="whitespace-nowrap py-3 pr-4 text-slate-600">
                      {formatDate(report.simulatedDate)}
                    </td>

                    <td className="py-3 pr-4 text-right tabular-nums">
                      {formatNumber(report.customers)}
                    </td>

                    <td className="py-3 pr-4 text-right tabular-nums">
                      {formatNumber(report.transactionCount)}
                    </td>

                    <td className="py-3 pr-4 text-right tabular-nums">
                      {formatNumber(report.unitsSold)}
                    </td>

                    <td className="py-3 text-right tabular-nums">
                      {formatCurrency(report.revenueCents)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
