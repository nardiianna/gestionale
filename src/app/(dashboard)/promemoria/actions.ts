"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/profile";

export async function updateReminderSettings(formData: FormData) {
  const profile = await getCurrentProfile();
  if (!profile?.business_id) throw new Error("Non autorizzato");

  const enabled = formData.get("enabled") === "on";
  const hoursBefore = Number(formData.get("hoursBefore"));
  const emailSubject = String(formData.get("emailSubject") ?? "").trim();

  const supabase = await createClient();
  const { error } = await supabase.from("reminder_settings").upsert({
    business_id: profile.business_id,
    enabled,
    hours_before: hoursBefore || 24,
    email_subject_template: emailSubject || "Promemoria appuntamento",
  });
  if (error) throw new Error(error.message);

  revalidatePath("/promemoria");
}

const SENDER_DOMAIN = "notifiche@gestionale.nardianna.it";

// Only the shared domain is verified for sending, so every business's
// reminders go out through the same address -- but the display name is
// the business's own name, so the recipient immediately recognizes who
// it's from.
function fromAddressFor(businessName: string) {
  return `"${businessName.replace(/"/g, "")}" <${SENDER_DOMAIN}>`;
}

export async function sendTestReminder(): Promise<{ error?: string; success?: boolean }> {
  const profile = await getCurrentProfile();
  if (!profile?.business_id) return { error: "Non autorizzato" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return { error: "Nessuna email associata al tuo account" };

  const { data: business } = await supabase
    .from("businesses")
    .select("name")
    .eq("id", profile.business_id)
    .single();

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: fromAddressFor(business?.name ?? "Gestionale"),
      to: [user.email],
      subject: "Promemoria appuntamento (test)",
      html: "<p>Questa è un'email di test dei promemoria appuntamento di Gestionale.</p><p>Se la ricevi, l'invio funziona correttamente.</p>",
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    return { error: body.slice(0, 300) };
  }
  return { success: true };
}
