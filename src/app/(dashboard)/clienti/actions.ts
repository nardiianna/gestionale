"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/profile";

export async function createCustomer(formData: FormData) {
  const profile = await getCurrentProfile();
  if (!profile?.business_id) throw new Error("Non autorizzato");

  const fullName = String(formData.get("fullName") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!fullName || !phone) throw new Error("Nome e telefono sono obbligatori");

  const supabase = await createClient();
  const { error } = await supabase.from("customers").insert({
    business_id: profile.business_id,
    full_name: fullName,
    phone,
    email,
    notes,
  });
  if (error) throw new Error(error.message);

  revalidatePath("/clienti");
}
