-- ===== FITUR GABUNG BAHAN: Data Hasil Gabung =====
-- Menyimpan hasil penggabungan beberapa bahan baku menjadi satu paket.
CREATE TABLE IF NOT EXISTS bahan_gabung (
  id VARCHAR(36) PRIMARY KEY,
  nama_gabungan VARCHAR(100) NOT NULL,
  satuan_kecil ENUM('gram', 'ml', 'pcs') NOT NULL DEFAULT 'pcs',
  total_harga DECIMAL(14, 2) NOT NULL DEFAULT 0,
  data_komponen TEXT NOT NULL,
  jumlah_komponen INT NOT NULL DEFAULT 0,
  is_delete CHAR(1) NOT NULL DEFAULT 'f',
  update_at TIMESTAMP NULL DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE INDEX idx_bahan_gabung_created_at ON bahan_gabung(created_at);

-- Backward compatibility untuk tabel yang sudah dibuat tanpa kolom ini
ALTER TABLE bahan_gabung ADD COLUMN IF NOT EXISTS is_delete CHAR(1) NOT NULL DEFAULT 'f';
ALTER TABLE bahan_gabung ADD COLUMN IF NOT EXISTS update_at TIMESTAMP NULL DEFAULT NULL;
ALTER TABLE bahan_gabung ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;