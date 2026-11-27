import {
  pgTable,
  varchar,
  integer,
  decimal,
  text,
  timestamp,
  char,
  boolean,
} from "drizzle-orm/pg-core";

// ============================
// USERS
// ============================
export const users = pgTable("users", {
  id: varchar("id", { length: 36 }).primaryKey(),
  nama: varchar("nama", { length: 100 }).notNull(),
  username: varchar("username", { length: 50 }).notNull().unique(),
  password: varchar("password", { length:100 }).notNull(),
  role: varchar("role", { length: 10 }).notNull().default("Kasir"),
});

// ============================
// MENU
// ============================
export const menu = pgTable("menu", {
  id: varchar("id", { length: 36 }).primaryKey(),
  nama_menu: varchar("nama_menu", { length: 100 }).notNull(),
  kategori: varchar("kategori", { length: 50 }).notNull(),
  harga: integer("harga").notNull(),
  stok: integer("stok").notNull().default(0),
  foto: varchar("foto", { length: 10 }).default("🍽️"),
  status: varchar("status", { length: 20 }).notNull().default("Tersedia"),
  hpp_total: decimal("hpp_total", { precision: 14, scale: 2 }).default("0"),
  margin_percent: decimal("margin_percent", { precision: 6, scale: 2 }),
  harga_jual: decimal("harga_jual", { precision: 14, scale: 2 }).default("0"),
  is_deleted: char("is_deleted", { length: 1 }).notNull().default("f"),
});

// ============================
// TRANSAKSI
// ============================
export const transaksi = pgTable("transaksi", {
  id: varchar("id", { length: 36 }).primaryKey(),
  tanggal: timestamp("tanggal").notNull().defaultNow(),
  total: integer("total").notNull(),
  diskon: integer("diskon").default(0),
  pajak: integer("pajak").default(0),
  metode_bayar: varchar("metode_bayar", { length: 20 }).notNull(),
  user_id: varchar("user_id", { length: 36 }).notNull(),
  customerName: varchar("customer_name", { length: 100 }),
  tunai: integer("tunai").notNull().default(0),
  kembalian: integer("kembalian").notNull().default(0),
});

export const detailTransaksi = pgTable("detail_transaksi", {
  id: varchar("id", { length: 36 }).primaryKey(),
  transaksi_id: varchar("transaksi_id", { length: 36 }).notNull(),
  menu_id: varchar("menu_id", { length: 36 }).notNull(),
  nama_menu: varchar("nama_menu", { length: 100 }).notNull(),
  qty: integer("qty").notNull(),
  harga: integer("harga").notNull(),
  subtotal: integer("subtotal").notNull(),
});

// ============================
// STOK LOG
// ============================
export const stokLog = pgTable("stok_log", {
  id: varchar("id", { length: 36 }).primaryKey(),
  menu_id: varchar("menu_id", { length: 36 }).notNull(),
  nama_menu: varchar("nama_menu", { length: 100 }).notNull(),
  jenis: varchar("jenis", { length: 10 }).notNull(),
  qty: integer("qty").notNull(),
  tanggal: timestamp("tanggal").notNull().defaultNow(),
  keterangan: text("keterangan"),
});

// ============================
// BAHAN BAKU (RAW MATERIALS)
// ============================
export const rawMaterials = pgTable("raw_materials", {
  id: varchar("id", { length: 36 }).primaryKey(),
  nama_bahan: varchar("nama_bahan", { length: 100 }).notNull(),
  harga_beli: decimal("harga_beli", { precision: 14, scale: 2 }).default("0"),
  jumlah_beli: decimal("jumlah_beli", { precision: 14, scale: 3 }).default("1"),
  satuan_beli: varchar("satuan_beli", { length: 10 }).notNull().default("kg"),
  harga_per_satuan_kecil: decimal("harga_per_satuan_kecil", { precision: 14, scale: 4 }).default("0"),
  satuan_kecil: varchar("satuan_kecil", { length: 10 }).notNull().default("gram"),
  is_deleted: char("is_deleted", { length: 1 }).notNull().default("f"),
  is_gabungan: char("is_gabungan", { length: 1 }).notNull().default("f"),
  created_at: timestamp("created_at").notNull().defaultNow(),
  updated_at: timestamp("updated_at").notNull().defaultNow(),
});

// ============================
// PRODUCT RECIPE (RESEP)
// ============================
export const productRecipe = pgTable("product_recipe", {
  id: varchar("id", { length: 36 }).primaryKey(),
  product_id: varchar("product_id", { length: 36 }).notNull(),
  raw_material_id: varchar("raw_material_id", { length: 36 }).notNull(),
  takaran: decimal("takaran", { precision: 14, scale: 3 }).default("0"),
  biaya: decimal("biaya", { precision: 14, scale: 2 }).default("0"),
});

// ============================
// BAHAN GABUNG
// ============================
export const bahanGabung = pgTable("bahan_gabung", {
  id: varchar("id", { length: 36 }).primaryKey(),
  nama_gabungan: varchar("nama_gabungan", { length: 100 }).notNull(),
  satuan_kecil: varchar("satuan_kecil", { length: 10 }).notNull().default("pcs"),
  total_harga: decimal("total_harga", { precision: 14, scale: 2 }).default("0"),
  data_komponen: text("data_komponen").notNull(),
  jumlah_komponen: integer("jumlah_komponen").notNull().default(0),
  is_delete: char("is_delete", { length: 1 }).notNull().default("f"),
  update_at: timestamp("update_at"),
  created_at: timestamp("created_at").notNull().defaultNow(),
  updated_at: timestamp("updated_at").notNull().defaultNow(),
});
