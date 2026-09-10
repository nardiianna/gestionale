import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentBusiness } from "@/lib/profile";
import { getBookingFormData } from "@/lib/data/dashboard";
import { formatTimeInZone } from "@/lib/date-utils";
import { AppointmentModal } from "@/components/appointment-modal";

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: customer }, business, { data: appointmentsData }, formData] = await Promise.all([
    supabase.from("customers").select("id, full_name, phone, email, notes").eq("id", id).single(),
    getCurrentBusiness(),
    supabase
      .from("appointments")
      .select("id, starts_at, ends_at, status, appointment_services(services(name))")
      .eq("customer_id", id)
      .order("starts_at", { ascending: false }),
    getBookingFormData(),
  ]);
  if (!customer) notFound();
  const timezone = business?.timezone ?? "Europe/Rome";

  const appointments = (appointmentsData ?? []) as unknown as {
    id: string;
    starts_at: string;
    ends_at: string;
    status: string;
    appointment_services: { services: { name: string } | null }[];
  }[];

  return (
    <div className="flex flex-col gap-4 max-w-5xl">
      <Link href="/clienti" className="text-sm text-brand-600 hover:underline w-fit">
        ‹ Tutti i clienti
      </Link>

      <div className="grid gap-6 lg:grid-cols-[1fr_2fr]">
      <section className="bg-white rounded-2xl border border-neutral-200 p-6 h-fit">
        <h1 className="text-lg font-semibold mb-2">{customer.full_name}</h1>
        <p className="text-sm text-neutral-600">{customer.phone}</p>
        {customer.email && <p className="text-sm text-neutral-600">{customer.email}</p>}
        {customer.notes && <p className="text-sm text-neutral-500 mt-2">{customer.notes}</p>}
      </section>

      <section className="bg-white rounded-2xl border border-neutral-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Appuntamenti</h2>
          <AppointmentModal {...formData} initialCustomerId={customer.id} />
        </div>
        <ul className="flex flex-col gap-2">
          {appointments?.map((a) => (
            <li
              key={a.id}
              className="flex items-center justify-between rounded-lg border border-neutral-200 px-3 py-2 text-sm"
            >
              <span>
                {formatTimeInZone(a.starts_at, timezone)}–{formatTimeInZone(a.ends_at, timezone)} ·{" "}
                {a.appointment_services.map((s) => s.services?.name).filter(Boolean).join(", ")}
              </span>
              <span className="text-neutral-500">{a.status}</span>
            </li>
          ))}
          {!appointments?.length && (
            <li className="text-sm text-neutral-500">Nessun appuntamento ancora.</li>
          )}
        </ul>
      </section>
      </div>
    </div>
  );
}
