// ==================== PERHITUNGAN HPP (Harga Pokok Penjualan) ====================
// Modul murni kalkulasi biaya. Tidak terhubung ke sistem stok/inventory.

export type SatuanBeli = "kg" | "gram" | "liter" | "ml" | "pcs";
export type SatuanKecil = "gram" | "ml" | "pcs";

export const SATUAN_BELI_PILIHAN: SatuanBeli[] = [
  "kg",
  "gram",
  "liter",
  "ml",
  "pcs",
];

export const SATUAN_KECIL_LABEL: Record<SatuanKecil, string> = {
  gram: "gram",
  ml: "ml",
  pcs: "pcs",
};

export interface HargaPerSatuanResult {
  hargaPerSatuanKecil: number;
  satuanKecil: SatuanKecil;
}

/**
 * Konversi harga beli → harga per satuan kecil (gram/ml/pcs).
 *
 * Rumus:
 *  - kg    → per gram = harga_beli / (jumlah_beli × 1000)
 *  - gram  → per gram = harga_beli / jumlah_beli
 *  - liter → per ml   = harga_beli / (jumlah_beli × 1000)
 *  - ml    → per ml   = harga_beli / jumlah_beli
 *  - pcs   → per pcs  = harga_beli / jumlah_beli
 */
export function hitungHargaPerSatuanKecil(
  hargaBeli: number,
  jumlahBeli: number,
  satuanBeli: SatuanBeli,
): HargaPerSatuanResult {
  if (jumlahBeli <= 0 || hargaBeli < 0) {
    return { hargaPerSatuanKecil: 0, satuanKecil: normalisasiSatuan(satuanBeli) };
  }

  switch (satuanBeli) {
    case "kg":
      return {
        hargaPerSatuanKecil: hargaBeli / (jumlahBeli * 1000),
        satuanKecil: "gram",
      };
    case "gram":
      return {
        hargaPerSatuanKecil: hargaBeli / jumlahBeli,
        satuanKecil: "gram",
      };
    case "liter":
      return {
        hargaPerSatuanKecil: hargaBeli / (jumlahBeli * 1000),
        satuanKecil: "ml",
      };
    case "ml":
      return {
        hargaPerSatuanKecil: hargaBeli / jumlahBeli,
        satuanKecil: "ml",
      };
    case "pcs":
      return {
        hargaPerSatuanKecil: hargaBeli / jumlahBeli,
        satuanKecil: "pcs",
      };
    default:
      return {
        hargaPerSatuanKecil: hargaBeli / jumlahBeli,
        satuanKecil: "pcs",
      };
  }
}

/** Normalisasi satuan beli → satuan kecil (gram/ml/pcs). */
export function normalisasiSatuan(satuanBeli: SatuanBeli): SatuanKecil {
  if (satuanBeli === "kg" || satuanBeli === "gram") return "gram";
  if (satuanBeli === "liter" || satuanBeli === "ml") return "ml";
  return "pcs";
}

/** Biaya satu baris resep = takaran × harga per satuan kecil. */
export function hitungBiayaResep(
  takaran: number,
  hargaPerSatuanKecil: number,
): number {
  return takaran * hargaPerSatuanKecil;
}

/** HPP total produk = SUM(biaya) semua baris resep. */
export function hitungHppTotal(
  items: { takaran: number; hargaPerSatuanKecil: number }[],
): number {
  return items.reduce(
    (sum, item) => sum + hitungBiayaResep(item.takaran, item.hargaPerSatuanKecil),
    0,
  );
}

/** Harga jual disarankan = HPP × (1 + margin/100). */
export function hitungHargaJualDisarankan(
  hppTotal: number,
  marginPercent: number | null | undefined,
): number | null {
  if (
    hppTotal == null ||
    hppTotal <= 0 ||
    marginPercent == null ||
    marginPercent === undefined ||
    isNaN(marginPercent)
  ) {
    return null;
  }
  return hppTotal * (1 + marginPercent / 100);
}

/** Format desimal agar rapi untuk satuan kecil (gram/ml/pcs). */
export function formatDesimal(n: number | null | undefined, maxDec = 2): string {
  if (n == null || isNaN(n)) return "0";
  return new Intl.NumberFormat("id-ID", {
    minimumFractionDigits: 0,
    maximumFractionDigits: maxDec,
  }).format(n);
}