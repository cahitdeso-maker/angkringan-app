"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  getRawMaterials,
  addRawMaterial,
  updateRawMaterial,
  deleteRawMaterial,
  formatRupiah,
} from "@/lib/data";
import { RawMaterial, SatuanBeli } from "@/lib/types";
import {
  hitungHargaPerSatuanKecil,
  formatDesimal,
  SATUAN_BELI_PILIHAN,
} from "@/lib/hpp";

const SATUAN_LABEL: Record<SatuanBeli, string> = {
  kg: "Kilogram (kg)",
  gram: "Gram",
  liter: "Liter",
  ml: "Mililiter (ml)",
  pcs: "Pcs",
};

const SATUAN_ICON: Record<SatuanBeli, string> = {
  kg: "⚖️",
  gram: "🔬",
  liter: "🧴",
  ml: "💧",
  pcs: "📦",
};

export default function BahanBakuPage() {
  const [materials, setMaterials] = useState<RawMaterial[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<RawMaterial | null>(null);
  const [showDelete, setShowDelete] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const [form, setForm] = useState({
    nama_bahan: "",
    harga_beli: 0,
    jumlah_beli: 1,
    satuan_beli: "kg" as SatuanBeli,
  });

  const reload = async () => {
    const data = await getRawMaterials();
    setMaterials(data);
  };

  useEffect(() => {
    reload();
  }, []);

  const filtered = useMemo(() => {
    const q = searchTerm.toLowerCase();
    return materials.filter(
      (m) =>
        m.nama_bahan.toLowerCase().includes(q) ||
        m.satuan_beli.toLowerCase().includes(q) ||
        m.satuan_kecil.toLowerCase().includes(q),
    );
  }, [materials, searchTerm]);

  // Live preview per-satuan-kecil
  const preview = useMemo(() => {
    return hitungHargaPerSatuanKecil(
      form.harga_beli,
      form.jumlah_beli,
      form.satuan_beli,
    );
  }, [form.harga_beli, form.jumlah_beli, form.satuan_beli]);

  const resetForm = () => {
    setForm({
      nama_bahan: "",
      harga_beli: 0,
      jumlah_beli: 1,
      satuan_beli: "kg",
    });
    setEditing(null);
    setErrorMsg("");
  };

  const openAdd = () => {
    resetForm();
    setShowModal(true);
  };

  const openEdit = (m: RawMaterial) => {
    setForm({
      nama_bahan: m.nama_bahan,
      harga_beli: m.harga_beli,
      jumlah_beli: m.jumlah_beli,
      satuan_beli: m.satuan_beli,
    });
    setEditing(m);
    setErrorMsg("");
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nama_bahan.trim()) {
      setErrorMsg("Nama bahan wajib diisi");
      return;
    }
    if (form.harga_beli <= 0) {
      setErrorMsg("Harga beli harus > 0");
      return;
    }
    if (form.jumlah_beli <= 0) {
      setErrorMsg("Jumlah beli harus > 0");
      return;
    }

    try {
      if (editing) {
        await updateRawMaterial(editing.id, form);
      } else {
        await addRawMaterial(form);
      }
      await reload();
      setShowModal(false);
      resetForm();
    } catch (err: any) {
      setErrorMsg(err.message || "Gagal menyimpan bahan baku");
    }
  };

  const handleDelete = async (id: string) => {
    await deleteRawMaterial(id);
    await reload();
    setShowDelete(null);
  };

  return (
    <div className="space-y-6">
      {/* Toolbar: judul, aksi, dan pencarian */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:items-center">
        <div className="lg:col-span-7 flex flex-wrap items-center justify-between gap-x-3 gap-y-3">
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-angkringan-gold">
              🧺 Bahan Baku
            </h1>
            <p className="text-angkringan-light/60 text-xs sm:text-sm mt-1">
              Master bahan baku — harga per gram/ml/pcs
            </p>
          </div>
          <button onClick={openAdd} className="btn-primary whitespace-nowrap">
            <span>+</span> Tambah Bahan
          </button>
        </div>
        <div className="lg:col-span-5">
          <input
            type="text"
            placeholder="Cari bahan baku..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-field w-full"
          />
        </div>
      </div>

      {/* Ringkasan info */}
      <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-12 gap-4">
        <div className="card sm:col-span-1 lg:col-span-4">
          <p className="text-angkringan-light/60 text-xs sm:text-sm">
            Total Bahan
          </p>
          <p className="text-xl sm:text-2xl font-bold text-angkringan-gold">
            {materials.length}
          </p>
        </div>
        <div className="card sm:col-span-1 lg:col-span-4">
          <p className="text-angkringan-light/60 text-xs sm:text-sm">
            Satuan Gram
          </p>
          <p className="text-xl sm:text-2xl font-bold text-angkringan-light">
            {materials.filter((m) => m.satuan_kecil === "gram").length}
          </p>
        </div>
        <div className="card sm:col-span-1 lg:col-span-4">
          <p className="text-angkringan-light/60 text-xs sm:text-sm">
            Satuan ml
          </p>
          <p className="text-xl sm:text-2xl font-bold text-angkringan-light">
            {materials.filter((m) => m.satuan_kecil === "ml").length}
          </p>
        </div>
      </div>

      {/* ===== Daftar kartu — Mobile & Tablet (Portrait) ===== */}
      <div className="lg:hidden">
        {filtered.length === 0 ? (
          <div className="card p-6 sm:p-8 text-center text-xs sm:text-sm text-angkringan-light/50">
            {materials.length === 0
              ? "Belum ada bahan baku. Klik 'Tambah Bahan' untuk mulai."
              : "Tidak ada hasil pencarian."}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 gap-4">
            {filtered.map((m) => (
              <div key={m.id} className="card flex flex-col gap-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-2xl">{SATUAN_ICON[m.satuan_beli]}</span>
                  <span className="badge badge-warning">{m.satuan_beli}</span>
                </div>
                <p className="font-semibold text-angkringan-light text-sm sm:text-base truncate">
                  {m.nama_bahan}
                </p>
                <div className="grid grid-cols-2 gap-2 text-xs sm:text-sm">
                  <div>
                    <p className="text-angkringan-light/60 text-xs">Harga Beli</p>
                    <p className="text-angkringan-light font-semibold">
                      {formatRupiah(m.harga_beli)}
                    </p>
                  </div>
                  <div>
                    <p className="text-angkringan-light/60 text-xs">Jumlah Beli</p>
                    <p className="text-angkringan-light font-semibold">
                      {formatDesimal(m.jumlah_beli, 3)}
                    </p>
                  </div>
                </div>
                <div>
                  <p className="text-angkringan-light/60 text-xs">
                    Harga / Satuan Kecil
                  </p>
                  <p className="font-bold text-angkringan-gold text-sm sm:text-base">
                    {formatRupiah(m.harga_per_satuan_kecil)}
                    <span className="text-angkringan-light/60 text-xs font-normal">
                      {" "}/ {m.satuan_kecil}
                    </span>
                  </p>
                </div>
                <div className="flex gap-2 justify-end pt-1">
                  <button
                    onClick={() => openEdit(m)}
                    className="px-3 py-2 text-xs sm:text-sm rounded-lg font-bold bg-blue-600/20 text-blue-400 border border-blue-600/30 hover:bg-blue-600/30 active:scale-95 transition"
                  >
                    ✏️ Edit
                  </button>
                  <button
                    onClick={() => setShowDelete(m.id)}
                    aria-label="Hapus bahan baku"
                    className="px-3 py-2 text-xs sm:text-sm rounded-lg font-bold bg-red-600/20 text-red-400 border border-red-600/30 hover:bg-red-600/30 active:scale-95 transition"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ===== Tabel klasik — Desktop / Layar Lebar ===== */}
      <div className="hidden lg:block">
        <div className="card p-0 overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-angkringan-primary/30 text-angkringan-secondary uppercase text-xs">
              <th className="text-left p-4">Bahan</th>
              <th className="text-left p-4">Harga Beli</th>
              <th className="text-left p-4">Jumlah Beli</th>
              <th className="text-left p-4">Satuan Beli</th>
              <th className="text-left p-4">
                Harga / Satuan Kecil <span className="text-angkringan-accent">(auto)</span>
              </th>
              <th className="text-center p-4">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="p-6 sm:p-8 text-center text-xs sm:text-sm text-angkringan-light/50"
                >
                  {materials.length === 0
                    ? "Belum ada bahan baku. Klik 'Tambah Bahan' untuk mulai."
                    : "Tidak ada hasil pencarian."}
                </td>
              </tr>
            )}
            {filtered.map((m) => (
              <tr
                key={m.id}
                className="border-b border-angkringan-primary/10 hover:bg-angkringan-primary/10 transition-colors"
              >
                <td className="p-2 sm:p-4 font-medium text-angkringan-light text-xs sm:text-sm">
                  <span className="mr-2">{SATUAN_ICON[m.satuan_beli]}</span>
                  {m.nama_bahan}
                </td>
                <td className="p-2 sm:p-4 text-angkringan-light text-xs sm:text-sm">
                  {formatRupiah(m.harga_beli)}
                </td>
                <td className="p-2 sm:p-4 text-angkringan-light text-xs sm:text-sm">
                  {formatDesimal(m.jumlah_beli, 3)}
                </td>
                <td className="p-2 sm:p-4">
                  <span className="badge badge-warning">{m.satuan_beli}</span>
                </td>
                <td className="p-2 sm:p-4">
                  <span className="font-bold text-angkringan-gold text-xs sm:text-sm">
                    {formatRupiah(m.harga_per_satuan_kecil)}
                    <span className="text-angkringan-light/60 text-xs font-normal">
                      {" "}
                      /{m.satuan_kecil}
                    </span>
                  </span>
                </td>
                <td className="p-2 sm:p-4">
                  <div className="flex gap-2 justify-center">
                    <button
                      onClick={() => openEdit(m)}
                      className="px-3 py-2 text-xs sm:text-sm rounded-lg font-bold bg-blue-600/20 text-blue-400 border border-blue-600/30 hover:bg-blue-600/30 min-w-[64px] active:scale-95 transition"
                    >
                      ✏️ Edit
                    </button>
                    <button
                      onClick={() => setShowDelete(m.id)}
                      aria-label="Hapus bahan baku"
                      className="px-3 py-2 text-xs sm:text-sm rounded-lg font-bold bg-red-600/20 text-red-400 border border-red-600/30 hover:bg-red-600/30 active:scale-95 transition"
                    >
                      🗑️
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>

      {/* Modal Tambah/Edit */}
      {showModal && (
        <div
          className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-3 sm:p-4 backdrop-blur-sm"
          onClick={() => setShowModal(false)}
        >
          <div
            className="w-full max-w-md md:max-w-xl card p-4 sm:p-6 max-h-[90vh] overflow-y-auto overscroll-contain pb-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg sm:text-xl font-bold text-angkringan-gold mb-4">
              {editing ? "✏️ Edit Bahan Baku" : "➕ Tambah Bahan Baku"}
            </h2>

            {/* Preview kartu hasil konversi */}
            <div className="mb-5 p-4 rounded-xl bg-angkringan-primary/10 border border-angkringan-accent/30">
              <p className="text-xs text-angkringan-light/60 mb-1">
                Harga per satuan kecil (otomatis)
              </p>
              <p className="text-2xl font-bold text-angkringan-gold">
                {formatRupiah(Math.round(preview.hargaPerSatuanKecil * 100) / 100)}
                <span className="text-sm text-angkringan-light/70 font-normal">
                  {" "}
                  /{preview.satuanKecil}
                </span>
              </p>
              <p className="text-xs text-angkringan-light/40 mt-1">
                Takaran di resep produk akan memakai satuan{" "}
                <span className="text-angkringan-accent font-semibold">
                  {preview.satuanKecil}
                </span>
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-angkringan-light/80 text-sm mb-1">
                  Nama Bahan
                </label>
                <input
                  type="text"
                  value={form.nama_bahan}
                  onChange={(e) =>
                    setForm({ ...form, nama_bahan: e.target.value })
                  }
                  className="input-field"
                  placeholder="Contoh: Kopi, Susu, Karamel, Cup + tutup"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-angkringan-light/80 text-sm mb-1">
                    Harga Beli (Rp)
                  </label>
                  <input
                    type="number"
                    value={form.harga_beli === 0 ? "" : form.harga_beli}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        harga_beli:
                          e.target.value === ""
                            ? 0
                            : Number(e.target.value),
                      })
                    }
                    className="input-field"
                    min="0"
                    step="0.01"
                    required
                  />
                </div>
                <div>
                  <label className="block text-angkringan-light/80 text-sm mb-1">
                    Jumlah Beli
                  </label>
                  <input
                    type="number"
                    value={form.jumlah_beli === 0 ? "" : form.jumlah_beli}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        jumlah_beli:
                          e.target.value === ""
                            ? 0
                            : Number(e.target.value),
                      })
                    }
                    className="input-field"
                    min="0"
                    step="0.001"
                    required
                  />
                </div>
                <div>
                  <label className="block text-angkringan-light/80 text-sm mb-1">
                    Satuan Beli
                  </label>
                  <select
                    value={form.satuan_beli}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        satuan_beli: e.target.value as SatuanBeli,
                      })
                    }
                    className="input-field"
                  >
                    {SATUAN_BELI_PILIHAN.map((s) => (
                      <option key={s} value={s}>
                        {SATUAN_LABEL[s]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {errorMsg && (
                <p className="text-sm text-red-400 bg-red-600/10 rounded-lg px-3 py-2 border border-red-600/30">
                  ⚠️ {errorMsg}
                </p>
              )}

              <div className="flex gap-2 pt-2">
                <button type="submit" className="btn-primary flex-1">
                  {editing ? "Simpan" : "Tambah"}
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

      {/* Konfirmasi Hapus */}
      {showDelete && (
        <div
          className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-3 sm:p-4 backdrop-blur-sm"
          onClick={() => setShowDelete(null)}
        >
          <div
            className="w-full max-w-sm card p-4 sm:p-6 text-center max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="text-5xl block mb-3">⚠️</span>
            <h3 className="text-lg font-bold text-angkringan-gold mb-2">
              Hapus Bahan Baku?
            </h3>
            <p className="text-angkringan-light/60 text-sm mb-4">
              Bahan yang dihapus juga akan dihapus dari semua resep produk.
              HPP produk terkait akan dihitung ulang.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => handleDelete(showDelete)}
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