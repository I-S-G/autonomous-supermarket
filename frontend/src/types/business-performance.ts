export interface BusinessPerformanceSummary {
  daysRecorded: number;
  totalCustomers: number;
  totalTransactions: number;
  totalUnitsSold: number;
  revenueCents: number;
  cogsCents: number;
  grossProfitCents: number;
  expiryWriteoffCents: number;
  openingCashCents: number;
  closingCashCents: number;
  closingInventoryUnits: number;
  closingInventoryValueCents: number;
}

export interface WeekdayWeekendPerformance {
  period: string;
  days: number;
  customers: number;
  transactions: number;
  unitsSold: number;
  revenueCents: number;
}

export interface DailyActivity {
  dayNumber: number;
  simulatedDate: string;
  customers: number;
  transactions: number;
  unitsSold: number;
  revenueCents: number;
}

export interface ShopperPerformance {
  averageCustomersPerDay: number;
  averageTransactionsPerDay: number;
  averageBasketUnits: number;
  averageTransactionValueCents: number;
  weekdayWeekend: WeekdayWeekendPerformance[];
  dailyActivity: DailyActivity[];
}

export interface CategoryPerformance {
  category: string;
  unitsSold: number;
  revenueCents: number;
  grossProfitCents: number;
}

export interface ProductPerformance {
  productId: string;
  name: string;
  category: string;
  unitCostCents: number;
  unitPriceCents: number;
  initialQuantity: number;
  unitsSold: number;
  revenueCents: number;
  grossProfitCents: number;
}

export interface ProductPerformanceSummary {
  productsInCatalogue: number;
  productsWithNoSales: ProductPerformance[];
  topSellingProducts: ProductPerformance[];
  slowSellingProducts: ProductPerformance[];
}

export interface RevenueCheck {
  name: string;
  status: string;
  dailyReportRevenueCents?: number;
  transactionRevenueCents?: number;
  transactionsWithoutItems?: number;
}

export interface RevenueReconciliation {
  dailyReportRevenueCents: number;
  transactionRevenueCents: number;
  checks: RevenueCheck[];
}

export interface BusinessPerformanceResponse {
  success: boolean;
  runId: string;
  runStatus: string;
  businessPerformance: BusinessPerformanceSummary;
  shopperPerformance: ShopperPerformance;
  categoryPerformance: CategoryPerformance[];
  productPerformance: ProductPerformanceSummary;
  revenueReconciliation: RevenueReconciliation;
}
