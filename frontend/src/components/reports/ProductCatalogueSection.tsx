import type { Product } from "../../types/product";
import { formatCurrency, formatNumber } from "../../lib/format";

interface ProductCatalogueSectionProps {
  products: Product[];
  error?: string | null;
}

export default function ProductCatalogueSection({
  products,
  error,
}: ProductCatalogueSectionProps) {
  return (
    <section className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Product Catalogue</h2>
        <p className="mt-1 text-sm text-slate-500">
          Products available in the supermarket catalogue.
        </p>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800"
        >
          Unable to load the product catalogue: {error}
        </div>
      )}

      {!error && products.length === 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
          No products are available.
        </div>
      )}

      {products.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-5 py-3 font-medium">Product</th>
                  <th className="px-5 py-3 font-medium">Category</th>
                  <th className="px-5 py-3 text-right font-medium">
                    Cost price
                  </th>
                  <th className="px-5 py-3 text-right font-medium">
                    Selling price
                  </th>
                  <th className="px-5 py-3 text-center font-medium">
                    Perishable
                  </th>
                  <th className="px-5 py-3 text-right font-medium">
                    Shelf life
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {products.map((product) => (
                  <tr key={product.id} className="transition hover:bg-slate-50">
                    <td className="px-5 py-4 font-medium text-slate-900">
                      {product.name}
                    </td>

                    <td className="px-5 py-4 text-slate-600">
                      {product.category}
                    </td>

                    <td className="whitespace-nowrap px-5 py-4 text-right tabular-nums">
                      {formatCurrency(product.unitCostCents)}
                    </td>

                    <td className="whitespace-nowrap px-5 py-4 text-right font-medium tabular-nums">
                      {formatCurrency(product.unitPriceCents)}
                    </td>

                    <td className="px-5 py-4 text-center">
                      <span
                        className={
                          product.isPerishable
                            ? "rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800"
                            : "rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600"
                        }
                      >
                        {product.isPerishable ? "Yes" : "No"}
                      </span>
                    </td>

                    <td className="whitespace-nowrap px-5 py-4 text-right text-slate-600">
                      {product.isPerishable && product.shelfLifeDays != null
                        ? `${formatNumber(product.shelfLifeDays)} days`
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="border-t border-slate-200 px-5 py-3 text-sm text-slate-500">
            {formatNumber(products.length)} products in catalogue
          </div>
        </div>
      )}
    </section>
  );
}
