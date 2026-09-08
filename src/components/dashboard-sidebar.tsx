"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoutButton } from "@/components/logout-button";

const NAV_ITEMS = [
  { href: "/calendario", label: "Calendario" },
  { href: "/agenda", label: "Agenda" },
  { href: "/clienti", label: "Clienti" },
  { href: "/servizi", label: "Servizi" },
  { href: "/promemoria", label: "Promemoria" },
];

export function DashboardSidebar({ businessName }: { businessName: string }) {
  const pathname = usePathname();

  return (
    <aside className="w-56 shrink-0 bg-black text-white flex flex-col min-h-screen px-3 py-4">
      <div className="px-2 pb-4 text-lg font-semibold">{businessName}</div>
      <nav className="flex-1 flex flex-col gap-1">
        {NAV_ITEMS.map((item) => {
          const active = pathname?.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                active ? "bg-brand-500 text-white" : "text-white/80 hover:bg-white/10"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="px-2 pt-4 border-t border-white/10">
        <LogoutButton />
      </div>
    </aside>
  );
}
