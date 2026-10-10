import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { createProduct, fetchCategories } from "../lib/api";

type Category = {
  id: number;
  name: string;
};

type VariantForm = {
  sku: string;
  name: string;
  price: string;
  inventory: string;
};

const emptyVariant = (): VariantForm => ({
  sku: "",
  name: "",
  price: "",
  inventory: "",
});

export default function CreateProductPage() {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [status, setStatus] = useState("active");
  const [categories, setCategories] = useState<Category[]>([]);
  const [variants, setVariants] = useState<VariantForm[]>([
    emptyVariant(),
  ]);

  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadCategories() {
      try {
        const response = await fetchCategories();

        if (!response.ok) {
          throw new Error("Could not load categories");
        }

        const data = await response.json();
        setCategories(data);
      } catch {
        setError("Could not load categories. Please try refreshing.");
      }
    }

    loadCategories();
  }, []);

  function updateVariantField(
    index: number,
    field: keyof VariantForm,
    value: string
  ) {
    setVariants((current) =>
      current.map((variant, i) =>
        i === index ? { ...variant, [field]: value } : variant
      )
    );
  }

  function addVariant() {
    setVariants((current) => [...current, emptyVariant()]);
  }

  function removeVariant(index: number) {
    setVariants((current) =>
      current.filter((_, i) => i !== index)
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;

    setError("");

    if (!name.trim()) {
      setError("Product name is required.");
      return;
    }

    if (variants.length === 0) {
      setError("Add at least one variant.");
      return;
    }

    const skus = new Set<string>();

    for (const variant of variants) {
      const sku = variant.sku.trim();
      const price = Number(variant.price);
      const inventory = Number(variant.inventory);

      if (!sku || !variant.name.trim()) {
        setError("Each variant needs a SKU and name.");
        return;
      }

      if (skus.has(sku)) {
        setError("Each variant must have a unique SKU.");
        return;
      }

      skus.add(sku);

      if (
        variant.price.trim() === "" ||
        !Number.isFinite(price) ||
        price < 0 ||
        !Number.isInteger(Math.round(price * 100)) ||
        Math.abs(price * 100 - Math.round(price * 100)) > 0.000001
      ) {
        setError("Enter a valid non-negative price with at most two decimal places.");
        return;
      }

      if (
        variant.inventory.trim() === "" ||
        !Number.isInteger(inventory) ||
        inventory < 0
      ) {
        setError("Inventory must be a non-negative whole number.");
        return;
      }
    }

    setSaving(true);

    try {
      const response = await createProduct({
        name: name.trim(),
        description: description.trim(),
        category_id: categoryId ? Number(categoryId) : null,
        status,
        variants: variants.map((variant) => ({
          sku: variant.sku.trim(),
          name: variant.name.trim(),
          price_cents: Math.round(Number(variant.price) * 100),
          inventory_count: Number(variant.inventory),
        })),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create product.");
      }

      navigate(`/products/${data.id}`);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again."
      );
    } finally {
      setSaving(false);
    }
  }

  const inputClass =
    "w-full rounded-md border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring";

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        to="/products"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to products
      </Link>

      <h1 className="mb-6 text-2xl font-bold tracking-tight text-foreground md:text-3xl">
        Create New Product
      </h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <section className="space-y-4 rounded-lg border bg-card p-6 shadow-card">
          <h2 className="text-lg font-semibold">Product Details</h2>

          <div>
            <label htmlFor="product-name" className="mb-1 block text-sm font-medium">
              Product Name *
            </label>
            <input
              id="product-name"
              className={inputClass}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Organic Apples"
              required
            />
          </div>

          <div>
            <label htmlFor="description" className="mb-1 block text-sm font-medium">
              Description
            </label>
            <textarea
              id="description"
              className={inputClass}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional product description"
              rows={3}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="category" className="mb-1 block text-sm font-medium">
                Category
              </label>
              <select
                id="category"
                className={inputClass}
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
              >
                <option value="">No category</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="status" className="mb-1 block text-sm font-medium">
                Status
              </label>
              <select
                id="status"
                className={inputClass}
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="active">Active</option>
                <option value="draft">Draft</option>
              </select>
            </div>
          </div>
        </section>

        <section className="space-y-4 rounded-lg border bg-card p-6 shadow-card">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">Variants</h2>
            <button
              type="button"
              onClick={addVariant}
              className="inline-flex items-center gap-1 rounded-md border px-3 py-2 text-sm font-medium hover:bg-accent"
            >
              <Plus className="h-4 w-4" />
              Add Variant
            </button>
          </div>

          {variants.map((variant, index) => (
            <div
              key={index}
              className="space-y-4 rounded-md border p-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">
                  Variant {index + 1}
                </h3>

                <button
                  type="button"
                  onClick={() => removeVariant(index)}
                  disabled={variants.length === 1}
                  className="inline-flex items-center gap-1 text-sm text-destructive disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Trash2 className="h-4 w-4" />
                  Remove
                </button>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium">
                    SKU *
                  </label>
                  <input
                    className={inputClass}
                    value={variant.sku}
                    onChange={(e) =>
                      updateVariantField(index, "sku", e.target.value)
                    }
                    placeholder="e.g. APPLE-001"
                    required
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium">
                    Variant Name *
                  </label>
                  <input
                    className={inputClass}
                    value={variant.name}
                    onChange={(e) =>
                      updateVariantField(index, "name", e.target.value)
                    }
                    placeholder="e.g. 1 kg bag"
                    required
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium">
                    Price ($) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className={inputClass}
                    value={variant.price}
                    onChange={(e) =>
                      updateVariantField(index, "price", e.target.value)
                    }
                    placeholder="0.00"
                    required
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium">
                    Inventory Count *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    className={inputClass}
                    value={variant.inventory}
                    onChange={(e) =>
                      updateVariantField(index, "inventory", e.target.value)
                    }
                    placeholder="0"
                    required
                  />
                </div>
              </div>
            </div>
          ))}
        </section>

        {error && (
          <div
            role="alert"
            className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
          >
            {error}
          </div>
        )}

        <div className="flex justify-end gap-3">
          <Link
            to="/products"
            className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-accent"
          >
            Cancel
          </Link>

          <button
            type="submit"
            disabled={saving}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? "Creating..." : "Create Product"}
          </button>
        </div>
      </form>
    </div>
  );
}