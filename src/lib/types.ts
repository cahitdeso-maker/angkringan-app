export interface User {
  id: string;
  nama: string;
  username: string;
  password: string;
  role: "Admin" | "Kasir";
}

export type SatuanBeli = "kg" | "gram" | "liter" | "ml" | "pcs";
export type SatuanKecil = "gram" | "ml" | "pcs";

export interface RawMaterial {
  id: string;
  nama_bahan: string;
  harga_beli: number;
  jumlah_beli: number;
  satuan_beli: SatuanBeli;
  harga_per_satuan_kecil: number;
  satuan_kecil: SatuanKecil;
  is_deleted?: string;
  is_gabungan?: string | boolean;
}

export interface ProductRecipeItem {
  id: string;
  product_id: string;
  raw_material_id: string;
  nama_bahan?: string;
  takaran: number;
  biaya: number;
  satuan_kecil?: SatuanKecil;
  harga_per_satuan_kecil?: number;
}

export interface Menu {
  id: string;
  nama_menu: string;
  kategori: string;
  harga: number;
  foto: string;
  status: "Tersedia" | "Tidak Tersedia";
  hpp_total?: number;
  margin_percent?: number | null;
  harga_jual?: number;
}

export interface Transaksi {
  id: string;
  tanggal: string;
  total: number;
  diskon: number;
  pajak: number;
  metode_bayar: "Tunai" | "QRIS";
  user_id: string;
  customerName?: string;
  items: DetailTransaksi[];
}

export interface DetailTransaksi {
  id: string;
  transaksi_id: string;
  menu_id: string;
  nama_menu: string;
  qty: number;
  harga: number;
  subtotal: number;
}

export type PeriodeLaporan = "harian" | "mingguan" | "bulanan";