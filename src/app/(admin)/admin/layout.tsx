import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/profile";
import { LogoutButton } from "@/components/logout-button";

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
      <header className="bg-neutral-900 text-white px-6 py-3 flex items-center justify-between">
        <span className="font-semibold">Nardi Creates — Super Admin</span>
        <LogoutButton />
      </header>
      <main className="p-6">{children}</main>
    </div>
  );
}
