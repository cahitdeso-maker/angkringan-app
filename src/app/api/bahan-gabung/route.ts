import { query, generateId } from "../../../lib/db";

type KomponenGabung = {
  nama_bahan: string;
  takaran: number;
  biaya: number;
  satuan_kecil: string;
};

/**
 * Normalisasi baris DB → bentuk JSON untuk UI (parse data_komponen).
 */
function normalize(row: any) {
  let komponen: KomponenGabung[] = [];
  try {
    const parsed = JSON.parse(row.data_komponen || "[]");
    if (Array.isArray(parsed)) komponen = parsed;
  } catch {
    komponen = [];
  }
  return {
    id: row.id,
    nama_gabungan: row.nama_gabungan,
    satuan_kecil: row.satuan_kecil,
    total_harga: Number(row.total_harga),
    jumlah_komponen: Number(row.jumlah_komponen),
    is_delete: row.is_delete,
    update_at: row.update_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
    komponen,
  };
}

export async function GET() {
  try {
    const rows = await query(
      `SELECT id, nama_gabungan, satuan_kecil, total_harga, data_komponen,
              jumlah_komponen, is_delete, update_at, created_at, updated_at
       FROM bahan_gabung
       WHERE is_delete = 'f'
       ORDER BY created_at DESC`,
    );
    return Response.json(
      Array.isArray(rows) ? rows.map(normalize) : [],
    );
  } catch (error) {
    console.error("bahan_gabung fetch error:", error);
    return Response.json(
      { error: "Gagal mengambil data bahan gabung" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const nama = String(data.nama_gabungan || "").trim();
    const satuan = String(data.satuan_kecil || "pcs");
    const total = Number(data.total_harga || 0);
    const komponen: KomponenGabung[] = Array.isArray(data.komponen)
      ? data.komponen
      : [];

    if (!nama || komponen.length < 1) {
      return Response.json(
        { success: false, error: "Data bahan gabung tidak valid" },
        { status: 400 },
      );
    }

    const id = await generateId("bg_");
    await query(
      `INSERT INTO bahan_gabung
         (id, nama_gabungan, satuan_kecil, total_harga, data_komponen,
          jumlah_komponen, is_delete, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 'f', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [
        id,
        nama,
        satuan,
        total,
        JSON.stringify(komponen),
        komponen.length,
      ],
    );

    return Response.json({ success: true, id });
  } catch (error) {
    console.error("bahan_gabung save error:", error);
    return Response.json(
      { success: false, error: "Gagal menyimpan bahan gabung" },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request) {
  try {
    const data = await request.json();
    const id = String(data.id || "");
    if (!id) {
      return Response.json(
        { success: false, error: "id wajib diisi" },
        { status: 400 },
      );
    }
    const nama = String(data.nama_gabungan || "").trim();
    const satuan = String(data.satuan_kecil || "pcs");
    const total = Number(data.total_harga || 0);
    const komponen: KomponenGabung[] = Array.isArray(data.komponen)
      ? data.komponen
      : [];

    if (!nama || komponen.length < 1) {
      return Response.json(
        { success: false, error: "Data bahan gabung tidak valid" },
        { status: 400 },
      );
    }

    // Perbarui konten + tandai waktu diperbarui
    await query(
      `UPDATE bahan_gabung
       SET nama_gabungan = ?, satuan_kecil = ?, total_harga = ?,
           data_komponen = ?, jumlah_komponen = ?, update_at = CURRENT_TIMESTAMP
       WHERE id = ? AND is_delete = 'f'`,
      [
        nama,
        satuan,
        total,
        JSON.stringify(komponen),
        komponen.length,
        id,
      ],
    );
    return Response.json({ success: true });
  } catch (error) {
    console.error("bahan_gabung update error:", error);
    return Response.json(
      { success: false, error: "Gagal memperbarui bahan gabung" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return Response.json(
        { success: false, error: "id wajib diisi" },
        { status: 400 },
      );
    }
    // Soft delete: tandai is_delete = 't' agar tetap riwayat tersimpan
    await query(
      "UPDATE bahan_gabung SET is_delete = 't' WHERE id = ?",
      [id],
    );
    return Response.json({ success: true });
  } catch (error) {
    console.error("bahan_gabung delete error:", error);
    return Response.json(
      { success: false, error: "Gagal menghapus bahan gabung" },
      { status: 500 },
    );
  }
}
