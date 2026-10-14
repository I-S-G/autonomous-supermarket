import { useCallback, useEffect, useState } from "react";

import {
  fetchBusinessPerformance,
  fetchDailyReports,
  fetchProducts,
  fetchRun,
} from "../lib/api";

import type { DashboardBusinessPerformance } from "../lib/api";
import type { Product } from "../types/product";
import type { DailyReport, Run } from "../types/simulation";

interface DashboardData {
  run: Run | null;
  dailyReports: DailyReport[];
  products: Product[];
  businessPerformance: DashboardBusinessPerformance | null;
  loading: boolean;
  error: string | null;
  productsError: string | null;
  refresh: () => void;
}

export function useDashboardData(): DashboardData {
  const [run, setRun] = useState<Run | null>(null);
  const [dailyReports, setDailyReports] = useState<DailyReport[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  const [businessPerformance, setBusinessPerformance] =
    useState<DashboardBusinessPerformance | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [productsError, setProductsError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => {
    setRefreshKey((current) => current + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadDashboard() {
      setLoading(true);
      setError(null);
      setProductsError(null);

      const mainDataPromise = Promise.all([
        fetchRun(),
        fetchDailyReports(),
        fetchBusinessPerformance(),
      ]);

      const productsPromise = fetchProducts();

      try {
        const [loadedRun, loadedReports, loadedPerformance] =
          await mainDataPromise;

        if (cancelled) return;

        setRun(loadedRun);
        setDailyReports(loadedReports);
        setBusinessPerformance(loadedPerformance);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load dashboard data.",
          );
        }
      }

      try {
        const loadedProducts = await productsPromise;

        if (!cancelled) {
          setProducts(loadedProducts);
        }
      } catch (err) {
        if (!cancelled) {
          setProductsError(
            err instanceof Error ? err.message : "Unable to load products.",
          );
        }
      }

      if (!cancelled) {
        setLoading(false);
      }
    }

    void loadDashboard();

    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  return {
    run,
    dailyReports,
    products,
    businessPerformance,
    loading,
    error,
    productsError,
    refresh,
  };
}
