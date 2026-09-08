import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { BookingWizard } from "@/components/booking-wizard";
import { AppCredit } from "@/components/app-credit";

export default async function PublicBookingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  // Server Component running in our own trusted backend: safe to use the
  // service-role client here purely to render the page. The interactive
  // booking flow below only ever talks to Supabase through the two public
  // SECURITY DEFINER RPCs (get_available_slots / create_public_booking),
  // never through direct table access with the anon key.
  const admin = createAdminClient();

  const { data: business } = await admin
    .from("businesses")
    .select("id, name, timezone")
    .eq("slug", slug)
    .eq("active", true)
    .single();
  if (!business) notFound();

  const { data: services } = await admin
    .from("services")
    .select("id, name, duration_minutes, price_cents")
    .eq("business_id", business.id)
    .eq("active", true)
    .order("name");

  return (
    <div className="min-h-screen bg-neutral-50 py-10 px-4">
      <div className="max-w-lg mx-auto bg-white rounded-2xl border border-neutral-200 p-6">
        <h1 className="text-xl font-semibold mb-1">{business.name}</h1>
        <p className="text-sm text-neutral-500 mb-6">Prenota il tuo appuntamento online</p>
        <BookingWizard slug={slug} services={services ?? []} />
      </div>
      <div className="text-center mt-6">
        <AppCredit className="inline-block text-xs" />
      </div>
    </div>
  );
}
