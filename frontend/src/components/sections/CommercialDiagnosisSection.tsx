import { useMemo } from "react";
import { formatCurrency, formatNumber } from "../../lib/format";
import type { DashboardBusinessPerformance } from "../../lib/api";

interface CommercialDiagnosisSectionProps {
  performance: DashboardBusinessPerformance;
}

function InsightCard({
  title,
  finding,
  recommendation,
  type = "neutral",
}: {
  title: string;
  finding: string;
  recommendation: string;
  type?: "positive" | "warning" | "neutral";
}) {
  const styles = {
    positive: "border-green-200 bg-green-50",
    warning: "border-amber-200 bg-amber-50",
    neutral: "border-slate-200 bg-white",
  };

  return (
    <article className={`rounded-xl border p-5 ${styles[type]}`}>
      <h4 className="font-semibold text-slate-900">{title}</h4>
      <p className="mt-2 text-sm leading-6 text-slate-700">{finding}</p>
      <p className="mt-3 text-sm leading-6 text-slate-800">
        <span className="font-semibold">Recommendation: </span>
        {recommendation}
      </p>
    </article>
  );
}

export default function CommercialDiagnosisSection({
  performance,
}: CommercialDiagnosisSectionProps) {
  const diagnosis = useMemo(() => {
    const categories = [...performance.categories].sort(
      (a, b) => b.grossProfitCents - a.grossProfitCents,
    );

    const topProducts = [...performance.topProducts].sort(
      (a, b) => b.unitsSold - a.unitsSold,
    );

    const slowProducts = [...performance.slowProducts].sort(
      (a, b) => a.unitsSold - b.unitsSold,
    );

    const expiryToRevenue =
      performance.revenueCents > 0
        ? (performance.expiryWriteoffCents / performance.revenueCents) * 100
        : 0;

    const expiryToGrossProfit =
      performance.grossProfitCents > 0
        ? (performance.expiryWriteoffCents / performance.grossProfitCents) * 100
        : 0;

    return {
      categories,
      topProducts,
      slowProducts,
      expiryToRevenue,
      expiryToGrossProfit,
    };
  }, [performance]);

  const strongestCategory = diagnosis.categories[0];
  const weakestCategory = diagnosis.categories[diagnosis.categories.length - 1];
  const bestSeller = diagnosis.topProducts[0];
  const slowestSeller = diagnosis.slowProducts[0];

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">
          Commercial Diagnosis & Recommendations
        </h2>
        <p className="mt-1 text-sm leading-6 text-slate-600">
          Evidence-based findings and suggested actions drawn from the recorded
          60-day business performance.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">Gross profit</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">
            {formatCurrency(performance.grossProfitCents)}
          </p>
          <p className="mt-2 text-sm text-slate-600">
            Revenue less cost of goods sold, before considering other operating
            expenses.
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">Expiry write-offs</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">
            {formatCurrency(performance.expiryWriteoffCents)}
          </p>
          <p className="mt-2 text-sm text-slate-600">
            Recorded cost of inventory lost to expiry.
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">Expiry cost / revenue</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">
            {diagnosis.expiryToRevenue.toFixed(1)}%
          </p>
          <p className="mt-2 text-sm text-slate-600">
            Expiry write-offs divided by recorded revenue. This is a comparison
            ratio, not a profit margin.
          </p>
        </div>
      </div>

      <div>
        <h3 className="mb-3 text-lg font-semibold text-slate-900">
          Key commercial findings
        </h3>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {performance.expiryWriteoffCents > 0 ? (
            <InsightCard
              title="Expiry losses need attention"
              type="warning"
              finding={`The simulation recorded ${formatCurrency(performance.expiryWriteoffCents)} in expiry write-offs, equivalent to ${diagnosis.expiryToRevenue.toFixed(1)}% of revenue and ${diagnosis.expiryToGrossProfit.toFixed(1)}% of gross profit.`}
              recommendation="Review expiry-prone products, order quantities, shelf-life assumptions and replenishment timing. Test smaller orders for products that repeatedly expire, then compare expiry costs in a subsequent run."
            />
          ) : (
            <InsightCard
              title="No recorded expiry losses"
              type="positive"
              finding="The business performance data reports no expiry write-off cost."
              recommendation="Continue monitoring stock expiry and verify that inventory movements and write-off records reconcile."
            />
          )}

          {strongestCategory ? (
            <InsightCard
              title="Highest gross-profit category"
              type="positive"
              finding={`${strongestCategory.category} generated ${formatCurrency(strongestCategory.grossProfitCents)} in gross profit and sold ${formatNumber(strongestCategory.unitsSold)} units.`}
              recommendation="Review this category's sales and replenishment patterns. Consider protecting availability of its stronger products, while checking stock levels and expiry risk before increasing orders."
            />
          ) : (
            <InsightCard
              title="Category data unavailable"
              finding="No category performance records were returned."
              recommendation="Check that the business-performance endpoint includes category-level results."
            />
          )}

          {weakestCategory &&
          strongestCategory &&
          weakestCategory.category !== strongestCategory.category ? (
            <InsightCard
              title="Lowest gross-profit category"
              finding={`${weakestCategory.category} generated ${formatCurrency(weakestCategory.grossProfitCents)} in gross profit from ${formatNumber(weakestCategory.unitsSold)} units sold. This is the lowest absolute gross profit among the returned categories.`}
              recommendation="Investigate its unit sales, selling prices, purchase costs and availability before changing its range. Absolute gross profit alone does not establish that the category has a poor margin."
            />
          ) : null}

          {bestSeller ? (
            <InsightCard
              title="Top-selling product"
              type="positive"
              finding={`${bestSeller.name} sold ${formatNumber(bestSeller.unitsSold)} units and generated ${formatCurrency(bestSeller.revenueCents)} in revenue.`}
              recommendation="Check this product's stock availability and replenishment history. Maintain appropriate stock without ordering beyond likely demand or available operating cash."
            />
          ) : (
            <InsightCard
              title="Top-selling product unavailable"
              finding="No top-selling product records were returned."
              recommendation="Check the product-performance response and confirm that sales are linked to catalogue products."
            />
          )}

          {slowestSeller ? (
            <InsightCard
              title="Slow-selling product to review"
              type="warning"
              finding={`${slowestSeller.name} sold ${formatNumber(slowestSeller.unitsSold)} units in the reported results.`}
              recommendation="Review its sales history, current stock, shelf life and purchase cost. Consider reducing future order quantities or changing its replenishment priority if the wider evidence supports doing so."
            />
          ) : (
            <InsightCard
              title="Slow-selling product data unavailable"
              finding="No slow-selling product records were returned."
              recommendation="Check the product-performance endpoint and its slow-selling product selection logic."
            />
          )}
        </div>
      </div>
    </section>
  );
}
