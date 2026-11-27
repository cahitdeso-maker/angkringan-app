"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  initializeData,
  getMenu,
  addTransaksi,
  getKategoriAktif,
  getTransaksiOptimized,
  formatRupiah,
  formatTanggalShort,
} from "@/lib/data";
import { Menu, Transaksi } from "@/lib/types";

interface CartItem {
  menu_id: string;
  nama_menu: string;
  harga: number;
  qty: number;
  subtotal: number;
}

export default function KasirPage() {
  const { user } = useAuth();
  const [menuList, setMenuList] = useState<Menu[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("Semua");
  const [diskon, setDiskon] = useState(0);
  const [pajak, setPajak] = useState(0);
  const [metodeBayar, setMetodeBayar] = useState<"Tunai" | "QRIS">("Tunai");
  const [tunai, setTunai] = useState(0);
  const [showReceipt, setShowReceipt] = useState(false);
  const [lastTransaction, setLastTransaction] = useState<Transaksi | null>(
    null,
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const [historyList, setHistoryList] = useState<Transaksi[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const openHistory = async () => {
    setShowHistory(true);
    setHistoryLoading(true);
    try {
      const today = new Date().toISOString().split("T")[0];
      const data = await getTransaksiOptimized({
        dateStart: today,
        dateEnd: today,
      });
      const sorted = [...data].sort(
        (a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime(),
      );
      setHistoryList(sorted);
    } catch (error) {
      console.error("Gagal memuat history:", error);
      setHistoryList([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      initializeData();
      const data = await getMenu();
      setMenuList(data);
    };

    loadData();
  }, []);

  const kategoriAktif = getKategoriAktif();
  const categories = useMemo(
    () => ["Semua", ...kategoriAktif],
    [kategoriAktif],
  );

  const filteredMenu = useMemo(
    () =>
      menuList.filter((m) => {
        const matchCategory =
          selectedCategory === "Semua" || m.kategori === selectedCategory;
        const matchSearch = m.nama_menu
          .toLowerCase()
          .includes(searchTerm.toLowerCase());
        const matchStatus = m.status === "Tersedia";
        const matchKategoriAktif = kategoriAktif.includes(m.kategori);
        return (
          matchCategory && matchSearch && matchStatus && matchKategoriAktif
        );
      }),
    [menuList, selectedCategory, searchTerm, kategoriAktif],
  );

  const addToCart = (menu: Menu) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.menu_id === menu.id);
      if (existing) {
        return prev.map((item) =>
          item.menu_id === menu.id
            ? {
                ...item,
                qty: item.qty + 1,
                subtotal: (item.qty + 1) * item.harga,
              }
            : item,
        );
      }
      return [
        ...prev,
        {
          menu_id: menu.id,
          nama_menu: menu.nama_menu,
          harga: menu.harga,
          qty: 1,
          subtotal: menu.harga,
        },
      ];
    });
  };

  const updateQty = (menuId: string, qty: number) => {
    if (qty <= 0) {
      setCart((prev) => prev.filter((item) => item.menu_id !== menuId));
      return;
    }
    setCart((prev) =>
      prev.map((item) =>
        item.menu_id === menuId
          ? { ...item, qty, subtotal: qty * item.harga }
          : item,
      ),
    );
  };

  const subtotal = cart.reduce((sum, item) => sum + item.subtotal, 0);
  const diskonAmount = (subtotal * diskon) / 100;
  const pajakAmount = (subtotal - diskonAmount) * (pajak / 100);
  const total = subtotal - diskonAmount + pajakAmount;
  const totalBayar = Math.round(total);
  const kembalian = tunai - totalBayar;
  const tunaiKurang = metodeBayar === "Tunai" && tunai < totalBayar;

  const handleBayar = async () => {
    if (cart.length === 0) {
      alert("Keranjang masih kosong!");
      return;
    }

    if (!user) {
      alert("Silakan login terlebih dahulu!");
      return;
    }

    if (metodeBayar === "Tunai" && tunai < totalBayar) {
      alert("Tunai kurang dari total belanja!");
      return;
    }

    const transaksi: Omit<Transaksi, "id"> = {
      tanggal: new Date().toISOString(),
      total: totalBayar,
      diskon,
      pajak,
      metode_bayar: metodeBayar,
      user_id: user.id,
      customerName: customerName || undefined,
      tunai: metodeBayar === "Tunai" ? tunai : 0,
      kembalian: metodeBayar === "Tunai" ? kembalian : 0,
      items: cart.map((item) => ({
        id: "",
        transaksi_id: "",
        menu_id: item.menu_id,
        nama_menu: item.nama_menu,
        qty: item.qty,
        harga: item.harga,
        subtotal: item.subtotal,
      })),
    };

    try {
      const saved = await addTransaksi(transaksi);
      setLastTransaction(saved);
      setShowReceipt(true);
      setCart([]);
      setDiskon(0);
      setPajak(0);
      setTunai(0);
      setCustomerName("");
    } catch (error) {
      console.error("Gagal menyimpan transaksi:", error);
      alert("Gagal menyimpan transaksi, silakan coba lagi.");
    }
  };

  const printReceipt = () => {
    if (!lastTransaction) return;
    window.print();
  };

  if (showReceipt && lastTransaction) {
    const date = new Date(lastTransaction.tanggal);
    return (
      <div className="max-w-sm mx-auto">
        <div className="card p-6 text-center">
          <div className="text-4xl mb-3">✅</div>
          <h2 className="text-xl font-bold text-angkringan-gold mb-2">
            Pembayaran Berhasil!
          </h2>
          <p className="text-angkringan-light/60 text-sm mb-4">
            Transaksi tersimpan
          </p>
          <div
            id="receipt"
            className="bg-white text-black"
            style={{
              width: "58mm",
              margin: "0 auto",
              padding: "3mm",
              fontFamily: "monospace",
              fontSize: "11px",
              lineHeight: "1.3",
            }}
          >
            {/* HEADER */}
            <div className="text-center">
              <div style={{ fontWeight: "900", fontSize: "16px" }}>
                GIAT COFFEE
              </div>
              <div>SPBU Pertamina 44.531.25 Ijo</div>
              <div>Jl. Nasional III Buniayu</div>
              <div>Tambak, Banyumas, Jawa Tengah</div>
              <div>Telp. 085-175-078-071</div>
            </div>
            <hr className="border-0 border-t-2 border-gray-500 my-2" />
            <div>
              <div>
                {date.toLocaleDateString("id-ID")}{" "}
                {date
                  .toLocaleTimeString("id-ID", {
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: false,
                  })
                  .replace(".", ":")}
              </div>
              {lastTransaction.customerName && (
                <div>Pelanggan : {lastTransaction.customerName}</div>
              )}
            </div>
            <hr className="border-0 border-t-2 border-gray-500 my-2" />

            <div className="border-b-2 border-gray-500 pb-2 mb-2">
              {lastTransaction.items.map((item, idx) => (
                <div key={idx} className="flex justify-between text-xs mb-1">
                  <span>
                    {item.nama_menu} x{item.qty}
                  </span>
                  <span>{formatRupiah(item.subtotal)}</span>
                </div>
              ))}
            </div>
            <div className="flex justify-between font-bold mb-1">
              <span>TOTAL</span>
              <span>{formatRupiah(lastTransaction.total)}</span>
            </div>
            <div className="text-center mt-3 pt-2 border-t-2 border-gray-500 text-xs">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>
                  {formatRupiah(
                    lastTransaction.items.reduce(
                      (sum, item) => sum + item.subtotal,
                      0,
                    ),
                  )}
                </span>
              </div>

              {lastTransaction.diskon > 0 && (
                <div className="flex justify-between">
                  <span>Diskon ({lastTransaction.diskon}%)</span>
                  <span>
                    -{" "}
                    {formatRupiah(
                      (lastTransaction.items.reduce(
                        (sum, item) => sum + item.subtotal,
                        0,
                      ) *
                        lastTransaction.diskon) /
                        100,
                    )}
                  </span>
                </div>
              )}

              {lastTransaction.pajak > 0 && (
                <div className="flex justify-between">
                  <span>Pajak ({lastTransaction.pajak}%)</span>
                  <span>
                    +{" "}
                    {formatRupiah(
                      ((lastTransaction.items.reduce(
                        (sum, item) => sum + item.subtotal,
                        0,
                      ) *
                        (100 - lastTransaction.diskon)) /
                        100) *
                        (lastTransaction.pajak / 100),
                    )}
                  </span>
                </div>
              )}
            </div>
            <div className="flex justify-between text-xs">
              <span>Metode Bayar</span>
              <span>{lastTransaction.metode_bayar}</span>
            </div>
            {lastTransaction.metode_bayar === "Tunai" && (
              <>
                <div className="flex justify-between text-xs">
                  <span>Tunai</span>
                  <span>{formatRupiah(lastTransaction.tunai || 0)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span>Kembalian</span>
                  <span>{formatRupiah(lastTransaction.kembalian || 0)}</span>
                </div>
              </>
            )}
            <div className="text-center mt-3 pt-2 border-t-2 border-gray-500 text-xs">
              <p>
                Terima Kasih</p>
              <p>Selamat Menikmati</p>
              <div>Kasir : {user?.nama}</div>
            </div>
          </div>
          <div className="flex gap-2 mt-4 no-print">
            <button onClick={printReceipt} className="btn-primary flex-1">
              🖨️ Cetak Struk
            </button>
            <button
              onClick={() => setShowReceipt(false)}
              className="btn-primary flex-1 bg-angkringan-secondary"
            >
              Transaksi Baru
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-4">
      <div className="flex flex-col">
        <div className="mb-3 flex items-start justify-between gap-2">
          <div>
            <h1 className="text-xl font-bold text-angkringan-gold">
              💳 POS Kasir
            </h1>
            <p className="text-angkringan-light/60 text-sm">
              Pilih menu untuk menambah transaksi
            </p>
          </div>
          <button
            onClick={openHistory}
            className="btn-primary text-xs px-3 py-1.5 whitespace-nowrap no-print"
          >
            🕒 History Order
          </button>
        </div>
        <input
          type="text"
          placeholder="Cari menu..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="input-field mb-2"
        />
        <div className="flex gap-2 overflow-x-auto pb-2 mb-2">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-all ${
                selectedCategory === cat
                  ? "bg-angkringan-primary text-white"
                  : "bg-angkringan-warm text-angkringan-light/70 hover:bg-angkringan-primary/30"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {filteredMenu.map((menu) => (
            <button
              key={menu.id}
              onClick={() => addToCart(menu)}
              className="card-hover text-center p-3"
            >
              <span className="text-3xl block mb-1">{menu.foto}</span>
              <p className="text-sm font-medium text-angkringan-light truncate">
                {menu.nama_menu}
              </p>
              <p className="text-angkringan-accent font-semibold text-sm">
                {formatRupiah(menu.harga)}
              </p>
            </button>
          ))}
        </div>
      </div>
      <div className="flex flex-col bg-angkringan-warm border border-angkringan-primary/30 rounded-xl h-[calc(100vh-140px)]">
        <div className="p-3 border-b border-angkringan-primary/30">
          <h2 className="font-semibold text-angkringan-gold">
            🛒 Keranjang ({cart.length} item)
          </h2>
        </div>
        <div className="px-3 pt-2">
          <input
            type="text"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            className="input-field text-sm py-2"
            placeholder="Nama pelanggan..."
          />
        </div>
        <div className="flex-1 px-3">
          {cart.length === 0 ? (
            <p className="text-center text-angkringan-light/40 py-8">
              Belum ada menu dipilih
            </p>
          ) : (
            <div className="space-y-2 py-2">
              {cart.map((item) => (
                <div
                  key={item.menu_id}
                  className="flex items-center gap-2 p-2 bg-angkringan-dark rounded-lg"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-angkringan-light truncate">
                      {item.nama_menu}
                    </p>
                    <p className="text-xs text-angkringan-accent">
                      {formatRupiah(item.harga)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => updateQty(item.menu_id, item.qty - 1)}
                      className="w-6 h-6 flex items-center justify-center bg-angkringan-primary/30 rounded text-angkringan-gold text-sm"
                    >
                      -
                    </button>
                    <span className="w-8 text-center text-angkringan-light text-sm">
                      {item.qty}
                    </span>
                    <button
                      onClick={() => updateQty(item.menu_id, item.qty + 1)}
                      className="w-6 h-6 flex items-center justify-center bg-angkringan-primary/30 rounded text-angkringan-gold text-sm"
                    >
                      +
                    </button>
                  </div>
                  <p className="text-sm font-semibold text-angkringan-accent w-20 text-right">
                    {formatRupiah(item.subtotal)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="p-3 border-t border-angkringan-primary/30 space-y-3 bg-angkringan-dark">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-angkringan-light/60">
                Diskon (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={diskon === 0 ? "" : diskon}
                onChange={(e) => setDiskon(Number(e.target.value) || 0)}
                className="input-field text-sm py-1"
                placeholder="0"
              />
            </div>
            <div>
              <label className="text-xs text-angkringan-light/60">
                Pajak (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={pajak === 0 ? "" : pajak}
                onChange={(e) => setPajak(Number(e.target.value) || 0)}
                className="input-field text-sm py-1"
                placeholder="0"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-1">
            {(["Tunai", "QRIS"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMetodeBayar(m)}
                className={`px-2 py-1.5 text-xs rounded-lg transition-all ${metodeBayar === m ? "bg-angkringan-primary text-white" : "bg-angkringan-warm text-angkringan-light/60 hover:bg-angkringan-primary/30"}`}
              >
                {m}
              </button>
            ))}
          </div>
          {metodeBayar === "Tunai" && (
            <div>
              <label className="text-xs text-angkringan-light/60">
                Tunai (Rp)
              </label>
              <input
                type="number"
                min="0"
                value={tunai === 0 ? "" : tunai}
                onChange={(e) => setTunai(Number(e.target.value) || 0)}
                className="input-field text-sm py-1"
                placeholder="0"
              />
            </div>
          )}
          <div className="space-y-1 text-sm">
            <div className="flex justify-between text-angkringan-light/60">
              <span>Subtotal</span>
              <span>{formatRupiah(subtotal)}</span>
            </div>
            {diskon > 0 && (
              <div className="flex justify-between text-red-400">
                <span>Diskon {diskon}%</span>
                <span>-{formatRupiah(diskonAmount)}</span>
              </div>
            )}
            {pajak > 0 && (
              <div className="flex justify-between text-angkringan-light/60">
                <span>Pajak {pajak}%</span>
                <span>+{formatRupiah(pajakAmount)}</span>
              </div>
            )}
            <div className="flex justify-between text-lg font-bold text-angkringan-gold border-t border-angkringan-primary/30 pt-2">
              <span>Total Belanja</span>
              <span>{formatRupiah(totalBayar)}</span>
            </div>
            {metodeBayar === "Tunai" && (
              <>
                <div className="flex justify-between text-angkringan-light/60">
                  <span>Tunai</span>
                  <span>{formatRupiah(tunai)}</span>
                </div>
                {tunaiKurang ? (
                  <div className="flex justify-between text-red-400 font-semibold">
                    <span>Tunai Kurang</span>
                    <span>{formatRupiah(totalBayar - tunai)}</span>
                  </div>
                ) : (
                  <div className="flex justify-between text-green-400 font-semibold">
                    <span>Kembalian</span>
                    <span>{formatRupiah(kembalian)}</span>
                  </div>
                )}
              </>
            )}
          </div>
          <button
            onClick={handleBayar}
            disabled={cart.length === 0 || tunaiKurang}
            className="btn-primary w-full py-3 text-lg"
          >
            💳 Bayar {formatRupiah(totalBayar)}
          </button>
        </div>
      </div>

      {showHistory && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm no-print"
          onClick={() => setShowHistory(false)}
        >
          <div
            className="w-full max-w-lg card p-6 max-h-[80vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-angkringan-gold">
                🕒 History Order
              </h2>
              <button
                onClick={() => setShowHistory(false)}
                className="text-angkringan-light/60 hover:text-angkringan-light text-xl"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-2">
              {historyLoading ? (
                <p className="text-center text-angkringan-light/50 py-8">
                  Memuat history...
                </p>
              ) : historyList.length === 0 ? (
                <p className="text-center text-angkringan-light/50 py-8">
                  Belum ada transaksi
                </p>
              ) : (
                historyList.map((t) => (
                  <div
                    key={t.id}
                    className="bg-angkringan-dark/60 rounded-xl p-3 border border-angkringan-primary/10"
                  >
                    <div className="flex items-start justify-between mb-1.5">
                      <div>
                        <p className="text-xs text-angkringan-light/60 font-mono">
                          {formatTanggalShort(t.tanggal)}
                        </p>
                        <p className="text-xs text-angkringan-light/80 mt-0.5">
                          {t.customerName || "Walk-in"}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0 ml-2">
                        <p className="text-sm font-bold text-angkringan-accent">
                          {formatRupiah(t.total)}
                        </p>
                        <span className="inline-block mt-0.5 text-[9px] px-1.5 py-0.5 rounded bg-angkringan-primary/30 text-angkringan-gold">
                          {t.metode_bayar}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1 pt-1.5 border-t border-angkringan-primary/10">
                      {t.items.map((item, idx) => (
                        <span
                          key={idx}
                          className="bg-angkringan-primary/20 text-angkringan-gold text-[10px] px-2 py-0.5 rounded-full"
                        >
                          {item.nama_menu} x{item.qty}
                        </span>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
