"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  getRawMaterials,
  getBahanGabung,
  addBahanGabung,
  updateBahanGabung,
  deleteBahanGabung,
  formatRupiah,
  BahanGabung,
  KomponenGabung,
} from "@/lib/data";
import { RawMaterial } from "@/lib/types";

interface KomponenDraft {
  raw_material_id: string;
  takaran: number;
  _nama_bahan: string;
  _satuan_kecil: string;
  _harga_per_satuan_kecil: number;
}

// Cache sesaat lintas navigasi agar kembali ke halaman ini tidak menunggu ulang.
type PageCache = {
  materials: RawMaterial[];
  bahanGabung: BahanGabung[];
};
const pageCacheRef: { current: PageCache | null } = { current: null };

export default function GabungBahanPage() {
  const [materials, setMaterials] = useState<RawMaterial[]>(
    () => pageCacheRef.current?.materials || [],
  );
  const [bahanGabung, setBahanGabung] = useState<BahanGabung[]>(
    () => pageCacheRef.current?.bahanGabung || [],
  );
  const [loading, setLoading] = useState(false);
  const [mergeName, setMergeName] = useState("");
  const [komponen, setKomponen] = useState<KomponenDraft[]>([
    {
      raw_material_id: "",
      takaran: 1,
      _nama_bahan: "",
      _satuan_kecil: "",
      _harga_per_satuan_kecil: 0,
    },
  ]);
  const [mergeError, setMergeError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [openSummary, setOpenSummary] = useState<string | null>(null);
  // Data yang sedang diedit (null = mode tambah)
  const [editingGabung, setEditingGabung] = useState<BahanGabung | null>(null);

  const reload = async () => {
    setLoading(true);
    try {
      const [rmData, bgData] = await Promise.all([
        getRawMaterials(),
        getBahanGabung(),
      ]);
      pageCacheRef.current = { materials: rmData, bahanGabung: bgData };
      setMaterials(rmData);
      setBahanGabung(bgData);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reload();
  }, []);

  // ==================== KELOLA KOMPONEN ====================
  const addKomponen = () => {
    setKomponen((prev) => [
      ...prev,
      {
        raw_material_id: "",
        takaran: 1,
        _nama_bahan: "",
        _satuan_kecil: "",
        _harga_per_satuan_kecil: 0,
      },
    ]);
  };

  const removeKomponen = (index: number) => {
    setKomponen((prev) => prev.filter((_, i) => i !== index));
  };

  const updateKomponen = (
    index: number,
    field: "raw_material_id" | "takaran",
    value: string,
  ) => {
    setKomponen((prev) => {
      const next = [...prev];
      if (field === "raw_material_id") {
        next[index] = { ...next[index], raw_material_id: value };
        if (value) {
          const rm = materials.find((m) => m.id === value);
          if (rm) {
            next[index]._nama_bahan = rm.nama_bahan;
            next[index]._satuan_kecil = rm.satuan_kecil;
            next[index]._harga_per_satuan_kecil = rm.harga_per_satuan_kecil;
          }
        } else {
          next[index]._nama_bahan = "";
          next[index]._satuan_kecil = "";
          next[index]._harga_per_satuan_kecil = 0;
        }
      }
      if (field === "takaran") {
        next[index] = { ...next[index], takaran: Number(value) || 0 };
      }
      return next;
    });
  };

  const validKomponen = useMemo(
    () =>
      komponen.filter(
        (k) => k.raw_material_id && Number(k.takaran) > 0,
      ),
    [komponen],
  );

  const mergeSatuan: string = "pcs";

  const mergeTotal = validKomponen.reduce(
    (s, k) => s + k._harga_per_satuan_kecil * Number(k.takaran),
    0,
  );

  const effectiveMergeName =
    mergeName.trim() ||
    validKomponen.map((k) => k._nama_bahan).join(" + ");

  const handleSubmit = async () => {
    if (validKomponen.length < 1) {
      setMergeError("Tambahkan minimal 1 bahan untuk digabung.");
      return;
    }
    if (!effectiveMergeName.trim()) {
      setMergeError("Nama bahan gabungan wajib diisi.");
      return;
    }

    const komponenData: KomponenGabung[] = validKomponen.map((k) => ({
      nama_bahan: k._nama_bahan,
      takaran: Number(k.takaran),
      biaya: k._harga_per_satuan_kecil * Number(k.takaran),
      satuan_kecil: k._satuan_kecil || mergeSatuan || "pcs",
    }));

    try {
      if (editingGabung) {
        await updateBahanGabung(
          editingGabung.id,
          effectiveMergeName.trim(),
          mergeSatuan || "pcs",
          mergeTotal,
          komponenData,
        );
      } else {
        await addBahanGabung(
          effectiveMergeName.trim(),
          mergeSatuan || "pcs",
          mergeTotal,
          komponenData,
        );
      }
    } catch (err: any) {
      setMergeError(err.message || "Gagal menyimpan bahan gabung");
      return;
    }

    setOpenSummary("");
    setEditingGabung(null);
    setKomponen([
      {
        raw_material_id: "",
        takaran: 1,
        _nama_bahan: "",
        _satuan_kecil: "",
        _harga_per_satuan_kecil: 0,
      },
    ]);
    setMergeName("");
    setMergeError("");
    setShowModal(false);
    await reload();
  };

  const openAdd = () => {
    setEditingGabung(null);
    setMergeName("");
    setKomponen([
      {
        raw_material_id: "",
        takaran: 1,
        _nama_bahan: "",
        _satuan_kecil: "",
        _harga_per_satuan_kecil: 0,
      },
    ]);
    setMergeError("");
    setShowModal(true);
  };

  const openEdit = (h: BahanGabung) => {
    setEditingGabung(h);
    setMergeName(h.nama_gabungan || "");
    const komp = (h.komponen || []).map<KomponenDraft>((c) => {
      const rm = materials.find((m) => m.nama_bahan === c.nama_bahan);
      return {
        raw_material_id: rm?.id || "",
        takaran: Number(c.takaran) || 1,
        _nama_bahan: c.nama_bahan,
        _satuan_kecil: c.satuan_kecil || h.satuan_kecil,
        _harga_per_satuan_kecil: Number(c.biaya) / Number(c.takaran) || 0,
      };
    });
    setKomponen(komp.length ? komp : [{ raw_material_id: "", takaran: 1, _nama_bahan: "", _satuan_kecil: "", _harga_per_satuan_kecil: 0 }]);
    setMergeError("");
    setShowModal(true);
  };

  const hapusHasil = useCallback(
    async (id: string) => {
      await deleteBahanGabung(id);
      await reload();
      setOpenSummary((cur) => (cur === id ? null : cur));
    },
    [],
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-angkringan-gold">
            🔗 Gabung Bahan
          </h1>
          <p className="text-angkringan-light/60 text-xs sm:text-sm mt-1">
            Buat bahan gabungan (paket) dari beberapa bahan baku dengan takaran
            masing-masing. Bahan asli{" "}
            <span className="text-angkringan-accent font-semibold">
              tetap dipertahankan
            </span>
            .
          </p>
        </div>
        <button onClick={openAdd} className="btn-primary">
          <span>+</span> Gabung Bahan
        </button>
      </div>

      {/* Ringkasan info */}
      <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-12 gap-4">
        <div className="card sm:col-span-1 lg:col-span-4">
          <p className="text-angkringan-light/60 text-xs sm:text-sm">Bahan Tersedia</p>
          <p className="text-xl sm:text-2xl font-bold text-angkringan-gold">
            {materials.length}
          </p>
        </div>
        <div className="card sm:col-span-1 lg:col-span-4">
          <p className="text-angkringan-light/60 text-xs sm:text-sm">Komponen Dipilih</p>
          <p className="text-xl sm:text-2xl font-bold text-angkringan-light">
            {validKomponen.length}
          </p>
        </div>
        <div className="card sm:col-span-1 lg:col-span-4">
          <p className="text-angkringan-light/60 text-xs sm:text-sm">Satuan Gabungan</p>
          <p className="text-xl sm:text-2xl font-bold text-angkringan-light">
            {mergeSatuan || "—"}
          </p>
        </div>
      </div>

      {/* ===== Daftar kartu — Mobile & Tablet (Portrait) ===== */}
      <div className="lg:hidden">
        {bahanGabung.length === 0 ? (
          <div className="card p-6 sm:p-8 text-center text-xs sm:text-sm text-angkringan-light/50">
            Belum ada data bahan gabung. Klik "+ Gabung Bahan" untuk membuat.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 gap-4">
            {bahanGabung.map((h, idx) => {
              const open = openSummary === h.id;
              const komponenCard = h.komponen || [];
              const waktuCard =
                h.created_at?.length
                  ? new Date(h.created_at).toLocaleString("id-ID", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "—";
              return (
                <div key={h.id} className="card flex flex-col gap-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm text-angkringan-light/60">#{idx + 1}</span>
                    {h.is_delete === "t" || h.is_delete === true ? (
                      <span className="badge badge-danger">Dihapus</span>
                    ) : h.update_at ? (
                      <span className="badge badge-warning">Diperbarui</span>
                    ) : (
                      <span className="badge badge-info">Baru</span>
                    )}
                  </div>
                  <p className="font-semibold text-angkringan-light text-sm sm:text-base">
                    {h.nama_gabungan}
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-xs sm:text-sm">
                    <div>
                      <p className="text-angkringan-light/60 text-xs">Komponen</p>
                      <p className="text-angkringan-light font-semibold">{h.jumlah_komponen}</p>
                    </div>
                    <div>
                      <p className="text-angkringan-light/60 text-xs">Satuan</p>
                      <span className="badge badge-warning">{h.satuan_kecil}</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 items-end gap-2 text-xs sm:text-sm">
                    <div>
                      <p className="text-angkringan-light/60 text-xs">Total Harga</p>
                      <p className="font-bold text-angkringan-gold">
                        {formatRupiah(Math.round(h.total_harga))}
                      </p>
                    </div>
                    <div>
                      <p className="text-angkringan-light/60 text-xs">Waktu</p>
                      <p className="text-angkringan-light/70 text-xs">{waktuCard}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 justify-end pt-1">
                    <button
                      onClick={() => openEdit(h)}
                      className="px-3 py-2 text-xs sm:text-sm rounded-lg font-bold bg-green-600/20 text-green-400 border border-green-600/30 hover:bg-green-600/30 active:scale-95 transition"
                    >
                      ✏️ Edit
                    </button>
                    <button
                      onClick={() => setOpenSummary(open ? null : h.id)}
                      className="px-3 py-2 text-xs sm:text-sm rounded-lg font-bold bg-blue-600/20 text-blue-400 border border-blue-600/30 hover:bg-blue-600/30 active:scale-95 transition"
                    >
                      {open ? "Tutup" : "Detail"}
                    </button>
                    <button
                      onClick={() => hapusHasil(h.id)}
                      aria-label="Hapus bahan gabung"
                      className="px-3 py-2 text-xs sm:text-sm rounded-lg font-bold bg-red-600/20 text-red-400 border border-red-600/30 hover:bg-red-600/30 active:scale-95 transition"
                    >
                      🗑️
                    </button>
                  </div>
                  {open && (
                    <div className="rounded-xl border border-angkringan-primary/20 bg-angkringan-primary/5 p-3 space-y-1">
                      {komponenCard.length === 0 && (
                        <p className="text-xs text-angkringan-light/40">
                          Tidak ada rincian komponen.
                        </p>
                      )}
                      {komponenCard.map((c, i) => (
                        <div key={i} className="flex justify-between gap-2 text-sm text-angkringan-light/70">
                          <span>
                            {c.nama_bahan}{" "}
                            <span className="text-angkringan-light/40 text-xs">
                              ({Number(c.takaran)} x{" "}
                              {formatRupiah(Number(c.biaya) / Number(c.takaran))}
                              ) /{c.satuan_kecil || h.satuan_kecil}
                            </span>
                          </span>
                          <span>{formatRupiah(Number(c.biaya))}</span>
                        </div>
                      ))}
                      <div className="flex justify-between text-sm font-bold text-angkringan-gold pt-1">
                        <span>Total / {h.satuan_kecil}</span>
                        <span>{formatRupiah(Math.round(h.total_harga))}</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ===== Tabel klasik — Desktop / Layar Lebar ===== */}
      <div className="hidden lg:block">
        <div className="card overflow-x-auto p-0">
        <div className="flex items-center justify-between p-4 border-b border-angkringan-primary/20">
          <h2 className="text-lg font-bold text-angkringan-gold">
            📋 Data Bahan Gabung
          </h2>
          <span className="text-xs text-angkringan-light/50 flex items-center gap-2">
            {loading && (
              <span className="inline-block w-3 h-3 border-2 border-angkringan-accent border-t-transparent rounded-full animate-spin" />
            )}
            {bahanGabung.length} data
          </span>
        </div>
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-angkringan-primary/30 text-angkringan-secondary uppercase text-xs">
              <th className="text-left p-4">No</th>
              <th className="text-left p-4">Nama Gabungan</th>
              <th className="text-center p-4">Jml Komponen</th>
              <th className="text-center p-4">Satuan</th>
              <th className="text-left p-4">Total Harga</th>
              <th className="text-center p-4">Status</th>
              <th className="text-left p-4">Waktu</th>
              <th className="text-center p-4">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {bahanGabung.length === 0 && (
              <tr>
                <td colSpan={8} className="p-8 text-center text-angkringan-light/50">
                  Belum ada data bahan gabung. Klik "+ Gabung Bahan" untuk
                  membuat.
                </td>
              </tr>
            )}
            {bahanGabung.map((h, idx) => {
              const open = openSummary === h.id;
              const komponen = h.komponen || [];
              const waktu =
                h.created_at?.length
                  ? new Date(h.created_at).toLocaleString("id-ID", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "—";
              return (
                <React.Fragment key={h.id}>
                  <tr className="border-b border-angkringan-primary/10 hover:bg-angkringan-primary/10 transition-colors">
                    <td className="p-4 text-angkringan-light/60">{idx + 1}</td>
                    <td className="p-4 font-medium text-angkringan-light">
                      {h.nama_gabungan}
                    </td>
                    <td className="p-4 text-center text-angkringan-light">
                      {h.jumlah_komponen}
                    </td>
                    <td className="p-4 text-center">
                      <span className="badge badge-warning">
                        {h.satuan_kecil}
                      </span>
                    </td>
                    <td className="p-4 text-angkringan-gold font-bold">
                      {formatRupiah(Math.round(h.total_harga))}
                    </td>
                    <td className="p-4 text-center">
                      {h.is_delete === "t" || h.is_delete === true ? (
                        <span className="badge badge-danger">Dihapus</span>
                      ) : h.update_at ? (
                        <span className="badge badge-warning">Diperbarui</span>
                      ) : (
                        <span className="badge badge-info">Baru</span>
                      )}
                    </td>
                    <td className="p-4 text-angkringan-light/70 text-xs">
                      {waktu}
                    </td>
                    <td className="p-4">
                      <div className="flex gap-2 justify-center">
                        <button
                          onClick={() => openEdit(h)}
                          className="px-3 py-2 text-xs sm:text-sm rounded-lg font-bold bg-green-600/20 text-green-400 border border-green-600/30 hover:bg-green-600/30 active:scale-95 transition"
                        >
                          ✏️ Edit
                        </button>
                        <button
                          onClick={() => setOpenSummary(open ? null : h.id)}
                          className="px-3 py-2 text-xs sm:text-sm rounded-lg font-bold bg-blue-600/20 text-blue-400 border border-blue-600/30 hover:bg-blue-600/30 active:scale-95 transition"
                        >
                          {open ? "Tutup" : "Detail"}
                        </button>
                        <button
                          onClick={() => hapusHasil(h.id)}
                          aria-label="Hapus bahan gabung"
                          className="px-3 py-2 text-xs sm:text-sm rounded-lg font-bold bg-red-600/20 text-red-400 border border-red-600/30 hover:bg-red-600/30 active:scale-95 transition"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                  {open && (
                    <tr>
                      <td colSpan={8} className="p-4 bg-angkringan-primary/5">
                        <div className="space-y-1">
                          {komponen.length === 0 && (
                            <p className="text-xs text-angkringan-light/40">
                              Tidak ada rincian komponen.
                            </p>
                          )}
                          {komponen.map((c, i) => (
                            <div
                              key={i}
                              className="flex justify-between text-sm text-angkringan-light/70"
                            >
                              <span>
                                {c.nama_bahan}{" "}
                                <span className="text-angkringan-light/40 text-xs">
                                  ({Number(c.takaran)} x{" "}
                                  {formatRupiah(
                                    Number(c.biaya) / Number(c.takaran),
                                  )}
                                  ) /{c.satuan_kecil || h.satuan_kecil}
                                </span>
                              </span>
                              <span>{formatRupiah(Number(c.biaya))}</span>
                            </div>
                          ))}
                          <div className="flex justify-between text-sm font-bold text-angkringan-gold pt-1">
                            <span>Total / {h.satuan_kecil}</span>
                            <span>{formatRupiah(Math.round(h.total_harga))}</span>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
        </div>
      </div>

      {/* Modal Form Gabung Bahan */}
      {showModal && (
        <div
          className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-3 sm:p-4 backdrop-blur-sm"
          onClick={() => setShowModal(false)}
        >
          <div
            className="w-full max-w-md md:max-w-xl card p-4 sm:p-6 max-h-[90vh] overflow-y-auto overscroll-contain pb-6"
            onClick={(e) => e.stopPropagation()}
          >
        <h2 className="text-lg font-bold text-angkringan-gold mb-1">
          {editingGabung ? "✏️ Edit Bahan Gabung" : "+ Gabung Bahan Baru"}
        </h2>
        <p className="text-sm text-angkringan-light/60 mb-4">
          Isi nama bahan gabungan, lalu tambahkan komponen bahan (bisa lebih
          dari satu). Harga per satuan kecil dihitung otomatis.
        </p>
        <div className="space-y-4">
          <div>
            <label className="block text-angkringan-light/80 text-sm mb-1">
              Nama Bahan Gabungan
            </label>
            <input
              type="text"
              value={mergeName}
              onChange={(e) => {
                setMergeName(e.target.value);
                setMergeError("");
              }}
              className="input-field"
              placeholder={effectiveMergeName}
            />
            {validKomponen.length >= 2 && (
              <p className="text-xs text-angkringan-light/50 mt-1">
                Kosongkan untuk memakai nama otomatis:{" "}
                <span className="text-angkringan-accent">
                  {effectiveMergeName}
                </span>
              </p>
            )}
          </div>

          {/* Daftar komponen */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-angkringan-light/80 text-sm font-semibold">
              </label>
              <button
                type="button"
                onClick={addKomponen}
                className="px-3 py-1.5 text-xs rounded-lg font-bold bg-green-600/20 text-green-400 border border-green-600/30 hover:bg-green-600/30"
              >
                + Tambah Komponen
              </button>
            </div>

            {komponen.length === 0 && (
              <p className="text-xs text-angkringan-light/40 mb-2">
                Belum ada komponen. Klik "+ Tambah Komponen" untuk menambahkan
                bahan.
              </p>
            )}

            <div className="space-y-2">
              {komponen.map((k, idx) => {
                const rm = materials.find((m) => m.id === k.raw_material_id);
                const biaya =
                  (rm ? rm.harga_per_satuan_kecil : 0) * Number(k.takaran);
                return (
                  <div
                    key={idx}
                    className="flex items-center gap-2 border border-angkringan-primary/20 rounded-lg p-2 overflow-x-auto"
                  >
                    <select
                      value={k.raw_material_id}
                      onChange={(e) =>
                        updateKomponen(idx, "raw_material_id", e.target.value)
                      }
                      className="input-field !py-2 text-sm flex-1 min-w-40"
                    >
                      <option value="">— pilih bahan —</option>
                      {materials.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.nama_bahan} ({m.satuan_kecil})
                        </option>
                      ))}
                    </select>
                    <div className="w-24 shrink-0">
                      <input
                        type="number"
                        value={k.takaran === 0 ? "" : k.takaran}
                        onChange={(e) =>
                          updateKomponen(idx, "takaran", e.target.value)
                        }
                        className="input-field !py-2 text-sm text-center"
                        placeholder="Takaran"
                        min="0"
                        step="0.01"
                      />
                    </div>
                    <span className="text-xs text-angkringan-light/60 shrink-0">
                      {rm?.satuan_kecil || "—"}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeKomponen(idx)}
                      className="text-red-400 hover:bg-red-600/20 rounded-lg p-0.5 shrink-0"
                      title="Hapus komponen"
                    >
                      🗑️
                    </button>
                    <span className="text-xs text-angkringan-gold font-semibold w-24 text-right shrink-0 ml-auto">
                      {formatRupiah(biaya)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Pratinjau hasil gabungan */}
          <div className="p-4 rounded-xl bg-angkringan-primary/10 border border-angkringan-accent/30">
            <p className="text-xs text-angkringan-light/60 mb-1">
              Harga per satuan kecil gabungan (otomatis)
            </p>
            <p className="text-2xl font-bold text-angkringan-gold">
              {formatRupiah(Math.round(mergeTotal * 100) / 100)}
              <span className="text-sm text-angkringan-light/70 font-normal">
                {" "}
                /{mergeSatuan || "—"}
              </span>
            </p>
            <p className="text-xs text-angkringan-light/40 mt-1">
              {validKomponen.length >= 2
                ? validKomponen
                    .map(
                      (k) =>
                        `${k._nama_bahan} (${Number(k.takaran)} x ${formatRupiah(
                          k._harga_per_satuan_kecil,
                        )})`,
                    )
                    .join(" + ")
                : "Pilih minimal 1 bahan dengan takaran untuk melihat rincian."}
            </p>
          </div>

          {mergeError && (
            <p className="text-sm text-red-400 bg-red-600/10 rounded-lg px-3 py-2 border border-red-600/30">
              ⚠️ {mergeError}
            </p>
          )}

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={handleSubmit}
              className="btn-primary flex-1"
            >
              🔗 {editingGabung ? "Simpan Perubahan" : "Gabungkan Bahan"}
            </button>
            <button
              type="button"
              onClick={() => {
                setKomponen([
                  {
                    raw_material_id: "",
                    takaran: 1,
                    _nama_bahan: "",
                    _satuan_kecil: "",
                    _harga_per_satuan_kecil: 0,
                  },
                ]);
                setMergeName("");
                setMergeError("");
                setEditingGabung(null);
              }}
              className="btn-primary flex-1 bg-gray-600/50 hover:bg-gray-600/70"
            >
              Reset Form
            </button>
            <button
              type="button"
              onClick={() => {
                setEditingGabung(null);
                setShowModal(false);
              }}
              className="btn-primary flex-1 bg-gray-600/50 hover:bg-gray-600/70"
            >
              Batal
            </button>
          </div>
        </div>
          </div>
        </div>
      )}
    </div>
  );
}