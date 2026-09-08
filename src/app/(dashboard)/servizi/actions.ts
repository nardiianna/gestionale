"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/profile";

export async function createService(formData: FormData) {
  const profile = await getCurrentProfile();
  if (!profile?.business_id) throw new Error("Non autorizzato");

  const supabase = await createClient();
  const name = String(formData.get("name") ?? "").trim();
  const duration = Number(formData.get("duration"));
  const price = Number(formData.get("price"));
  const color = String(formData.get("color") ?? "#6366f1");

  if (!name || !duration) throw new Error("Compila nome e durata");

  const { error } = await supabase.from("services").insert({
    business_id: profile.business_id,
    name,
    duration_minutes: duration,
    price_cents: Math.round((price || 0) * 100),
    color,
  });
  if (error) throw new Error(error.message);

  revalidatePath("/servizi");
}

export async function toggleService(formData: FormData) {
  const profile = await getCurrentProfile();
  if (!profile?.business_id) throw new Error("Non autorizzato");

  const id = String(formData.get("id"));
  const active = formData.get("active") === "true";

  const supabase = await createClient();
  const { error } = await supabase
    .from("services")
    .update({ active: !active })
    .eq("id", id)
    .eq("business_id", profile.business_id);
  if (error) throw new Error(error.message);

  revalidatePath("/servizi");
}
