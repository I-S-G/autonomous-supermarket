import DashboardHeader from "./components/layout/DashboardHeader";
import RunSummary from "./components/layout/RunSummary";
import BusinessPerformanceSection from "./components/reports/BusinessPerformanceSection";
import DailyReportsSection from "./components/reports/DailyReportsSection";
import ProductCatalogueSection from "./components/reports/ProductCatalogueSection";
import InventoryOperationsSection from "./components/sections/InventoryOperationsSection";
import CommercialDiagnosisSection from "./components/sections/CommercialDiagnosisSection";
import CommercialAssuranceSection from "./components/sections/CommercialAssuranceSection";

import { useDashboardData } from "./hooks/useDashboardData";

export default function App() {
  const {
    run,
    dailyReports,
    products,
    businessPerformance,
    loading,
    error,
    productsError,
    refresh,
  } = useDashboardData();

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <DashboardHeader
          status={run?.status}
          onRefresh={refresh}
          loading={loading}
        />

        {error && (
          <div
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          >
            <p className="font-semibold">Unable to load the dashboard</p>
            <p className="mt-1">{error}</p>
            <button
              type="button"
              onClick={refresh}
              className="mt-3 font-semibold underline"
            >
              Try again
            </button>
          </div>
        )}

        {loading && !run && (
          <p className="text-sm text-slate-500">Loading simulation data...</p>
        )}

        {run && (
          <>
            <RunSummary run={run} />

            {businessPerformance && (
              <>
                <BusinessPerformanceSection report={businessPerformance} />

                <CommercialDiagnosisSection performance={businessPerformance} />
              </>
            )}

            <DailyReportsSection reports={dailyReports} />

            <InventoryOperationsSection />

            <CommercialAssuranceSection />

            <ProductCatalogueSection
              products={products}
              error={productsError}
            />
          </>
        )}
      </div>
    </main>
  );
}
