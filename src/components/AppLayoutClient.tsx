"use client";

import React, { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Sidebar from "@/components/Sidebar";

export default function AppLayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user && pathname !== "/login") {
      router.replace("/login");
    }
  }, [loading, user, pathname, router]);

  if (!user) {
    if (pathname === "/login") {
      // Belum login & sedang di halaman login -> tampilkan halaman login
      return <>{children}</>;
    }
    if (loading) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-angkringan-dark">
          <div className="text-center">
            <span className="text-6xl animate-bounce block mb-4">🏮</span>
            <p className="text-angkringan-gold text-lg">Memuat...</p>
          </div>
        </div>
      );
    }
    // Belum login & bukan halaman login -> redirect ke /login
    return null;
  }

  return (
    <div className="h-screen flex overflow-hidden">
      <Sidebar
        isOpen={sidebarOpen}
        onOpen={() => setSidebarOpen(true)}
        onClose={() => setSidebarOpen(false)}
      />

      <div
        className={`flex-1 flex flex-col min-h-0 transition-[margin] duration-300 ease-in-out ${
          sidebarOpen ? "ml-64" : "ml-8"
        }`}
      >
        <main className="flex-1 p-4 lg:p-6 overflow-y-auto min-h-0">
          {children}
        </main>
      </div>
    </div>
  );
}
