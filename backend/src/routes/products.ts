import { Router } from "express";
import db from "../db.js";

const router = Router();

/**
 * GET /api/products
 * List all products with category name, variant count, and price/inventory aggregates.
 * Supports optional query params: ?search=term&category_id=1
 */
router.get("/", (req, res) => {
  try {
    const { search, category_id } = req.query;

    let query = `
      SELECT
        p.id,
        p.name,
        p.description,
        p.category_id,
        c.name AS category_name,
        p.status,
        p.deleted_at,
        p.created_at,
        p.updated_at,
        COUNT(v.id) AS variant_count,
        MIN(v.price_cents) AS min_price_cents,
        MAX(v.price_cents) AS max_price_cents,
        COALESCE(SUM(v.inventory_count), 0) AS total_inventory
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN variants v ON v.product_id = p.id
    `;

    const conditions: string[] = ["p.deleted_at IS NULL"];
    const params: unknown[] = [];

    if (search) {
      conditions.push("(p.name LIKE ? OR p.description LIKE ?)");
      params.push(`%${search}%`, `%${search}%`);
    }

    if (category_id) {
      conditions.push("p.category_id = ?");
      params.push(Number(category_id));
    }

    if (conditions.length > 0) {
      query += " WHERE " + conditions.join(" AND ");
    }

    query += " GROUP BY p.id ORDER BY p.created_at DESC";

    const products = db.prepare(query).all(...params);
    res.json(products);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

/**
 * GET /api/products/:id
 * Get a single product with its variants.
 */
router.get("/:id", (req, res) => {
  try {
    const product = db
      .prepare(
        `SELECT p.*, c.name AS category_name
         FROM products p
         LEFT JOIN categories c ON p.category_id = c.id
         WHERE p.id = ?`
      )
      .get(Number(req.params.id)) as Record<string, unknown> | undefined;

    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    const variants = db
      .prepare(
        `SELECT * FROM variants WHERE product_id = ? ORDER BY created_at ASC`
      )
      .all(Number(req.params.id));

    res.json({ ...product, variants });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

/**
 * POST /api/products
 * Create a new product with at least one variant.
 *
 * Expected body:
 * {
 *   "name": "Product Name",
 *   "description": "Optional description",
 *   "category_id": 1,
 *   "status": "active",
 *   "variants": [
 *     { "sku": "SKU-001", "name": "Default", "price_cents": 999, "inventory_count": 10 }
 *   ]
 * }
 */
router.post("/", (req, res) => {
  try {
    const { name, description, category_id, status, variants } = req.body;

    if (typeof name !== "string" || !name.trim()) {
      return res.status(400).json({ error: "Product name is required" });
    }

    if (!Array.isArray(variants) || variants.length === 0) {
      return res.status(400).json({ error: "At least one variant is required" });
    }

    const skus = new Set<string>();
    for (const variant of variants) {
      if (
        !variant ||
        typeof variant.sku !== "string" ||
        !variant.sku.trim() ||
        typeof variant.price_cents !== "number" ||
        !Number.isInteger(variant.price_cents) ||
        variant.price_cents < 0 ||
        typeof variant.inventory_count !== "number" ||
        !Number.isInteger(variant.inventory_count) ||
        variant.inventory_count < 0
      ) {
        return res.status(400).json({
          error: "Each variant requires a SKU, non-negative price_cents, and non-negative inventory_count",
        });
      }

      const sku = variant.sku.trim();
      if (skus.has(sku)) {
        return res.status(400).json({ error: "Variant SKUs must be unique" });
      }
      skus.add(sku);
    }

    const existingSku = db
      .prepare(`SELECT sku FROM variants WHERE sku IN (${[...skus].map(() => "?").join(", ")})`)
      .get(...skus);
    if (existingSku) {
      return res.status(409).json({ error: "Variant SKU already exists" });
    }

    const createProduct = db.transaction(() => {
      const result = db
        .prepare(
          `INSERT INTO products (name, description, category_id, status)
           VALUES (?, ?, ?, ?)`
        )
        .run(name.trim(), description ?? null, category_id ?? null, status ?? "active");
      const productId = Number(result.lastInsertRowid);
      const insertVariant = db.prepare(
        `INSERT INTO variants (product_id, sku, name, price_cents, inventory_count)
         VALUES (?, ?, ?, ?, ?)`
      );

      for (const variant of variants) {
        insertVariant.run(
          productId,
          variant.sku.trim(),
          variant.name ?? "Default",
          variant.price_cents,
          variant.inventory_count
        );
      }
      return productId;
    });

    const productId = createProduct();
    const product = db
      .prepare(
        `SELECT p.*, c.name AS category_name
         FROM products p
         LEFT JOIN categories c ON p.category_id = c.id
         WHERE p.id = ?`
      )
      .get(productId) as Record<string, unknown>;
    const createdVariants = db
      .prepare("SELECT * FROM variants WHERE product_id = ? ORDER BY created_at ASC")
      .all(productId);

    res.status(201).json({ ...product, variants: createdVariants });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

/**
 * PUT /api/products/:id
 * Update a product's basic information.
 */
router.put("/:id", (req, res) => {
  try {
    const { name, description, category_id, status } = req.body;
    const id = Number(req.params.id);

    const existing = db
      .prepare("SELECT * FROM products WHERE id = ?")
      .get(id) as Record<string, unknown> | undefined;

    if (!existing) {
      return res.status(404).json({ error: "Product not found" });
    }

    db.prepare(
      `UPDATE products
       SET name = COALESCE(?, name),
           description = COALESCE(?, description),
           category_id = COALESCE(?, category_id),
           status = COALESCE(?, status),
           updated_at = datetime('now')
       WHERE id = ?`
    ).run(name ?? null, description ?? null, category_id ?? null, status ?? null, id);

    const updated = db
      .prepare(
        `SELECT p.*, c.name AS category_name
         FROM products p
         LEFT JOIN categories c ON p.category_id = c.id
         WHERE p.id = ?`
      )
      .get(id);

    res.json(updated);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

/**
 * DELETE /api/products/:id
 * Soft-delete a product (sets deleted_at timestamp).
 */
router.delete("/:id", (req, res) => {
  try {
    const id = Number(req.params.id);

    const product = db
      .prepare("SELECT * FROM products WHERE id = ?")
      .get(id) as Record<string, unknown> | undefined;

    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    db.prepare(
      `UPDATE products SET deleted_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`
    ).run(id);

    res.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

export default router;
