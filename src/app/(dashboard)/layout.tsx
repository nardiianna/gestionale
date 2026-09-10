import { redirect } from "next/navigation";
import { getCurrentProfile, getCurrentBusiness } from "@/lib/profile";
import { DashboardSidebar } from "@/components/dashboard-sidebar";
import { BackButton } from "@/components/back-button";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getCurrentProfile();

  if (!profile) redirect("/login");
  if (profile.role === "super_admin") redirect("/admin");

  const business = await getCurrentBusiness();

  return (
    <div className="flex flex-col md:flex-row min-h-screen">
      <DashboardSidebar businessName={business?.name ?? "Il mio salone"} />
      <main className="flex-1 bg-neutral-50 p-4 md:p-6 min-w-0">
        <BackButton className="mb-4 flex items-center gap-1 text-sm text-neutral-500 hover:text-black transition-colors" />
        {children}
      </main>
    </div>
  );
}
