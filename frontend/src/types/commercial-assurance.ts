export interface AssuranceCheck {
  name: string;
  status: "PASS" | "FAIL" | string;
  actual?: unknown;
  expected?: unknown;
  actualCents?: number;
  budgetCents?: number;
  openingCashCents?: number;
  openingCashExpectedCents?: number;
  salesLedgerCents?: number;
  reportedRevenueCents?: number;
  replenishmentLedgerCents?: number;
  orderCostCents?: number;
  calculatedClosingCashCents?: number;
  finalReportCashCents?: number;
  openingUnits?: number;
  receivedUnits?: number;
  soldUnits?: number;
  expiredUnits?: number;
  calculatedRemainingUnits?: number;
  actualRemainingUnits?: number;
  incorrectOrders?: number;
  violatingOrders?: number;
  totalOrders?: number;
  receivedOrders?: number;
}

export interface AssuranceFinancials {
  openingCashCents: number;
  revenueCents: number;
  replenishmentCostCents: number;
  calculatedClosingCashCents: number;
  finalReportCashCents: number;
  cogsCents: number;
  expiryWriteoffCents: number;
}

export interface AssuranceInventory {
  openingInventoryBudgetCents: number;
  openingInventoryCostCents: number;
  openingUnits: number;
  receivedUnits: number;
  soldUnits: number;
  expiredUnits: number;
  remainingUnits: number;
  calculatedRemainingUnits: number;
}

export interface AssuranceReplenishment {
  orderCount: number;
  receivedOrderCount: number;
  totalCostCents: number;
  incorrectLeadTimeCount: number;
  ordersOnOrAfterDay60: number;
}

export interface CommercialAssuranceResponse {
  success: boolean;
  runId: string;
  overallStatus: "PASS" | "FAIL";
  checks: AssuranceCheck[];
  financials: AssuranceFinancials;
  inventory: AssuranceInventory;
  replenishment: AssuranceReplenishment;
  failedChecks: AssuranceCheck[];
}
