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
