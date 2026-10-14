import type {
  CategoryPerformance,
  ProductPerformance,
} from "../../types/business-performance";
import type { DashboardBusinessPerformance } from "../../lib/api";

import MetricCard from "../ui/MetricCard";
import { formatCurrency, formatNumber } from "../../lib/format";

interface BusinessPerformanceSectionProps {
  report: DashboardBusinessPerformance;
}

function formatDecimal(value: number | undefined): string {
  return typeof value === "number" && Number.isFinite(value)
    ? value.toFixed(2)
    : "—";
}

function ProductTable({
  title,
  products,
}: {
  title: string;
  products: ProductPerformance[];
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <h3 className="mb-4 text-base font-semibold text-slate-900">{title}</h3>

      {products.length === 0 ? (
        <p className="text-sm text-slate-500">No product data available.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 text-slate-500">
              <tr>
                <th className="py-3 pr-4 font-medium">Product</th>
                <th className="py-3 pr-4 font-medium">Category</th>
                <th className="py-3 pr-4 text-right font-medium">Units sold</th>
                <th className="py-3 pr-4 text-right font-medium">Revenue</th>
                <th className="py-3 text-right font-medium">Gross profit</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {products.map((product) => (
                <tr key={product.productId}>
                  <td className="py-3 pr-4 font-medium text-slate-900">
                    {product.name}
                  </td>
                  <td className="py-3 pr-4 text-slate-600">
                    {product.category}
                  </td>
                  <td className="py-3 pr-4 text-right tabular-nums">
                    {formatNumber(product.unitsSold)}
                  </td>
                  <td className="py-3 pr-4 text-right tabular-nums">
                    {formatCurrency(product.revenueCents)}
                  </td>
                  <td className="py-3 text-right tabular-nums">
                    {formatCurrency(product.grossProfitCents)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function CategoryTable({ categories }: { categories: CategoryPerformance[] }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <h3 className="mb-4 text-base font-semibold text-slate-900">
        Category Performance
      </h3>

      {categories.length === 0 ? (
        <p className="text-sm text-slate-500">No category data available.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 text-slate-500">
              <tr>
                <th className="py-3 pr-4 font-medium">Category</th>
                <th className="py-3 pr-4 text-right font-medium">Units sold</th>
                <th className="py-3 pr-4 text-right font-medium">Revenue</th>
                <th className="py-3 text-right font-medium">Gross profit</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {categories.map((category) => (
                <tr key={category.category}>
                  <td className="py-3 pr-4 font-medium text-slate-900">
                    {category.category}
                  </td>
                  <td className="py-3 pr-4 text-right tabular-nums">
                    {formatNumber(category.unitsSold)}
                  </td>
                  <td className="py-3 pr-4 text-right tabular-nums">
                    {formatCurrency(category.revenueCents)}
                  </td>
                  <td className="py-3 text-right tabular-nums">
                    {formatCurrency(category.grossProfitCents)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function BusinessPerformanceSection({
  report,
}: BusinessPerformanceSectionProps) {
  const categories = report.categories ?? [];
  const topProducts = report.topProducts ?? [];
  const slowProducts = report.slowProducts ?? [];

  return (
    <section className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-slate-900">
          Business Performance
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Commercial results across {formatNumber(report.days)} simulated days.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Total Revenue"
          value={formatCurrency(report.revenueCents)}
          description="Revenue generated from transactions"
        />

        <MetricCard
          label="Gross Profit"
          value={formatCurrency(report.grossProfitCents)}
          description="Revenue less cost of goods sold"
        />

        <MetricCard
          label="Units Sold"
          value={formatNumber(report.unitsSold)}
          description="Total units sold during the run"
        />

        <MetricCard
          label="Transactions"
          value={formatNumber(report.transactions)}
          description="Total completed transactions"
        />

        <MetricCard
          label="Customers"
          value={formatNumber(report.customers)}
          description="Customers served during the run"
        />

        <MetricCard
          label="Average Customers / Day"
          value={formatDecimal(report.averageCustomersPerDay)}
          description="Average daily customer count"
        />

        <MetricCard
          label="Average Basket"
          value={formatDecimal(report.averageBasketUnits)}
          description="Units sold per transaction"
        />

        <MetricCard
          label="Average Transaction Value"
          value={formatCurrency(report.averageTransactionValueCents)}
          description="Average revenue per transaction"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <MetricCard
          label="Cost of Goods Sold"
          value={formatCurrency(report.cogsCents)}
          description="Cost of products sold"
        />

        <MetricCard
          label="Expiry Write-off"
          value={formatCurrency(report.expiryWriteoffCents)}
          description="Inventory value lost through expiry"
        />
      </div>

      <CategoryTable categories={categories} />

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <ProductTable title="Top-Selling Products" products={topProducts} />

        <ProductTable title="Slow-Selling Products" products={slowProducts} />
      </div>
    </section>
  );
}
