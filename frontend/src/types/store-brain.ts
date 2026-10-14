export interface InventorySummary {
  openingUnits: number;
  receivedUnits: number;
  soldUnits: number;
  expiredUnits: number;
  remainingUnits: number;
  remainingValueCents: number;
  calculatedRemainingUnits: number;
}

export interface ReplenishmentSummary {
  orderCount: number;
  receivedOrderCount: number;
  totalCostCents: number;
}

export interface StoreBrainEventSummary {
  eventType: string;
  severity: "info" | "warning" | "critical";
  count: number;
}

export interface StoreBrainEvent {
  id: string;
  dayNumber: number;
  productId: string | null;
  productName: string | null;
  eventType: string;
  severity: "info" | "warning" | "critical";
  description: string;
  actionTaken: string | null;
  outcome: string | null;
  createdAt: string;
}

export interface StoreBrainReport {
  success: boolean;
  runId: string;
  runStatus: string;
  inventory: InventorySummary;
  replenishment: ReplenishmentSummary;
  eventSummary: StoreBrainEventSummary[];
  events: StoreBrainEvent[];
}
