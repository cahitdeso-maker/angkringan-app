-- ===== HAPUS KOLOM LAMA is_update DARI TABEL bahan_gabung =====
-- Kolom is_update (CHAR) tidak lagi dipakai; digantikan update_at (TIMESTAMP).
-- Jalankan di database pos_angkringan jika kolom is_update masih ada.

SET @db_name = DATABASE();
SET @exists = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db_name
    AND TABLE_NAME = 'bahan_gabung'
    AND COLUMN_NAME = 'is_update'
);
SET @sql = IF(@exists = 1,
  'ALTER TABLE bahan_gabung DROP COLUMN is_update',
  'SELECT ''is_update sudah tidak ada'' AS status');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
