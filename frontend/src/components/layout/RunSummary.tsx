import type { Run } from "../../types/simulation";
import { formatCurrency, formatNumber } from "../../lib/format";
import MetricCard from "../ui/MetricCard";

interface RunSummaryProps {
  run: Run;
}

export default function RunSummary({ run }: RunSummaryProps) {
  const openingInventoryCost =
    run.config?.openingInventoryCostCents ??
    run.inventory?.openingInventoryCostCents ??
    0;

  const openingCash = run.recordedOpeningCashCents ?? run.openingCashCents ?? 0;

  return (
    <section>
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-slate-900">
          Simulation Summary
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Overview of the selected simulation run.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Simulation Days"
          value={formatNumber(run.config?.simulationDays ?? 0)}
          description="Configured simulation duration"
        />

        <MetricCard
          label="Opening Cash"
          value={formatCurrency(openingCash)}
          description="Initial operating cash"
        />

        <MetricCard
          label="Opening Inventory Cost"
          value={formatCurrency(openingInventoryCost)}
          description="Actual cost of initial inventory"
        />

        <MetricCard
          label="Inventory Budget"
          value={formatCurrency(run.openingInventoryBudgetCents)}
          description="Maximum opening inventory budget"
        />
      </div>
    </section>
  );
}
