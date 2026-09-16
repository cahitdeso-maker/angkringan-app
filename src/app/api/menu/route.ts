import { query, generateId } from "../../../lib/db";

function normalizeMenuRow(row: any) {
  return {
    ...row,
    status: row.is_deleted === "t" ? "Tidak Tersedia" : "Tersedia",
    harga: Number(row.harga),
    hpp_total: Number(row.hpp_total || 0),
    margin_percent:
      row.margin_percent == null ? null : Number(row.margin_percent),
    harga_jual: Number(row.harga_jual || row.harga || 0),
  };
}

export async function GET() {
  try {
    const menu = await query(
      `SELECT id, nama_menu, kategori, harga, foto, is_deleted,
              hpp_total, margin_percent, harga_jual
       FROM menu
       WHERE is_deleted = 'f'
       ORDER BY nama_menu ASC`,
    );
    return Response.json(Array.isArray(menu) ? menu.map(normalizeMenuRow) : []);
  } catch (error) {
    console.error("Menu fetch error:", error);
    return Response.json({ error: "Failed to fetch menu" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();

    if (data.action === "create") {
      const menu = data.menu;
      const id = await generateId();
      await query(
        `INSERT INTO menu (id, nama_menu, kategori, harga, foto, is_deleted,
                           hpp_total, margin_percent, harga_jual)
         VALUES (?, ?, ?, ?, ?, 'f', 0, NULL, ?)`,
        [
          id,
          menu.nama_menu,
          menu.kategori,
          menu.harga,
          menu.foto || "🍽️",
          menu.harga_jual || menu.harga || 0,
        ],
      );
      return Response.json({
        success: true,
        menu: {
          ...menu,
          id,
          status: "Tersedia",
          hpp_total: 0,
          margin_percent: null,
          harga_jual: Number(menu.harga_jual || menu.harga || 0),
        },
      });
    }

    if (data.action === "update") {
      const { id, data: updateData } = data;
      const updateFields: Record<string, any> = {};

      for (const key of ["nama_menu", "kategori", "harga", "foto", "harga_jual"]) {
        if (Object.prototype.hasOwnProperty.call(updateData, key)) {
          updateFields[key] = updateData[key];
        }
      }
      if (Object.prototype.hasOwnProperty.call(updateData, "status")) {
        updateFields.is_deleted =
          updateData.status === "Tidak Tersedia" ? "t" : "f";
      }
      if (Object.prototype.hasOwnProperty.call(updateData, "margin_percent")) {
        updateFields.margin_percent = updateData.margin_percent;
      }

      const fieldKeys = Object.keys(updateFields);
      if (fieldKeys.length === 0) {
        return Response.json(
          { success: false, error: "No fields to update" },
          { status: 400 },
        );
      }

      const setClauses = fieldKeys
        .map((k) => `"${k}" = ?`)
        .join(", ");
      const updateValues = Object.values(updateFields);
      updateValues.push(id);
      await query(
        `UPDATE menu SET ${setClauses} WHERE id = ?`,
        updateValues,
      );

      // Jika margin diubah & harga_jual tidak di-override manual,
      // hitung ulang harga jual dari HPP × margin
      if (Object.prototype.hasOwnProperty.call(updateData, "margin_percent")) {
        await query(
          `UPDATE menu
           SET harga_jual = CASE
             WHEN margin_percent IS NOT NULL AND hpp_total > 0
             THEN ROUND(hpp_total * (1 + margin_percent / 100), 0)
             ELSE harga_jual
           END
           WHERE id = ?`,
          [id],
        );
      }

      return Response.json({ success: true });
    }

    if (data.action === "delete") {
      await query("UPDATE menu SET is_deleted = 't' WHERE id = ?", [data.id]);
      return Response.json({ success: true, deleted: data.id });
    }

    return Response.json(
      { success: false, error: "Invalid action" },
      { status: 400 },
    );
  } catch (error) {
    console.error("Menu error:", error);
    return Response.json(
      { error: "Failed to process menu request" },
      { status: 500 },
    );
  }
}