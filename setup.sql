CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(36) PRIMARY KEY,
  nama VARCHAR(100) NOT NULL,
  username VARCHAR(50) NOT NULL UNIQUE,
  password VARCHAR(100) NOT NULL,
  role ENUM('Owner', 'Admin', 'Kasir') NOT NULL DEFAULT 'Kasir'
);

CREATE TABLE IF NOT EXISTS menu (
  id VARCHAR(36) PRIMARY KEY,
  nama_menu VARCHAR(100) NOT NULL,
  kategori ENUM('Nasi', 'Sate', 'Gorengan', 'Minuman', 'Kopi', 'Lauk') NOT NULL,
  harga INT NOT NULL,
  stok INT NOT NULL DEFAULT 0,
  foto VARCHAR(10) DEFAULT '🍽️',
  status ENUM('Tersedia', 'Habis') NOT NULL DEFAULT 'Tersedia',
  hpp_total DECIMAL(14, 2) NOT NULL DEFAULT 0,
  margin_percent DECIMAL(6, 2) NULL,
  harga_jual DECIMAL(14, 2) NOT NULL DEFAULT 0,
  is_deleted CHAR(1) NOT NULL DEFAULT 'f'
);

CREATE TABLE IF NOT EXISTS transaksi (
  id VARCHAR(36) PRIMARY KEY,
  tanggal DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  total INT NOT NULL,
  diskon INT DEFAULT 0,
  pajak INT DEFAULT 0,
  metode_bayar ENUM('Tunai', 'QRIS', 'Transfer', 'E-wallet') NOT NULL,
  user_id VARCHAR(36) NOT NULL,
  customer_name VARCHAR(100) NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS detail_transaksi (
  id VARCHAR(36) PRIMARY KEY,
  transaksi_id VARCHAR(36) NOT NULL,
  menu_id VARCHAR(36) NOT NULL,
  nama_menu VARCHAR(100) NOT NULL,
  qty INT NOT NULL,
  harga INT NOT NULL,
  subtotal INT NOT NULL,
  FOREIGN KEY (transaksi_id) REFERENCES transaksi(id),
  FOREIGN KEY (menu_id) REFERENCES menu(id)
);

CREATE TABLE IF NOT EXISTS stok_log (
  id VARCHAR(36) PRIMARY KEY,
  menu_id VARCHAR(36) NOT NULL,
  nama_menu VARCHAR(100) NOT NULL,
  jenis ENUM('Masuk', 'Keluar') NOT NULL,
  qty INT NOT NULL,
  tanggal DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  keterangan TEXT,
  FOREIGN KEY (menu_id) REFERENCES menu(id)
);

-- ===== FITUR HPP: Bahan Baku Master =====
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

-- ===== FITUR HPP: Resep/Komposisi Produk =====
CREATE TABLE IF NOT EXISTS product_recipe (
  id VARCHAR(36) PRIMARY KEY,
  product_id VARCHAR(36) NOT NULL,
  raw_material_id VARCHAR(36) NOT NULL,
  takaran DECIMAL(14, 3) NOT NULL DEFAULT 0,
  biaya DECIMAL(14, 2) NOT NULL DEFAULT 0,
  FOREIGN KEY (product_id) REFERENCES menu(id),
  FOREIGN KEY (raw_material_id) REFERENCES raw_materials(id)
);

-- ===== FITUR GABUNG BAHAN: Data Hasil Gabung =====
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

INSERT IGNORE INTO users (id, nama, username, password, role) VALUES
('usr_owner', 'Pemilik Angkringan', 'owner', 'owner123', 'Owner'),
('usr_admin', 'Admin Warung', 'admin', 'admin123', 'Admin'),
('usr_kasir', 'Kasir Warung', 'kasir', 'kasir123', 'Kasir');

INSERT IGNORE INTO menu (id, nama_menu, kategori, harga, stok, foto, status) VALUES
('menu_001', 'Nasi Kucing', 'Nasi', 3000, 50, '🍚', 'Tersedia'),
('menu_002', 'Nasi Pecel', 'Nasi', 8000, 30, '🍛', 'Tersedia'),
('menu_003', 'Sate Usus', 'Sate', 2000, 40, '🍢', 'Tersedia'),
('menu_004', 'Sate Telur Puyuh', 'Sate', 2500, 35, '🥚', 'Tersedia'),
('menu_005', 'Tahu Goreng', 'Gorengan', 1000, 60, '🧈', 'Tersedia'),
('menu_006', 'Tempe Goreng', 'Gorengan', 1000, 60, '🫘', 'Tersedia'),
('menu_007', 'Pisang Goreng', 'Gorengan', 1500, 40, '🍌', 'Tersedia'),
('menu_008', 'Es Teh', 'Minuman', 3000, 50, '🧋', 'Tersedia'),
('menu_009', 'Es Jeruk', 'Minuman', 4000, 40, '🍊', 'Tersedia'),
('menu_010', 'Kopi Hitam', 'Kopi', 4000, 50, '☕', 'Tersedia'),
('menu_011', 'Kopi Susu', 'Kopi', 6000, 40, '🥛', 'Tersedia'),
('menu_012', 'Telur Dadar', 'Lauk', 3000, 30, '🍳', 'Tersedia'),
('menu_013', 'Ikan Asin', 'Lauk', 2000, 25, '🐟', 'Tersedia'),
('menu_014', 'Air Mineral', 'Minuman', 3000, 50, '💧', 'Tersedia'),
('menu_015', 'Soto', 'Nasi', 10000, 20, '🍜', 'Tersedia');