export interface Run {
  id: string;
  status: string;
  openingInventoryBudgetCents: number;
  openingCashCents: number;
  modelVersion: string;
  createdAt: string;
  completedAt: string | null;
  config: {
    simulationDays: number;
    startDate: string;
    openingInventoryBudgetCents: number;
    openingInventoryCostCents: number;
    openingCashCents: number;
    modelVersion: string;
    demandModel?: {
      status: string;
      description?: string;
    };
    storeBrain?: {
      status: string;
      replenishmentLeadTimeDays: number;
    };
    expiryConvention?: string;
  };
  inventory?: {
    productCount: number;
    totalOpeningUnits: number;
    openingInventoryCostCents: number;
  };
  history?: {
    dailyReportsCreated: number;
    firstDay: number;
    lastDay: number;
  };
  recordedOpeningCashCents?: number;
}

export interface DailyReport {
  dayNumber: number;
  simulatedDate: string;
  customers: number;
  transactionCount: number;
  unitsSold: number;
  revenueCents: number;
  cogsCents: number;
  grossProfitCents: number;
  expiryWriteoffCents: number;
  closingCashCents: number;
}

export interface RunResponse {
  success: boolean;
  run: Run;
}

export interface DailyReportsResponse {
  success: boolean;
  runId: string;
  count: number;
  dailyReports: DailyReport[];
}
