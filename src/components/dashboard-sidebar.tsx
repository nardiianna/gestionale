"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoutButton } from "@/components/logout-button";
import { AppCredit } from "@/components/app-credit";

const NAV_ITEMS = [
  { href: "/calendario", label: "Calendario" },
  { href: "/agenda", label: "Agenda" },
  { href: "/clienti", label: "Clienti" },
  { href: "/servizi", label: "Servizi" },
  { href: "/promemoria", label: "Promemoria" },
];

export function DashboardSidebar({ businessName }: { businessName: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="md:hidden flex items-center justify-between bg-black text-white px-4 py-3">
        <span className="font-semibold">{businessName}</span>
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Apri menu"
          className="p-1 text-white/80 hover:text-white"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <aside
        className={`fixed md:static inset-y-0 left-0 z-50 w-56 shrink-0 bg-black text-white flex flex-col min-h-screen px-3 py-4 transform transition-transform duration-200 md:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="px-2 pb-4 text-lg font-semibold flex items-center justify-between">
          <span>{businessName}</span>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Chiudi menu"
            className="md:hidden text-white/70 hover:text-white"
          >
            ✕
          </button>
        </div>
        <nav className="flex-1 flex flex-col gap-1">
          {NAV_ITEMS.map((item) => {
            const active = pathname?.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  active ? "bg-brand-500 text-white" : "text-white/80 hover:bg-white/10"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="px-2 pt-4 border-t border-white/10 flex flex-col gap-3">
          <LogoutButton />
          <AppCredit variant="dark" className="text-[11px] opacity-80" />
        </div>
      </aside>
    </>
  );
}
