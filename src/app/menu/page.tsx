"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  getMenu,
  addMenu,
  updateMenu,
  deleteMenu,
  getKategori,
  addKategori,
  updateKategori,
  deleteKategori,
  toggleStatusKategori,
  getKategoriAktif,
  formatRupiah,
  getRawMaterials,
  getProductRecipe,
  saveProductRecipe,
  updateProductMargin,
  KategoriItem,
} from "@/lib/data";
import { Menu, RawMaterial } from "@/lib/types";
import {
  hitungBiayaResep,
  hitungHppTotal,
} from "@/lib/hpp";

const EMOJIS =
  "🍚 🍛 🍜 🍢 🥚 🧈 🫘 🍌 🧋 🍊 ☕ 🥛 🍳 🐟 💧 🍽️ 🥟 🍗 🥩 🌭 🍔 🍟 🍕 🥪 🥤 🍰 🧁 🍩 🍫 🍮 🥥 🌽 🍠".split(
    " ",
  );

interface RecipeRowDraft {
  raw_material_id: string;
  takaran: number;
  biaya: number;
  _nama_bahan?: string;
  _satuan_kecil?: string;
  _harga_per_satuan_kecil?: number;
}

export default function MenuPage() {
  const [menuList, setMenuList] = useState<Menu[]>([]);
  const [kategoriList, setKategoriList] = useState<KategoriItem[]>([]);
  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [showKatModal, setShowKatModal] = useState(false);
  const [editingMenu, setEditingMenu] = useState<Menu | null>(null);
  const [showDelete, setShowDelete] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [newKatName, setNewKatName] = useState("");
  const [savingRecipe, setSavingRecipe] = useState(false);
  const [recipeError, setRecipeError] = useState("");
  const [recipeItems, setRecipeItems] = useState<RecipeRowDraft[]>([]);
  const [form, setForm] = useState({
    nama_menu: "",
    kategori: "",
    harga: 0,
    foto: "🍽️",
    status: "Tersedia" as Menu["status"],
  });
  const [marginPercent, setMarginPercent] = useState<number | "">("");

  // Inline edit state (inside kategori modal)
  const [editingKatId, setEditingKatId] = useState<string | null>(null);
  const [editingKatNama, setEditingKatNama] = useState("");
  // Inline confirm delete (inside kategori modal)
  const [confirmDeleteKatId, setConfirmDeleteKatId] = useState<string | null>(
    null,
  );

  const reload = async () => {
    const [menuData, rmData] = await Promise.all([
      getMenu(),
      getRawMaterials(),
    ]);
    setMenuList(menuData);
    setRawMaterials(rmData);
    setKategoriList(getKategori());
  };

  useEffect(() => {
    reload();
  }, []);

  const kategoriAktif = getKategoriAktif();
  const filteredMenu = menuList.filter(
    (m) =>
      m.nama_menu.toLowerCase().includes(searchTerm.toLowerCase()) &&
      kategoriAktif.includes(m.kategori),
  );

  const resetForm = () => {
    setForm({
      nama_menu: "",
      kategori: getKategoriAktif()[0] || "Nasi",
      harga: 0,
      foto: "🍽️",
      status: "Tersedia",
    });
    setEditingMenu(null);
    setRecipeItems([]);
    setMarginPercent("");
    setRecipeError("");
  };

  const openAdd = () => {
    resetForm();
    setShowModal(true);
  };

  const openEdit = async (menu: Menu) => {
    setForm({
      nama_menu: menu.nama_menu,
      kategori: menu.kategori,
      harga: menu.harga,
      foto: menu.foto,
      status: menu.status,
    });
    setEditingMenu(menu);
    setMarginPercent(
      menu.margin_percent == null ? "" : (menu.margin_percent as number),
    );
    setRecipeError("");

    // Load resep existing
    const recipe = await getProductRecipe(menu.id);
    setRecipeItems(
      recipe.map((r) => ({
        raw_material_id: r.raw_material_id,
        takaran: r.takaran,
        biaya: r.biaya,
        _nama_bahan: r.nama_bahan,
        _satuan_kecil: r.satuan_kecil || "",
        _harga_per_satuan_kecil: r.harga_per_satuan_kecil || 0,
      })),
    );
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nama_menu || form.harga <= 0) return;

    let savedId = editingMenu?.id;

    const finalHarga = form.harga;

    if (editingMenu) {
      await updateMenu(editingMenu.id, {
        nama_menu: form.nama_menu,
        kategori: form.kategori,
        harga: finalHarga,
        foto: form.foto,
        status: form.status,
      });
    } else {
      const created = await addMenu({
        ...form,
        harga: finalHarga,
      });
      savedId = created.id;
    }

    if (savedId) {
      setSavingRecipe(true);
      try {
        const validItems = recipeItems
          .filter((r) => r.raw_material_id && Number(r.takaran) > 0)
          .map((r) => ({
            raw_material_id: r.raw_material_id,
            takaran: Number(r.takaran),
          }));

        if (validItems.length > 0) {
          await saveProductRecipe(savedId, validItems);
        }

        if (marginPersen != null) {
          await updateProductMargin(savedId, {
            margin_percent: marginPersen,
            harga_jual: finalHarga,
          });
        }

        await reload();
      } catch (err: any) {
        setRecipeError(err.message || "Gagal menyimpan resep");
      } finally {
        setSavingRecipe(false);
      }
    }

    setShowModal(false);
    resetForm();
  };

  const handleDeleteMenu = async (id: string) => {
    await deleteMenu(id);
    await reload();
    setShowDelete(null);
  };

  // KATEGORI: All functions inside the main modal
  const handleAddKat = () => {
    const name = newKatName.trim();
    if (!name) return;
    addKategori(name);
    reload();
    setNewKatName("");
  };

  const startEditKat = (k: KategoriItem) => {
    setEditingKatId(k.id);
    setEditingKatNama(k.nama);
  };

  const saveEditKat = (id: string) => {
    if (!editingKatNama.trim()) return;
    updateKategori(id, { nama: editingKatNama.trim() });
    reload();
    setEditingKatId(null);
  };

  const cancelEditKat = () => {
    setEditingKatId(null);
  };

  const handleToggleKat = (id: string) => {
    toggleStatusKategori(id);
    reload();
  };

  const confirmDeleteKat = (id: string) => {
    setConfirmDeleteKatId(id);
  };

  const executeDeleteKat = (id: string) => {
    deleteKategori(id);
    reload();
    setConfirmDeleteKatId(null);
  };

  const cancelDeleteKat = () => {
    setConfirmDeleteKatId(null);
  };

  const toggleStatus = async (menu: Menu) => {
    const newStatus: Menu["status"] =
      menu.status === "Tersedia" ? "Tidak Tersedia" : "Tersedia";
    await updateMenu(menu.id, { status: newStatus });
    await reload();
  };

  // ===== RESEP =====
  const addRecipeRow = () => {
    setRecipeItems((prev) => [
      ...prev,
      {
        raw_material_id: "",
        takaran: 0,
        biaya: 0,
        _nama_bahan: "",
        _satuan_kecil: "",
        _harga_per_satuan_kecil: 0,
      },
    ]);
  };

  const removeRecipeRow = (index: number) => {
    setRecipeItems((prev) => prev.filter((_, i) => i !== index));
  };

  const updateRecipeRow = (
    index: number,
    field: "raw_material_id" | "takaran",
    value: string,
  ) => {
    setRecipeItems((prev) => {
      const next = [...prev];
      if (field === "raw_material_id") {
        next[index] = { ...next[index], raw_material_id: value };
        if (value) {
          const rm = rawMaterials.find((r) => r.id === value);
          if (rm) {
            next[index]._nama_bahan = rm.nama_bahan;
            next[index]._satuan_kecil = rm.satuan_kecil;
            next[index]._harga_per_satuan_kecil = rm.harga_per_satuan_kecil;
            next[index].biaya = hitungBiayaResep(
              Number(next[index].takaran) || 0,
              rm.harga_per_satuan_kecil,
            );
          }
        }
      }
      if (field === "takaran") {
        next[index] = { ...next[index], takaran: Number(value) || 0 };
        const rm = rawMaterials.find(
          (r) => r.id === next[index].raw_material_id,
        );
        next[index].biaya = hitungBiayaResep(
          Number(value) || 0,
          rm ? rm.harga_per_satuan_kecil : next[index]._harga_per_satuan_kecil || 0,
        );
      }
      return next;
    });
  };

  const hppTotal = useMemo(() => {
    return hitungHppTotal(
      recipeItems.map((r) => ({
        takaran: Number(r.takaran) || 0,
        hargaPerSatuanKecil: r._harga_per_satuan_kecil || 0,
      })),
    );
  }, [recipeItems]);

  // Harga jual final mengikuti harga jual yang diinput pada form
  const hargaJualFinal = form.harga;

  // Margin keuntungan (rupiah) = harga jual - HPP
  const marginRupiah =
    hppTotal > 0 && hargaJualFinal > 0
      ? Math.round(hargaJualFinal - hppTotal)
      : null;

  // Persentase margin (untuk disimpan ke DB, dipakai recalculateProduct)
  const marginPersen =
    hppTotal > 0 && hargaJualFinal > 0
      ? Math.round(((hargaJualFinal - hppTotal) / hppTotal) * 10000) / 100
      : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold text-angkringan-gold">
            🍽️ Manajemen Menu
          </h1>
          <p className="text-angkringan-light/60 text-sm mt-1">
            Kelola menu & hitung HPP (Harga Pokok Penjualan)
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowKatModal(true)}
            className="btn-primary bg-angkringan-secondary/80"
          >
            🏷️ Kelola Kategori
          </button>
          <button onClick={openAdd} className="btn-primary">
            <span>+</span> Tambah Menu
          </button>
        </div>
      </div>

      <input
        type="text"
        placeholder="Cari menu..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="input-field max-w-md"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredMenu.map((menu) => (
          <div key={menu.id} className="card">
            <div className="flex items-start justify-between mb-3">
              <span className="text-4xl">{menu.foto}</span>
              <span
                className={`badge ${menu.status === "Tersedia" ? "badge-success" : "badge-danger"}`}
              >
                {menu.status}
              </span>
            </div>
            <h3 className="font-bold text-angkringan-light">
              {menu.nama_menu}
            </h3>
            <p className="text-angkringan-gold text-sm">{menu.kategori}</p>
            <span className="text-angkringan-accent font-bold text-lg">
              {formatRupiah(menu.harga_jual || menu.harga)}
            </span>

            {/* Info HPP */}
            {menu.hpp_total && menu.hpp_total > 0 ? (
              <div className="mt-2 flex flex-wrap gap-2 text-xs">
                <span className="badge bg-purple-600/20 text-purple-300 border border-purple-600/30">
                  HPP {formatRupiah(menu.hpp_total)}
                </span>
                {menu.margin_percent != null && (
                  <span className="badge bg-cyan-600/20 text-cyan-300 border border-cyan-600/30">
                    Margin{" "}
                    {formatRupiah(
                      Math.round(
                        (menu.harga_jual || menu.harga) - menu.hpp_total,
                      ),
                    )}
                  </span>
                )}
              </div>
            ) : (
              <div className="mt-2">
                <span className="badge bg-gray-600/20 text-gray-400 border border-gray-600/30">
                  Belum ada HPP
                </span>
              </div>
            )}

            <div className="flex gap-1 mt-3">
              <button
                onClick={() => openEdit(menu)}
                className="flex-1 py-2 text-xs rounded-xl font-bold bg-blue-600/20 text-blue-400 border border-blue-600/30 hover:bg-blue-600/30"
              >
                ✏️ Edit
              </button>
              <button
                onClick={() => setShowDelete(menu.id)}
                className="px-3 py-2 bg-red-600/20 text-red-400 rounded-xl border border-red-600/30 hover:bg-red-600/30"
              >
                🗑️
              </button>
              <button
                onClick={() => toggleStatus(menu)}
                className={`px-3 py-2 text-xs rounded-xl font-bold ${menu.status === "Tersedia" ? "bg-yellow-600/20 text-yellow-400 border border-yellow-600/30" : "bg-green-600/20 text-green-400 border border-green-600/30"}`}
              >
                {menu.status === "Tersedia" ? "⛔" : "✅"}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal Tambah/Edit Menu */}
      {showModal && (
        <div
          className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
          onClick={() => setShowModal(false)}
        >
          <div
            className="w-full max-w-lg card p-6 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold text-angkringan-gold mb-4">
              {editingMenu ? "✏️ Edit Menu" : "➕ Tambah Menu"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-angkringan-light/80 text-sm mb-1">
                  Nama Menu
                </label>
                <input
                  type="text"
                  value={form.nama_menu}
                  onChange={(e) =>
                    setForm({ ...form, nama_menu: e.target.value })
                  }
                  className="input-field"
                  placeholder="Nama menu"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-angkringan-light/80 text-sm mb-1">
                    Kategori
                  </label>
                  <select
                    value={form.kategori}
                    onChange={(e) =>
                      setForm({ ...form, kategori: e.target.value })
                    }
                    className="input-field"
                  >
                    {getKategoriAktif().map((k) => (
                      <option key={k} value={k}>
                        {k}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-angkringan-light/80 text-sm mb-1">
                    Harga Jual (Rp)
                  </label>
                  <input
                    type="number"
                    value={form.harga === 0 ? "" : form.harga}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        harga:
                          e.target.value === "" ? 0 : Number(e.target.value),
                      })
                    }
                    className="input-field"
                    min="0"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-angkringan-light/80 text-sm mb-1">
                  Foto
                </label>
                <div className="flex gap-1 flex-wrap">
                  {EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setForm({ ...form, foto: emoji })}
                      className={`text-2xl p-1.5 rounded-lg ${form.foto === emoji ? "bg-angkringan-accent ring-2 ring-angkringan-accent" : "hover:bg-angkringan-primary/30"}`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              {/* ====== SECTION RESEP / KOMPOSISI ====== */}
              <div className="border-t border-angkringan-primary/30 pt-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-angkringan-gold text-sm">
                    🧪 Resep / Komposisi
                  </h3>
                  <button
                    type="button"
                    onClick={addRecipeRow}
                    className="px-3 py-1 text-xs rounded-lg font-bold bg-green-600/20 text-green-400 border border-green-600/30 hover:bg-green-600/30"
                  >
                    + Tambah Baris
                  </button>
                </div>

                {recipeItems.length === 0 && (
                  <p className="text-xs text-angkringan-light/40 mb-2">
                    Belum ada bahan. Tambahkan bahan baku untuk menghitung HPP.
                  </p>
                )}

                <div className="space-y-2">
                  {recipeItems.map((r, idx) => {
                    const rm = rawMaterials.find(
                      (m) => m.id === r.raw_material_id,
                    );
                    return (
                      <div key={idx} className="flex gap-2 items-center">
                        <select
                          value={r.raw_material_id}
                          onChange={(e) =>
                            updateRecipeRow(idx, "raw_material_id", e.target.value)
                          }
                          className="input-field !py-2 text-sm flex-1"
                        >
                          <option value="">— pilih bahan —</option>
                          {rawMaterials.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.nama_bahan} ({m.satuan_kecil})
                            </option>
                          ))}
                        </select>
                        <div className="w-24">
                          <input
                            type="number"
                            value={r.takaran === 0 ? "" : r.takaran}
                            onChange={(e) =>
                              updateRecipeRow(idx, "takaran", e.target.value)
                            }
                            className="input-field !py-2 text-sm"
                            placeholder="Takaran"
                            min="0"
                            step="0.01"
                          />
                        </div>
                        <span className="text-xs text-angkringan-light/60 w-10">
                          {rm?.satuan_kecil || r._satuan_kecil || "—"}
                        </span>
                        <span className="text-xs text-angkringan-gold font-semibold w-20 text-right">
                          {formatRupiah(r.biaya || 0)}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeRecipeRow(idx)}
                          className="text-red-400 hover:bg-red-600/20 rounded-lg p-1.5"
                        >
                          🗑️
                        </button>
                      </div>
                    );
                  })}
                </div>

                {/* Total HPP */}
                <div className="mt-3 p-3 rounded-xl bg-angkringan-primary/10 border border-angkringan-accent/30">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-angkringan-light/70">
                      Total HPP
                    </span>
                    <span className="text-lg font-bold text-angkringan-gold">
                      {formatRupiah(Math.round(hppTotal))}
                    </span>
                  </div>
                </div>
              </div>

              {/* ====== SECTION MARGIN & HARGA JUAL ====== */}
              <div className="border-t border-angkringan-primary/30 pt-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-angkringan-light/80 text-sm mb-1">
                      Margin (Rp)
                    </label>
                    <div className="input-field bg-angkringan-dark/50 flex items-center justify-between">
                      {/* <span className="text-angkringan-light/50 text-xs">
                        Otomatis
                      </span> */}
                      <span className="font-bold text-cyan-300">
                        {marginRupiah != null
                          ? formatRupiah(marginRupiah)
                          : "—"}
                      </span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-angkringan-light/80 text-sm mb-1">
                      Harga Jual (Rp)
                    </label>
                    <input
                      type="number"
                      value={form.harga === 0 ? "" : form.harga}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          harga:
                            e.target.value === "" ? 0 : Number(e.target.value),
                        })
                      }
                      className="input-field"
                      placeholder="Harga jual"
                      min="0"
                    />
                  </div>
                </div>

                {marginRupiah != null && (
                  <div className="mt-2 p-3 rounded-xl bg-cyan-600/10 border border-cyan-600/30">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-angkringan-light/70">
                        💰 Margin (Rp)
                      </span>
                      <span className="font-bold text-cyan-300">
                        {formatRupiah(marginRupiah)}
                      </span>
                    </div>
                    <p className="text-xs text-angkringan-light/50 mt-1">
                      Harga Jual {formatRupiah(hargaJualFinal)} − HPP{" "}
                      {formatRupiah(Math.round(hppTotal))}
                    </p>
                  </div>
                )}
              </div>

              {recipeError && (
                <p className="text-sm text-red-400 bg-red-600/10 rounded-lg px-3 py-2 border border-red-600/30">
                  ⚠️ {recipeError}
                </p>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="btn-primary flex-1"
                  disabled={savingRecipe}
                >
                  {savingRecipe
                    ? "Menyimpan..."
                    : editingMenu
                      ? "Simpan"
                      : "Tambah"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn-primary flex-1 bg-gray-600/50 hover:bg-gray-600/70"
                >
                  Batal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===== MODAL KELOLA KATEGORI (SEMUA FITUR DI SINI) ===== */}
      {showKatModal && (
        <div
          className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
          onClick={() => {
            setShowKatModal(false);
            setEditingKatId(null);
            setConfirmDeleteKatId(null);
          }}
        >
          <div
            className="w-full max-w-sm card p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold text-angkringan-gold mb-4">
              🏷️ Kelola Kategori
            </h2>

            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={newKatName}
                onChange={(e) => setNewKatName(e.target.value)}
                className="input-field flex-1"
                placeholder="Nama kategori baru..."
                onKeyDown={(e) => e.key === "Enter" && handleAddKat()}
              />
              <button onClick={handleAddKat} className="btn-primary px-4">
                ➕ Tambah
              </button>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto">
              {kategoriList.map((k) => (
                <div
                  key={k.id}
                  className="flex items-center justify-between p-2 bg-angkringan-dark rounded-lg"
                >
                  {editingKatId === k.id ? (
                    <div className="flex items-center gap-1 flex-1">
                      <input
                        type="text"
                        value={editingKatNama}
                        autoFocus
                        onChange={(e) => setEditingKatNama(e.target.value)}
                        className="input-field text-sm py-1 flex-1"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") saveEditKat(k.id);
                          if (e.key === "Escape") cancelEditKat();
                        }}
                      />
                      <button
                        onClick={() => saveEditKat(k.id)}
                        className="text-xs px-2 py-1 bg-green-600/20 text-green-400 rounded hover:bg-green-600/30"
                      >
                        💾
                      </button>
                      <button
                        onClick={cancelEditKat}
                        className="text-xs px-2 py-1 bg-gray-600/20 text-gray-400 rounded hover:bg-gray-600/30"
                      >
                        ✕
                      </button>
                    </div>
                  ) : confirmDeleteKatId === k.id ? (
                    <div className="flex items-center gap-1 flex-1">
                      <span className="text-xs text-red-400">
                        Hapus <>{`"${k.nama}"`}</>?
                      </span>
                      <button
                        onClick={() => executeDeleteKat(k.id)}
                        className="text-xs px-2 py-1 bg-red-600/20 text-red-400 rounded hover:bg-red-600/30"
                      >
                        ✔️ Ya
                      </button>
                      <button
                        onClick={cancelDeleteKat}
                        className="text-xs px-2 py-1 bg-gray-600/20 text-gray-400 rounded hover:bg-gray-600/30"
                      >
                        ✕ Tidak
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-sm font-medium ${k.status === "Aktif" ? "text-angkringan-light" : "text-angkringan-light/40 line-through"}`}
                        >
                          {k.nama}
                        </span>
                        <span
                          className={`badge ${k.status === "Aktif" ? "badge-success" : "badge-danger"} text-[9px]`}
                        >
                          {k.status}
                        </span>
                      </div>

                      <div className="flex gap-1">
                        <button
                          onClick={() => handleToggleKat(k.id)}
                          className="text-xs px-2 py-1 rounded hover:bg-angkringan-primary/30"
                          title={
                            k.status === "Aktif" ? "Nonaktifkan" : "Aktifkan"
                          }
                        >
                          {k.status === "Aktif" ? "⛔" : "✅"}
                        </button>
                        <button
                          onClick={() => startEditKat(k)}
                          className="text-xs px-2 py-1 text-blue-400 hover:bg-blue-600/20 rounded"
                          title="Edit nama"
                        >
                          ✏️ Edit
                        </button>
                        <button
                          onClick={() => confirmDeleteKat(k.id)}
                          className="text-xs px-2 py-1 text-red-400 hover:bg-red-600/20 rounded"
                        >
                          🗑️ Hapus
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>

            <button
              onClick={() => {
                setShowKatModal(false);
                setEditingKatId(null);
                setConfirmDeleteKatId(null);
              }}
              className="btn-primary w-full mt-4 bg-gray-600/50 hover:bg-gray-600/70"
            >
              Tutup
            </button>
          </div>
        </div>
      )}

      {/* Konfirmasi Hapus Menu */}
      {showDelete && (
        <div
          className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
          onClick={() => setShowDelete(null)}
        >
          <div
            className="w-full max-w-sm card p-6 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="text-5xl block mb-3">⚠️</span>
            <h3 className="text-lg font-bold text-angkringan-gold mb-2">
              Hapus Menu?
            </h3>
            <p className="text-angkringan-light/60 text-sm mb-4">
              Menu yang dihapus tidak bisa dikembalikan. Resep terkait juga
              akan dihapus.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => handleDeleteMenu(showDelete)}
                className="btn-danger flex-1"
              >
                Hapus
              </button>
              <button
                onClick={() => setShowDelete(null)}
                className="btn-primary flex-1 bg-gray-600/50 hover:bg-gray-600/70"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}