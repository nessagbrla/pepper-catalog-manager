import { Router } from "express";
import db from "../db.js";

const router = Router();

/**
 * GET /api/variants/:id
 * Get a single variant.
 */
router.get("/:id", (req, res) => {
  try {
    const variant = db
      .prepare("SELECT * FROM variants WHERE id = ?")
      .get(Number(req.params.id));

    if (!variant) {
      return res.status(404).json({ error: "Variant not found" });
    }

    res.json(variant);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

/**
 * PUT /api/variants/:id
 * Update a variant's price and/or inventory.
 *
 * Expected body (all fields optional):
 * {
 *   "name": "Updated Name",
 *   "sku": "NEW-SKU",
 *   "price_cents": 1999,
 *   "inventory_count": 50
 * }
 */
router.put("/:id", (req, res) => {
  try {
    const id = Number(req.params.id);
    const existing = db
      .prepare("SELECT * FROM variants WHERE id = ?")
      .get(id) as Record<string, unknown> | undefined;

    if (!existing) {
      return res.status(404).json({ error: "Variant not found" });
    }
    if (
      req.body === null ||
      typeof req.body !== "object" ||
      Array.isArray(req.body)
    ) {
      return res.status(400).json({
        error: "Request body must be a valid JSON object",
      });
    }

    const { name, sku, price_cents, inventory_count } = req.body as Record<
      string,
      unknown
    >;

    if (
      (price_cents !== undefined &&
        (typeof price_cents !== "number" ||
          !Number.isInteger(price_cents) ||
          price_cents < 0)) ||
      (inventory_count !== undefined &&
        (typeof inventory_count !== "number" ||
          !Number.isInteger(inventory_count) ||
          inventory_count < 0))
    ) {
      return res.status(400).json({
        error: "price_cents and inventory_count must be non-negative integers",
      });
    }

    if (sku !== undefined) {
      if (typeof sku !== "string" || !sku.trim()) {
        return res.status(400).json({ error: "sku must be a non-empty string" });
      }

      const duplicate = db
        .prepare("SELECT id FROM variants WHERE sku = ? AND id != ?")
        .get(sku, id);
      if (duplicate) {
        return res.status(400).json({ error: "sku must be unique" });
      }
    }

    if (name !== undefined && (typeof name !== "string" || !name.trim())) {
      return res.status(400).json({ error: "name must be a non-empty string" });
    }

    db.prepare(
      `UPDATE variants
       SET name = COALESCE(?, name),
           sku = COALESCE(?, sku),
           price_cents = COALESCE(?, price_cents),
           inventory_count = COALESCE(?, inventory_count),
           updated_at = datetime('now')
       WHERE id = ?`
    ).run(
      name ?? null,
      sku ?? null,
      price_cents ?? null,
      inventory_count ?? null,
      id
    );

    const updated = db
      .prepare("SELECT * FROM variants WHERE id = ?")
      .get(id);
    res.json(updated);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

/**
 * DELETE /api/variants/:id
 * Delete a variant permanently.
 */
router.delete("/:id", (req, res) => {
  try {
    const id = Number(req.params.id);

    const variant = db
      .prepare("SELECT * FROM variants WHERE id = ?")
      .get(id) as Record<string, unknown> | undefined;

    if (!variant) {
      return res.status(404).json({ error: "Variant not found" });
    }

    // Prevent deleting the last variant of a product
    const siblingCount = db
      .prepare(
        "SELECT COUNT(*) AS count FROM variants WHERE product_id = ?"
      )
      .get(variant.product_id as number) as { count: number };

    if (siblingCount.count <= 1) {
      return res
        .status(400)
        .json({ error: "Cannot delete the last variant of a product" });
    }

    db.prepare("DELETE FROM variants WHERE id = ?").run(id);
    res.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

export default router;
