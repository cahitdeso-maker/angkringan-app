-- ==================== FITUR HPP (Harga Pokok Penjualan) ====================
-- MySQL-compatible migration (works on MySQL 8+)

-- Bahan baku master (dipakai di banyak produk, tidak terhubung ke stok)
CREATE TABLE IF NOT EXISTS raw_materials (
  id VARCHAR(36) PRIMARY KEY,
  nama_bahan VARCHAR(100) NOT NULL,
  harga_beli DECIMAL(14, 2) NOT NULL DEFAULT 0,
  jumlah_beli DECIMAL(14, 3) NOT NULL DEFAULT 1,
  satuan_beli ENUM('kg', 'gram', 'liter', 'ml', 'pcs') NOT NULL DEFAULT 'kg',
  harga_per_satuan_kecil DECIMAL(14, 4) NOT NULL DEFAULT 0,
  satuan_kecil ENUM('gram', 'ml', 'pcs') NOT NULL DEFAULT 'gram',
  is_deleted CHAR(1) NOT NULL DEFAULT 'f',
  is_gabungan CHAR(1) NOT NULL DEFAULT 'f',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Resep/Komposisi produk (many-to-many products <-> raw_materials)
CREATE TABLE IF NOT EXISTS product_recipe (
  id VARCHAR(36) PRIMARY KEY,
  product_id VARCHAR(36) NOT NULL,
  raw_material_id VARCHAR(36) NOT NULL,
  takaran DECIMAL(14, 3) NOT NULL DEFAULT 0,
  biaya DECIMAL(14, 2) NOT NULL DEFAULT 0,
  FOREIGN KEY (product_id) REFERENCES menu(id),
  FOREIGN KEY (raw_material_id) REFERENCES raw_materials(id)
);

-- Tambah kolom HPP ke tabel menu jika belum ada
SET @db_name = DATABASE();

SET @col_exists = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db_name AND TABLE_NAME = 'menu' AND COLUMN_NAME = 'hpp_total'
);
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE menu ADD COLUMN hpp_total DECIMAL(14, 2) NOT NULL DEFAULT 0',
  'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db_name AND TABLE_NAME = 'menu' AND COLUMN_NAME = 'margin_percent'
);
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE menu ADD COLUMN margin_percent DECIMAL(6, 2) NULL',
  'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db_name AND TABLE_NAME = 'menu' AND COLUMN_NAME = 'harga_jual'
);
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE menu ADD COLUMN harga_jual DECIMAL(14, 2) NOT NULL DEFAULT 0',
  'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db_name AND TABLE_NAME = 'menu' AND COLUMN_NAME = 'is_deleted'
);
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE menu ADD COLUMN is_deleted CHAR(1) NOT NULL DEFAULT ''f''',
  'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Index untuk performa
SET @idx_exists = (
  SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = @db_name AND TABLE_NAME = 'raw_materials' AND INDEX_NAME = 'idx_raw_materials_nama'
);
SET @sql = IF(@idx_exists = 0,
  'CREATE INDEX idx_raw_materials_nama ON raw_materials(nama_bahan)',
  'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @idx_exists = (
  SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = @db_name AND TABLE_NAME = 'product_recipe' AND INDEX_NAME = 'idx_product_recipe_product_id'
);
SET @sql = IF(@idx_exists = 0,
  'CREATE INDEX idx_product_recipe_product_id ON product_recipe(product_id)',
  'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @idx_exists = (
  SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = @db_name AND TABLE_NAME = 'product_recipe' AND INDEX_NAME = 'idx_product_recipe_raw_material_id'
);
SET @sql = IF(@idx_exists = 0,
  'CREATE INDEX idx_product_recipe_raw_material_id ON product_recipe(raw_material_id)',
  'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Backfill harga_jual dari harga yang sudah ada (untuk data lama)
UPDATE menu SET harga_jual = harga WHERE harga_jual = 0 OR harga_jual IS NULL;