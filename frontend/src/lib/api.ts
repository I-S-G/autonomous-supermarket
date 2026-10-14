import { API_URL, ACTIVE_RUN_ID } from "../config/app";

import type { DailyReport, Run } from "../types/simulation";
import type { Product } from "../types/product";
import type {
  BusinessPerformanceResponse,
  CategoryPerformance,
  ProductPerformance,
  WeekdayWeekendPerformance,
} from "../types/business-performance";
import type { StoreBrainReport } from "../types/store-brain";
import type { CommercialAssuranceResponse } from "../types/commercial-assurance";

export interface DashboardBusinessPerformance {
  days: number;
  customers: number;
  transactions: number;
  unitsSold: number;
  revenueCents: number;
  cogsCents: number;
  grossProfitCents: number;
  expiryWriteoffCents: number;
  openingCashCents: number;
  closingCashCents: number;
  closingInventoryUnits: number;
  closingInventoryValueCents: number;
  averageCustomersPerDay: number;
  averageTransactionsPerDay: number;
  averageBasketUnits: number;
  averageTransactionValueCents: number;
  weekdayWeekend: WeekdayWeekendPerformance[];
  categories: CategoryPerformance[];
  topProducts: ProductPerformance[];
  slowProducts: ProductPerformance[];
}

async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(`${API_URL}${path}`);

  if (!response.ok) {
    throw new Error(`API request failed (${response.status}): ${path}`);
  }

  return response.json() as Promise<T>;
}

export async function fetchRun(): Promise<Run> {
  const result = await getJson<{ success: boolean; run: Run }>(
    `/runs/${ACTIVE_RUN_ID}`,
  );

  return result.run;
}

export async function fetchDailyReports(): Promise<DailyReport[]> {
  const result = await getJson<{
    success: boolean;
    runId: string;
    count: number;
    dailyReports: DailyReport[];
  }>(`/runs/${ACTIVE_RUN_ID}/daily-reports`);

  return result.dailyReports;
}

export async function fetchProducts(): Promise<Product[]> {
  const result = await getJson<Product[] | { products?: Product[] }>(
    "/products",
  );

  return Array.isArray(result) ? result : (result.products ?? []);
}

export async function fetchBusinessPerformance(): Promise<DashboardBusinessPerformance> {
  const result = await getJson<BusinessPerformanceResponse>(
    `/runs/${ACTIVE_RUN_ID}/business-performance`,
  );

  const business = result.businessPerformance;
  const shopper = result.shopperPerformance;
  const productData = result.productPerformance;

  return {
    days: business.daysRecorded,
    customers: business.totalCustomers,
    transactions: business.totalTransactions,
    unitsSold: business.totalUnitsSold,
    revenueCents: business.revenueCents,
    cogsCents: business.cogsCents,
    grossProfitCents: business.grossProfitCents,
    expiryWriteoffCents: business.expiryWriteoffCents,
    openingCashCents: business.openingCashCents,
    closingCashCents: business.closingCashCents,
    closingInventoryUnits: business.closingInventoryUnits,
    closingInventoryValueCents: business.closingInventoryValueCents,
    averageCustomersPerDay: shopper.averageCustomersPerDay,
    averageTransactionsPerDay: shopper.averageTransactionsPerDay,
    averageBasketUnits: shopper.averageBasketUnits,
    averageTransactionValueCents: shopper.averageTransactionValueCents,
    weekdayWeekend: shopper.weekdayWeekend,
    categories: result.categoryPerformance,
    topProducts: productData.topSellingProducts,
    slowProducts: productData.slowSellingProducts,
  };
}

export async function fetchStoreBrainReport(): Promise<StoreBrainReport> {
  const response = await fetch(
    `${API_URL}/store-brain/${ACTIVE_RUN_ID}/report`,
  );

  const result = (await response.json()) as StoreBrainReport & {
    error?: string;
  };

  if (!response.ok || !result.success) {
    throw new Error(result.error ?? "Failed to load Store Brain report.");
  }

  return result;
}

export async function fetchCommercialAssurance(): Promise<CommercialAssuranceResponse> {
  const response = await fetch(
    `${API_URL}/runs/${ACTIVE_RUN_ID}/commercial-assurance`,
  );

  const result = (await response.json()) as CommercialAssuranceResponse & {
    error?: string;
  };

  if (!response.ok || !result.success) {
    throw new Error(result.error ?? "Failed to load Commercial Assurance.");
  }

  return result;
}
