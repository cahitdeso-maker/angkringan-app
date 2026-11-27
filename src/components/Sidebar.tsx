"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

const menuItems = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: "📊",
    roles: ["Admin"],
  },
  {
    href: "/kasir",
    label: "POS Kasir",
    icon: "💳",
    roles: ["Admin", "Kasir"],
  },
  { href: "/menu", label: "Menu", icon: "🍽️", roles: ["Admin"] },
  {
    href: "/bahan-baku",
    label: "Bahan Baku",
    icon: "🧺",
    roles: ["Admin"],
  },
  {
    href: "/gabung-bahan",
    label: "Gabung Bahan",
    icon: "🔗",
    roles: ["Admin"],
  },
  { href: "/laporan", label: "Laporan", icon: "📈", roles: ["Admin"] },
  { href: "/users", label: "Users", icon: "👥", roles: ["Admin"] },
];

interface SidebarProps {
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onOpen, onClose }: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [logoError, setLogoError] = React.useState(false);

  const filteredMenu = menuItems.filter(
    (item) => user && item.roles.includes(user.role),
  );

  return (
    <>
      {/* Reopen strip - visible saat sidebar tertutup */}
      {!isOpen && (
        <button
          onClick={onOpen}
          aria-label="Buka menu navigasi"
          className="fixed top-0 left-0 z-40 h-full w-8 bg-angkringan-dark border-r border-angkringan-primary/30 flex items-start justify-center pt-3 hover:bg-angkringan-warm transition-colors"
        >
          <span className="text-angkringan-gold text-xl leading-none">☰</span>
        </button>
      )}

      <aside
        className={`
        fixed top-0 left-0 z-50 h-full w-64
        bg-gradient-to-b from-angkringan-dark to-angkringan-warm
        border-r border-angkringan-primary/30
        transform transition-transform duration-300 ease-in-out
        ${isOpen ? "translate-x-0" : "-translate-x-full"}
        flex flex-col
      `}
      >
        {/* Logo + tombol hamburger tutup */}
      {/* Logo + tombol hamburger tutup */}
        <div className="relative px-4 pt-2 pb-1.5 border-b border-angkringan-primary/20 flex-shrink-0">
          <div className="flex items-center justify-between pr-8">
            {/* Area Logo dan Identitas */}
            <div className="relative flex items-center ml-1 -my-1">
              {logoError ? (
                <span className="text-3xl">🏮</span>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src="/img/giat coffee.png"
                  alt="Logo"
                  className="w-16 h-16 object-contain rounded-md
                            brightness-125 contrast-150 saturate-200
                            drop-shadow-[0_0_6px_rgba(255,215,0,0.45)]"
                  onError={() => setLogoError(true)}
                />
              )}

              {/* Tulisan di samping/menimpa logo */}
              <div className="ml-0 z-10">
                <h1 className="text-lg font-bold text-angkringan-gold whitespace-nowrap drop-shadow-lg leading-tight">
                  GIAT COFFEE
                </h1>
                <p className="text-xs text-angkringan-secondary whitespace-nowrap drop-shadow-lg leading-tight">
                  Sregep Usaha.
                </p>
              </div>
            </div>

            {/* Tombol Menu */}
            <button
              onClick={onClose}
              aria-label="Tutup menu navigasi"
              className="absolute top-2 right-2 z-20 text-angkringan-gold text-2xl leading-none px-1 hover:text-angkringan-accent transition-colors"
            >
              ☰
            </button>
          </div>
        </div>

        {/* User info */}
        {user && (
          <div className="px-4 py-3 border-b border-angkringan-primary/20 bg-angkringan-primary/10 flex-shrink-0">
            <p className="text-sm font-medium text-angkringan-gold">
              {user.nama}
            </p>
            <p className="text-xs text-angkringan-secondary">
              Role:{" "}
              <span className="text-angkringan-accent font-semibold">
                {user.role}
              </span>
            </p>
          </div>
        )}

        {/* Navigation - scrollable */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {filteredMenu.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm
                  transition-all duration-200
                  ${
                    isActive
                      ? "bg-angkringan-primary/30 text-angkringan-gold border border-angkringan-primary/50"
                      : "text-angkringan-light/70 hover:bg-angkringan-primary/20 hover:text-angkringan-light"
                  }
                `}
              >
                <span className="text-lg">{item.icon}</span>
                <span>{item.label}</span>
                {isActive && <span className="ml-auto text-xs">●</span>}
              </Link>
            );
          })}
        </nav>

        {/* Bottom actions - fixed at bottom */}
        <div className="p-3 border-t border-angkringan-primary/30 flex-shrink-0">
          <button
            onClick={() => {
              logout();
              router.push("/login");
            }}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm text-red-400 hover:bg-red-900/30 hover:text-red-300 transition-all duration-200"
          >
            <span className="text-lg">🚪</span>
            <span>Keluar</span>
          </button>
        </div>
      </aside>
    </>
  );
}
