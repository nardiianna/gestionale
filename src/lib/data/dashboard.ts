import { createClient } from "@/lib/supabase/server";

export async function getBookingFormData() {
  const supabase = await createClient();
  const [{ data: services }, { data: staffMembers }, { data: customers }] = await Promise.all([
    supabase
      .from("services")
      .select("id, name, duration_minutes, price_cents")
      .eq("active", true)
      .order("name"),
    supabase.from("staff_members").select("id, display_name").eq("active", true),
    supabase.from("customers").select("id, full_name, phone").order("full_name"),
  ]);

  return {
    services: services ?? [],
    staffMembers: staffMembers ?? [],
    customers: customers ?? [],
  };
}

export type AppointmentWithDetails = {
  id: string;
  starts_at: string;
  ends_at: string;
  status: string;
  notes: string | null;
  customers: { id: string; full_name: string } | null;
  staff_members: { id: string; display_name: string } | null;
  appointment_services: { services: { name: string; color: string } | null }[];
};

export async function getAppointmentsInRange(startIso: string, endIso: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("appointments")
    .select(
      "id, starts_at, ends_at, status, notes, customers(id, full_name), staff_members(id, display_name), appointment_services(services(name, color))",
    )
    .gte("starts_at", startIso)
    .lt("starts_at", endIso)
    .order("starts_at");

  return (data ?? []) as unknown as AppointmentWithDetails[];
}
