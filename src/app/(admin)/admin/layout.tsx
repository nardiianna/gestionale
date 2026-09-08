import { redirect } from "next/navigation";
import Image from "next/image";
import { getCurrentProfile } from "@/lib/profile";
import { LogoutButton } from "@/components/logout-button";
import { BackButton } from "@/components/back-button";
import { AppCredit } from "@/components/app-credit";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getCurrentProfile();

  if (!profile) redirect("/login");
  if (profile.role !== "super_admin") redirect("/calendario");

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="bg-white border-b border-neutral-200 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Image src="/logo.png" alt="Gestionale" width={144} height={48} priority />
          <span className="text-xs font-semibold text-brand-600 uppercase tracking-wide">
            Super Admin
          </span>
        </div>
        <LogoutButton className="text-sm text-neutral-500 hover:text-black transition-colors" />
      </header>
      <main className="p-6">
        <BackButton className="mb-4 flex items-center gap-1 text-sm text-neutral-500 hover:text-black transition-colors" />
        {children}
      </main>
      <footer className="px-6 py-4 text-center">
        <AppCredit className="inline-block text-xs" />
      </footer>
    </div>
  );
}
