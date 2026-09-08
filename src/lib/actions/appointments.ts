"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/profile";
import { zonedWallTimeToUtc } from "@/lib/date-utils";

export type AppointmentActionResult = { error?: string };

export async function createAppointment(
  formData: FormData,
): Promise<AppointmentActionResult> {
  const profile = await getCurrentProfile();
  if (!profile?.business_id) return { error: "Non autorizzato" };

  const supabase = await createClient();

  const date = String(formData.get("date"));
  const startTime = String(formData.get("startTime"));
  const staffMemberId = String(formData.get("staffMemberId"));
  const customerId = String(formData.get("customerId") ?? "");
  const newCustomerName = String(formData.get("newCustomerName") ?? "").trim();
  const newCustomerPhone = String(formData.get("newCustomerPhone") ?? "").trim();
  const serviceIds = formData.getAll("serviceIds").map(String).filter(Boolean);
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!date || !startTime || !staffMemberId || serviceIds.length === 0) {
    return { error: "Compila data, ora, operatore e almeno un servizio" };
  }

  let resolvedCustomerId = customerId || null;
  if (!resolvedCustomerId) {
    if (!newCustomerName || !newCustomerPhone) {
      return { error: "Seleziona un cliente esistente o inserisci nome e telefono" };
    }
    const { data: customer, error: customerError } = await supabase
      .from("customers")
      .upsert(
        { business_id: profile.business_id, full_name: newCustomerName, phone: newCustomerPhone },
        { onConflict: "business_id,phone" },
      )
      .select("id")
      .single();
    if (customerError) return { error: customerError.message };
    resolvedCustomerId = customer.id;
  }

  const { data: services, error: servicesError } = await supabase
    .from("services")
    .select("id, duration_minutes, price_cents")
    .in("id", serviceIds);
  if (servicesError) return { error: servicesError.message };

  const { data: business, error: businessError } = await supabase
    .from("businesses")
    .select("timezone")
    .eq("id", profile.business_id)
    .single();
  if (businessError) return { error: businessError.message };

  const totalMinutes = services.reduce((sum, s) => sum + s.duration_minutes, 0);
  const startsAt = zonedWallTimeToUtc(date, startTime, business.timezone);
  const endsAt = new Date(startsAt.getTime() + totalMinutes * 60_000);

  const { data: appointment, error: appointmentError } = await supabase
    .from("appointments")
    .insert({
      business_id: profile.business_id,
      customer_id: resolvedCustomerId,
      staff_member_id: staffMemberId,
      starts_at: startsAt.toISOString(),
      ends_at: endsAt.toISOString(),
      notes,
      created_via: "staff",
    })
    .select("id")
    .single();

  if (appointmentError) {
    if (appointmentError.code === "23P01") {
      return { error: "Questo operatore ha già un appuntamento in questa fascia oraria." };
    }
    return { error: appointmentError.message };
  }

  const { error: linkError } = await supabase.from("appointment_services").insert(
    services.map((s) => ({
      appointment_id: appointment.id,
      business_id: profile.business_id,
      service_id: s.id,
      price_cents: s.price_cents,
      duration_minutes: s.duration_minutes,
    })),
  );
  if (linkError) return { error: linkError.message };

  revalidatePath("/calendario");
  revalidatePath("/agenda");
  revalidatePath("/clienti");
  return {};
}

export async function updateAppointmentStatus(
  appointmentId: string,
  status: "scheduled" | "completed" | "cancelled" | "no_show",
) {
  const profile = await getCurrentProfile();
  if (!profile?.business_id) throw new Error("Non autorizzato");

  const supabase = await createClient();
  const { error } = await supabase
    .from("appointments")
    .update({ status })
    .eq("id", appointmentId)
    .eq("business_id", profile.business_id);
  if (error) throw new Error(error.message);

  revalidatePath("/calendario");
  revalidatePath("/agenda");
  revalidatePath("/clienti");
}

export async function cancelAppointmentForm(formData: FormData) {
  const id = String(formData.get("id"));
  await updateAppointmentStatus(id, "cancelled");
}
