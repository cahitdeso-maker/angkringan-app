import { query, generateId } from "../../../lib/db";

/** Hitung ulang hpp_total & harga_jual untuk satu produk. */
async function recalculateProduct(productId: string) {
  await query(
    `UPDATE menu m
     SET hpp_total = COALESCE(
       (SELECT SUM(biaya) FROM product_recipe WHERE product_id = m.id),
       0
     ),
     harga_jual = CASE
       WHEN m.margin_percent IS NOT NULL AND m.hpp_total > 0
       THEN ROUND(m.hpp_total * (1 + m.margin_percent / 100), 0)
       ELSE m.harga_jual
     END,
     -- Sinkronisasi harga legacy agar kasir/POS tetap menggunakan harga terbaru
     harga = CASE
       WHEN m.margin_percent IS NOT NULL AND m.hpp_total > 0
       THEN ROUND(m.hpp_total * (1 + m.margin_percent / 100), 0)
       ELSE m.harga
     END
     WHERE m.id = ?`,
    [productId],
  );
}

/** Hitung biaya baris resep berdasarkan harga per satuan kecil bahan. */
async function hitungBiayaBaris(
  rawMaterialId: string,
  takaran: number,
): Promise<number> {
  const rows: any = await query(
    "SELECT harga_per_satuan_kecil FROM raw_materials WHERE id = ?",
    [rawMaterialId],
  );
  if (!Array.isArray(rows) || rows.length === 0) return 0;
  return takaran * Number(rows[0].harga_per_satuan_kecil);
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get("product_id");

    if (!productId) {
      return Response.json(
        { error: "product_id wajib diisi" },
        { status: 400 },
      );
    }

    const recipe = await query(
      `SELECT pr.id, pr.product_id, pr.raw_material_id, pr.takaran, pr.biaya,
              rm.nama_bahan, rm.satuan_kecil, rm.harga_per_satuan_kecil
       FROM product_recipe pr
       JOIN raw_materials rm ON rm.id = pr.raw_material_id
       WHERE pr.product_id = ? AND rm.is_deleted = 'f'
       ORDER BY pr.id ASC`,
      [productId],
    );

    return Response.json(
      Array.isArray(recipe)
        ? recipe.map((r: any) => ({
            ...r,
            takaran: Number(r.takaran),
            biaya: Number(r.biaya),
            harga_per_satuan_kecil: Number(r.harga_per_satuan_kecil),
          }))
        : [],
    );
  } catch (error) {
    console.error("Product recipe fetch error:", error);
    return Response.json(
      { error: "Failed to fetch product recipe" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();

    if (data.action === "add_item") {
      const { product_id, raw_material_id, takaran } = data;
      if (!product_id || !raw_material_id || Number(takaran) < 0) {
        return Response.json(
          { success: false, error: "Data resep tidak valid" },
          { status: 400 },
        );
      }
      const biaya = await hitungBiayaBaris(raw_material_id, Number(takaran));
      const id = await generateId();
      await query(
        `INSERT INTO product_recipe (id, product_id, raw_material_id, takaran, biaya)
         VALUES (?, ?, ?, ?, ?)`,
        [id, product_id, raw_material_id, takaran, biaya],
      );
      await recalculateProduct(product_id);
      return Response.json({ success: true, id, biaya });
    }

    if (data.action === "update_item") {
      const { id, takaran } = data;
      if (takaran < 0) {
        return Response.json(
          { success: false, error: "Takaran tidak boleh negatif" },
          { status: 400 },
        );
      }
      const rows: any = await query(
        "SELECT raw_material_id, product_id FROM product_recipe WHERE id = ?",
        [id],
      );
      if (!Array.isArray(rows) || rows.length === 0) {
        return Response.json(
          { success: false, error: "Baris resep tidak ditemukan" },
          { status: 404 },
        );
      }
      const { raw_material_id, product_id } = rows[0];
      const biaya = await hitungBiayaBaris(raw_material_id, Number(takaran));
      await query("UPDATE product_recipe SET takaran = ?, biaya = ? WHERE id = ?", [
        takaran,
        biaya,
        id,
      ]);
      await recalculateProduct(product_id);
      return Response.json({ success: true, biaya });
    }

    if (data.action === "remove_item") {
      const { id } = data;
      const existing: any[] = await query(
        "SELECT product_id FROM product_recipe WHERE id = ?",
        [id],
      );
      if (Array.isArray(existing) && existing.length > 0) {
        await query("DELETE FROM product_recipe WHERE id = ?", [id]);
        await recalculateProduct(existing[0].product_id);
      }
      return Response.json({ success: true });
    }

    if (data.action === "save_items") {
      // Simpan seluruh daftar resep sekaligus (replacesemua baris lama)
      const { product_id, items } = data;
      const productCheck: any[] = await query(
        "SELECT id FROM menu WHERE id = ?",
        [product_id],
      );
      if (!Array.isArray(productCheck) || productCheck.length === 0) {
        return Response.json(
          { success: false, error: "Produk tidak ditemukan" },
          { status: 404 },
        );
      }

      await query("DELETE FROM product_recipe WHERE product_id = ?", [
        product_id,
      ]);
      for (const item of items || []) {
        if (item.raw_material_id && Number(item.takaran) > 0) {
          const biaya = await hitungBiayaBaris(
            item.raw_material_id,
            Number(item.takaran),
          );
          const id = await generateId();
          await query(
            `INSERT INTO product_recipe (id, product_id, raw_material_id, takaran, biaya)
             VALUES (?, ?, ?, ?, ?)`,
            [id, product_id, item.raw_material_id, item.takaran, biaya],
          );
        }
      }
      await recalculateProduct(product_id);
      return Response.json({ success: true });
    }

    if (data.action === "update_margin") {
      const { product_id, margin_percent, harga_jual } = data;
      const updateFields: Record<string, any> = {};
      if (Object.prototype.hasOwnProperty.call(data, "margin_percent")) {
        updateFields.margin_percent = margin_percent;
      }
      if (Object.prototype.hasOwnProperty.call(data, "harga_jual")) {
        updateFields.harga_jual = harga_jual;
        // Sinkronkan harga legacy agar kasir/POS memakai harga jual terbaru
        updateFields.harga = harga_jual;
      }
      if (Object.keys(updateFields).length === 0) {
        return Response.json(
          { success: false, error: "Tidak ada field untuk diupdate" },
          { status: 400 },
        );
      }
      const setClauses = Object.keys(updateFields)
        .map((k) => `"${k}" = ?`)
        .join(", ");
      const values = Object.values(updateFields);
      values.push(product_id);
      await query(`UPDATE menu SET ${setClauses} WHERE id = ?`, values);
      await recalculateProduct(product_id);
      return Response.json({ success: true });
    }

    return Response.json(
      { success: false, error: "Invalid action" },
      { status: 400 },
    );
  } catch (error) {
    console.error("Product recipe error:", error);
    return Response.json(
      { error: "Failed to process product recipe request" },
      { status: 500 },
    );
  }
}