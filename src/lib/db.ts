import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const DB_HOST = process.env.DB_HOST!;
const DB_PORT = Number(process.env.DB_PORT);
const DB_DATABASE = process.env.DB_DATABASE!;
const DB_USERNAME = process.env.DB_USERNAME!;
const DB_PASSWORD = process.env.DB_PASSWORD!;
const DB_SSL = process.env.DB_SSL === "disable" ? false : "require";

// Bangun connection string postgres://user:pass@host:port/db
const connString = `postgres://${encodeURIComponent(DB_USERNAME)}:${encodeURIComponent(
  DB_PASSWORD,
)}@${DB_HOST}:${DB_PORT}/${DB_DATABASE}`;

const client = postgres(connString, {
  max: 10,
  ssl: DB_SSL,
});
export const db = drizzle(client, { schema });

/**
 * Buat tabel-tabel jika belum ada (PostgreSQL CREATE TABLE IF NOT EXISTS).
 * Kolom dijaga lowercase agar konsisten dengan query query().
 */
const TABLE_DDL: [string, string][] = [
  [
    "users",
    `CREATE TABLE IF NOT EXISTS users (
      id VARCHAR(36) PRIMARY KEY,
      nama VARCHAR(100) NOT NULL,
      username VARCHAR(50) NOT NULL UNIQUE,
      password VARCHAR(100) NOT NULL,
      role VARCHAR(10) NOT NULL DEFAULT 'Kasir'
    )`,
  ],
  [
    "menu",
    `CREATE TABLE IF NOT EXISTS menu (
      id VARCHAR(36) PRIMARY KEY,
      nama_menu VARCHAR(100) NOT NULL,
      kategori VARCHAR(50) NOT NULL,
      harga INT NOT NULL,
      stok INT NOT NULL DEFAULT 0,
      foto VARCHAR(10) DEFAULT '🍽️',
      status VARCHAR(20) NOT NULL DEFAULT 'Tersedia',
      hpp_total DECIMAL(14,2) NOT NULL DEFAULT 0,
      margin_percent DECIMAL(6,2) NULL,
      harga_jual DECIMAL(14,2) NOT NULL DEFAULT 0,
      is_deleted CHAR(1) NOT NULL DEFAULT 'f'
    )`,
  ],
  [
    "transaksi",
    `CREATE TABLE IF NOT EXISTS transaksi (
      id VARCHAR(36) PRIMARY KEY,
      tanggal TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      total INT NOT NULL,
      diskon INT NOT NULL DEFAULT 0,
      pajak INT NOT NULL DEFAULT 0,
      metode_bayar VARCHAR(20) NOT NULL,
      user_id VARCHAR(36) NOT NULL,
      customer_name VARCHAR(100) NULL,
      tunai INT NOT NULL DEFAULT 0,
      kembalian INT NOT NULL DEFAULT 0,
      deleted_at TIMESTAMP NULL
    )`,
  ],
  [
    "detail_transaksi",
    `CREATE TABLE IF NOT EXISTS detail_transaksi (
      id VARCHAR(36) PRIMARY KEY,
      transaksi_id VARCHAR(36) NOT NULL,
      menu_id VARCHAR(36) NOT NULL,
      nama_menu VARCHAR(100) NOT NULL,
      qty INT NOT NULL,
      harga INT NOT NULL,
      subtotal INT NOT NULL
    )`,
  ],
  [
    "stok_log",
    `CREATE TABLE IF NOT EXISTS stok_log (
      id VARCHAR(36) PRIMARY KEY,
      menu_id VARCHAR(36) NOT NULL,
      nama_menu VARCHAR(100) NOT NULL,
      jenis VARCHAR(10) NOT NULL,
      qty INT NOT NULL,
      tanggal TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      keterangan TEXT NULL
    )`,
  ],
  [
    "raw_materials",
    `CREATE TABLE IF NOT EXISTS raw_materials (
      id VARCHAR(36) PRIMARY KEY,
      nama_bahan VARCHAR(100) NOT NULL,
      harga_beli DECIMAL(14,2) NOT NULL DEFAULT 0,
      jumlah_beli DECIMAL(14,3) NOT NULL DEFAULT 1,
      satuan_beli VARCHAR(10) NOT NULL DEFAULT 'kg',
      harga_per_satuan_kecil DECIMAL(14,4) NOT NULL DEFAULT 0,
      satuan_kecil VARCHAR(10) NOT NULL DEFAULT 'gram',
      is_deleted CHAR(1) NOT NULL DEFAULT 'f',
      is_gabungan CHAR(1) NOT NULL DEFAULT 'f',
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
  ],
  [
    "product_recipe",
    `CREATE TABLE IF NOT EXISTS product_recipe (
      id VARCHAR(36) PRIMARY KEY,
      product_id VARCHAR(36) NOT NULL,
      raw_material_id VARCHAR(36) NOT NULL,
      takaran DECIMAL(14,3) NOT NULL DEFAULT 0,
      biaya DECIMAL(14,2) NOT NULL DEFAULT 0
    )`,
  ],
  [
    "bahan_gabung",
    `CREATE TABLE IF NOT EXISTS bahan_gabung (
      id VARCHAR(36) PRIMARY KEY,
      nama_gabungan VARCHAR(100) NOT NULL,
      satuan_kecil VARCHAR(10) NOT NULL DEFAULT 'pcs',
      total_harga DECIMAL(14,2) NOT NULL DEFAULT 0,
      data_komponen TEXT NOT NULL,
      jumlah_komponen INT NOT NULL DEFAULT 0,
      is_delete CHAR(1) NOT NULL DEFAULT 'f',
      update_at TIMESTAMP NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
  ],
];

let initPromise: Promise<void> | null = null;
function init() {
  if (!initPromise) {
    initPromise = (async () => {
      for (const [, ddl] of TABLE_DDL) {
        await client.unsafe(ddl);
      }
      // Migrasi kolom tunai & kembalian untuk tabel transaksi yang sudah ada
      await client.unsafe(
        `ALTER TABLE transaksi ADD COLUMN IF NOT EXISTS tunai INT NOT NULL DEFAULT 0`,
      );
      await client.unsafe(
        `ALTER TABLE transaksi ADD COLUMN IF NOT EXISTS kembalian INT NOT NULL DEFAULT 0`,
      );
    })().catch((err) => {
      initPromise = null;
      throw err;
    });
  }
  return initPromise;
}

export function getDb() {
  return db;
}

/**
 * Kompatibilitas dengan route yang memakai query(sql, params).
 * SQL ditulis dengan placeholder MySQL `?`, dikonversi ke PostgreSQL `$n`.
 */
export async function query(sql: string, params?: any[]) {
  await init();
  let converted = sql;
  const args: any[] = params || [];
  if (args.length > 0) {
    let i = 0;
    converted = sql.replace(/\?/g, () => `$${++i}`);
  }
  const result = await client.unsafe(converted, args);
  return result;
}

export async function softDelete(table: string, id: string): Promise<void> {
  try {
    const converted = `UPDATE "${table}" SET is_deleted = 't' WHERE id = $1`;
    await client.unsafe(converted, [id]);
  } catch (error) {
    console.warn(`Soft delete ke ${table} gagal:`, error);
  }
}

export const generateId = (prefix = "") => {
  return prefix + Date.now().toString();
};
