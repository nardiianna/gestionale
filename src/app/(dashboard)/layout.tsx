import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";
import { DashboardSidebar } from "@/components/dashboard-sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getCurrentProfile();

  if (!profile) redirect("/login");
  if (profile.role === "super_admin") redirect("/admin");

  const supabase = await createClient();
  const { data: business } = await supabase
    .from("businesses")
    .select("name")
    .eq("id", profile.business_id!)
    .single();

  return (
    <div className="flex min-h-screen">
      <DashboardSidebar businessName={business?.name ?? "Il mio salone"} />
      <main className="flex-1 bg-neutral-50 p-6">{children}</main>
    </div>
  );
}
