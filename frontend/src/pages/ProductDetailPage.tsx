import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Pencil, Trash2, Package } from "lucide-react";
import { fetchProduct, deleteProduct, updateVariant } from "@/lib/api";
import type { ProductDetail, Variant } from "@/types";
import { formatPrice, cn } from "@/lib/utils";

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const refreshProduct = async () => {
    if (!id) return;

    const response = await fetchProduct(Number(id));

    if (!response.ok) {
      throw new Error("Failed to refresh product");
    }

    const data = await response.json();
    setProduct(data);
  };

  useEffect(() => {
    if (!id) return;
    fetchProduct(Number(id))
      .then((r) => r.json())
      .then(setProduct)
      .catch(console.error);
  }, [id]);

  // Delete handler — sends soft-delete request.
  // FIXME: The button does not disable while the request is in flight,
  //        so rapid clicks can send multiple DELETE requests.
  const handleDelete = async () => {
    if (!id) return;
    if (!window.confirm("Are you sure you want to delete this product?"))
      return;
    await deleteProduct(Number(id));
    navigate("/products");
  };

  if (!product) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div>
      {/* Back link */}
      <Link
        to="/products"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to products
      </Link>

      {/* Product header — card style */}
      <div className="mb-6 rounded-lg border bg-card p-6 shadow-card">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
              {product.name}
            </h1>
            {product.description && (
              <p className="mt-1 text-sm text-muted-foreground">
                {product.description}
              </p>
            )}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span
                className={cn(
                  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold",
                  product.status === "active"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : product.status === "draft"
                      ? "border-amber-200 bg-amber-50 text-amber-700"
                      : "border-gray-200 bg-gray-100 text-gray-600"
                )}
              >
                {product.status}
              </span>
              {product.category_name && (
                <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">
                  {product.category_name}
                </span>
              )}
            </div>
          </div>

          <button
            onClick={handleDelete}
            className="inline-flex items-center gap-1.5 rounded-md border border-destructive/30 bg-background px-3 py-2 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </button>
        </div>
      </div>

      {/* Variants table — card wrapped like CatalogList */}
      <section>
        <h2 className="mb-3 text-lg font-semibold text-foreground">
          Variants ({product.variants.length})
        </h2>

        <div className="overflow-hidden rounded-lg border bg-card shadow-card">
          <div className="overflow-x-auto">
            <table className="w-full caption-bottom text-sm">
              <thead className="[&_tr]:border-b">
                <tr className="border-b bg-muted/50 transition-colors">
                  <th className="h-12 px-4 text-left align-middle text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    SKU
                  </th>
                  <th className="h-12 px-4 text-left align-middle text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Name
                  </th>
                  <th className="h-12 px-4 text-right align-middle text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Price
                  </th>
                  <th className="h-12 px-4 text-right align-middle text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Inventory
                  </th>
                  <th className="h-12 px-4 text-right align-middle text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="[&_tr:last-child]:border-0">
                {product.variants.map((v) => (
                  <VariantRow
                    key={v.id}
                    variant={v}
                    onSaved={refreshProduct}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function VariantRow({
  variant,
  onSaved,
}: {
  variant: Variant;
  onSaved: () => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [price, setPrice] = useState(
    (variant.price_cents / 100).toFixed(2)
  );
  const [inventory, setInventory] = useState(
    String(variant.inventory_count)
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const lowStock =
    variant.inventory_count > 0 && variant.inventory_count <= 10;
  const outOfStock = variant.inventory_count === 0;

  const handleSave = async () => {
    const priceValue = Number(price);
    const inventoryValue = Number(inventory);
    const priceCents = Math.round(priceValue * 100);

    if (
      price.trim() === "" ||
      inventory.trim() === "" ||
      !Number.isFinite(priceValue) ||
      priceValue < 0 ||
      !Number.isInteger(priceCents) ||
      !Number.isInteger(inventoryValue) ||
      inventoryValue < 0
    ) {
      setError("Enter a valid price and a non-negative whole number for inventory.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const response = await updateVariant(variant.id, {
        price_cents: priceCents,
        inventory_count: inventoryValue,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to update variant");
      }

      await onSaved();
      setEditing(false);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to update variant"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setPrice((variant.price_cents / 100).toFixed(2));
    setInventory(String(variant.inventory_count));
    setError(null);
    setEditing(false);
  };

  return (
    <tr className="border-b transition-colors hover:bg-muted/50">
      <td className="p-4 align-middle font-mono text-xs">
        {variant.sku}
      </td>

      <td className="p-4 align-middle font-medium">
        {variant.name}
        {error && (
          <p role="alert" className="mt-1 text-xs text-destructive">
            {error}
          </p>
        )}
      </td>

      <td className="p-4 text-right align-middle tabular-nums">
        {editing ? (
          <input
            type="number"
            min="0"
            step="0.01"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            aria-label="Variant price"
            className="w-24 rounded-md border bg-background px-2 py-1 text-right"
          />
        ) : (
          formatPrice(variant.price_cents)
        )}
      </td>

      <td className="p-4 text-right align-middle tabular-nums">
        {editing ? (
          <input
            type="number"
            min="0"
            step="1"
            value={inventory}
            onChange={(e) => setInventory(e.target.value)}
            aria-label="Variant inventory"
            className="w-20 rounded-md border bg-background px-2 py-1 text-right"
          />
        ) : (
          <span
            className={cn(
              outOfStock && "text-destructive",
              lowStock && "text-amber-600"
            )}
          >
            {variant.inventory_count}
            {outOfStock && (
              <Package className="ml-1 inline h-3.5 w-3.5 text-destructive/60" />
            )}
          </span>
        )}
      </td>

      <td className="p-4 text-right align-middle">
        {editing ? (
          <div className="flex justify-end gap-2">
            <button
              onClick={handleCancel}
              disabled={saving}
              className="rounded-md border px-2.5 py-1 text-xs hover:bg-muted disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="rounded-md bg-primary px-2.5 py-1 text-xs text-primary-foreground disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        ) : (
          <button
            onClick={() => setEditing(true)}
            className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <Pencil className="h-3 w-3" />
            Edit
          </button>
        )}
      </td>
    </tr>
  );
}
