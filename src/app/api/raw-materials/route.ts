import { query, generateId } from "../../../lib/db";
import {
  hitungHargaPerSatuanKecil,
  SatuanBeli,
} from "../../../lib/hpp";

function normalizeRawMaterial(row: any) {
  return {
    ...row,
    harga_beli: Number(row.harga_beli),
    jumlah_beli: Number(row.jumlah_beli),
    harga_per_satuan_kecil: Number(row.harga_per_satuan_kecil),
  };
}

/** Recalculate biaya semua resep yang memakai bahan ini + HPP produk terkait. */
async function recalculateAffectedProducts(rawMaterialId: string) {
  // Update biaya untuk semua baris resep yang memakai bahan ini
  await query(
    `UPDATE product_recipe
     SET biaya = takaran * (
       SELECT harga_per_satuan_kecil FROM raw_materials rm
       WHERE rm.id = product_recipe.raw_material_id
     )
     WHERE raw_material_id = ?`,
    [rawMaterialId],
  );

  // Update hpp_total, harga_jual & harga legacy untuk semua produk terpengaruh
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
     harga = CASE
       WHEN m.margin_percent IS NOT NULL AND m.hpp_total > 0
       THEN ROUND(m.hpp_total * (1 + m.margin_percent / 100), 0)
       ELSE m.harga
     END
     WHERE m.id IN (
       SELECT DISTINCT product_id FROM product_recipe WHERE raw_material_id = ?
     )`,
    [rawMaterialId],
  );
}

export async function GET() {
  try {
    const materials = await query(
      `SELECT id, nama_bahan, harga_beli, jumlah_beli, satuan_beli,
              harga_per_satuan_kecil, satuan_kecil, is_deleted, is_gabungan
       FROM raw_materials
       WHERE is_deleted = 'f'
       ORDER BY nama_bahan ASC`,
    );
    return Response.json(
      Array.isArray(materials) ? materials.map(normalizeRawMaterial) : [],
    );
  } catch (error) {
    console.error("Raw materials fetch error:", error);
    return Response.json(
      { error: "Failed to fetch raw materials" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();

    if (data.action === "create") {
      const rm = data.rawMaterial || data.material;
      const { hargaPerSatuanKecil, satuanKecil } = hitungHargaPerSatuanKecil(
        Number(rm.harga_beli),
        Number(rm.jumlah_beli),
        rm.satuan_beli as SatuanBeli,
      );
      const id = await generateId();
      await query(
        `INSERT INTO raw_materials
           (id, nama_bahan, harga_beli, jumlah_beli, satuan_beli,
            harga_per_satuan_kecil, satuan_kecil, is_deleted, is_gabungan,
            created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'f', 'f', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [
          id,
          rm.nama_bahan,
          rm.harga_beli,
          rm.jumlah_beli,
          rm.satuan_beli,
          hargaPerSatuanKecil,
          satuanKecil,
        ],
      );
      return Response.json({
        success: true,
        rawMaterial: {
          id,
          nama_bahan: rm.nama_bahan,
          harga_beli: rm.harga_beli,
          jumlah_beli: rm.jumlah_beli,
          satuan_beli: rm.satuan_beli,
          harga_per_satuan_kecil: hargaPerSatuanKecil,
          satuan_kecil: satuanKecil,
        },
      });
    }

    if (data.action === "update") {
      const { id, data: updateData } = data;

      const existing = await query(
        `SELECT * FROM raw_materials WHERE id = ?`,
        [id],
      );
      if (!Array.isArray(existing) || existing.length === 0) {
        return Response.json(
          { success: false, error: "Bahan baku tidak ditemukan" },
          { status: 404 },
        );
      }

      const current = existing[0];
      const hargaBeli =
        Object.prototype.hasOwnProperty.call(updateData, "harga_beli")
          ? Number(updateData.harga_beli)
          : Number(current.harga_beli);
      const jumlahBeli =
        Object.prototype.hasOwnProperty.call(updateData, "jumlah_beli")
          ? Number(updateData.jumlah_beli)
          : Number(current.jumlah_beli);
      const satuanBeli =
        Object.prototype.hasOwnProperty.call(updateData, "satuan_beli")
          ? updateData.satuan_beli
          : current.satuan_beli;

      // Validasi: harga jual & jumlah harus > 0
      if (hargaBeli <= 0 || jumlahBeli <= 0) {
        return Response.json(
          { success: false, error: "Harga beli & jumlah beli harus > 0" },
          { status: 400 },
        );
      }

      const { hargaPerSatuanKecil, satuanKecil } = hitungHargaPerSatuanKecil(
        hargaBeli,
        jumlahBeli,
        satuanBeli as SatuanBeli,
      );

      const updateFields: Record<string, any> = {
        harga_per_satuan_kecil: hargaPerSatuanKecil,
        satuan_kecil: satuanKecil,
      };
      for (const key of ["nama_bahan", "harga_beli", "jumlah_beli", "satuan_beli"]) {
        if (Object.prototype.hasOwnProperty.call(updateData, key)) {
          updateFields[key] = updateData[key];
        }
      }

      const fieldKeys = Object.keys(updateFields);
      const setClauses = fieldKeys.map((k) => `"${k}" = ?`).join(", ");
      const updateValues = Object.values(updateFields);
      updateValues.push(id);
      await query(
        `UPDATE raw_materials SET ${setClauses} WHERE id = ?`,
        updateValues,
      );

      // Recalc semua produk yang memakai bahan ini (HPP otomatis ter-update)
      await recalculateAffectedProducts(id);

      return Response.json({ success: true });
    }

    if (data.action === "merge") {
      const namaBahan = String(data.nama_bahan || "").trim();
      // Komponen: [{ raw_material_id, takaran }] — bisa > 1 bahan, tiap bahan dengan takaran
      const rawComponents: any[] = Array.isArray(data.components)
        ? data.components
        : [];

      if (!namaBahan) {
        return Response.json(
          { success: false, error: "Nama bahan gabungan wajib diisi" },
          { status: 400 },
        );
      }
      if (rawComponents.length < 1) {
        return Response.json(
          { success: false, error: "Pilih minimal 1 bahan untuk digabung" },
          { status: 400 },
        );
      }

      // Semua komponen wajib punya takaran > 0
      for (const c of rawComponents) {
        if (!c.raw_material_id || !(Number(c.takaran) > 0)) {
          return Response.json(
            { success: false, error: "Takaran setiap komponen harus > 0" },
            { status: 400 },
          );
        }
      }

      const ids = rawComponents.map((c) => c.raw_material_id);
      const placeholders = ids.map(() => "?").join(", ");
      const rows: any[] = await query(
        `SELECT id, nama_bahan, harga_per_satuan_kecil, satuan_kecil
         FROM raw_materials
         WHERE id IN (${placeholders}) AND is_deleted = 'f'`,
        ids,
      );
      if (!Array.isArray(rows) || rows.length !== ids.length) {
        return Response.json(
          { success: false, error: "Salah satu bahan tidak ditemukan" },
          { status: 404 },
        );
      }

      const byId = new Map(rows.map((r) => [r.id, r]));

      // Satuan kecil bahan gabungan = satuan komponen pertama
      const satuanKecil: string = rows[0].satuan_kecil;

      // Total per satuan kecil = Σ (harga_per_satuan_kecil × takaran komponen)
      const totalPerKecil = rawComponents.reduce(
        (s: number, c: any) =>
          s +
          Number(byId.get(c.raw_material_id).harga_per_satuan_kecil) *
            Number(c.takaran),
        0,
      );

      // Buat bahan gabungan baru: jumlah beli = 1 set, harga = total harga per satuan kecil
      const newId = await generateId();
      await query(
        `INSERT INTO raw_materials
           (id, nama_bahan, harga_beli, jumlah_beli, satuan_beli,
            harga_per_satuan_kecil, satuan_kecil, is_deleted, is_gabungan,
            created_at, updated_at)
         VALUES (?, ?, ?, 1, ?, ?, ?, 'f', 't', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [
          newId,
          namaBahan,
          totalPerKecil,
          satuanKecil as SatuanBeli,
          totalPerKecil,
          satuanKecil,
        ],
      );

      // Komponen TETAP dipertahankan (tidak dihapus) — hasil input pengguna tetap terpisah.
      // Bahan gabungan hanya menjadi entri master tambahan yang terpisah.

      return Response.json({
        success: true,
        rawMaterial: {
          id: newId,
          nama_bahan: namaBahan,
          harga_beli: totalPerKecil,
          jumlah_beli: 1,
          satuan_beli: satuanKecil,
          harga_per_satuan_kecil: totalPerKecil,
          satuan_kecil: satuanKecil,
          is_gabungan: "t",
        },
        affectedProducts: 0,
      });
    }

    if (data.action === "delete") {
      await query(
        "UPDATE raw_materials SET is_deleted = 't' WHERE id = ?",
        [data.id],
      );
      // Hapus baris resep yang memakai bahan ini
      await query("DELETE FROM product_recipe WHERE raw_material_id = ?", [
        data.id,
      ]);
      return Response.json({ success: true, deleted: data.id });
    }

    return Response.json(
      { success: false, error: "Invalid action" },
      { status: 400 },
    );
  } catch (error) {
    console.error("Raw materials error:", error);
    return Response.json(
      { error: "Failed to process raw materials request" },
      { status: 500 },
    );
  }
}