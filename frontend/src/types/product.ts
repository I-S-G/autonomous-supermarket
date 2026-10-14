export interface Product {
  id: string;
  name: string;
  category: string;
  unitCostCents: number;
  unitPriceCents: number;
  isPerishable: boolean;
  shelfLifeDays: number | null;
}
