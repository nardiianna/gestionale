"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentProfile } from "@/lib/profile";

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export async function createBusiness(formData: FormData) {
  const profile = await getCurrentProfile();
  if (profile?.role !== "super_admin") {
    throw new Error("Non autorizzato");
  }

  const businessName = String(formData.get("businessName") ?? "").trim();
  const ownerName = String(formData.get("ownerName") ?? "").trim();
  const ownerEmail = String(formData.get("ownerEmail") ?? "").trim();
  const ownerPassword = String(formData.get("ownerPassword") ?? "").trim();

  if (!businessName || !ownerName || !ownerEmail || !ownerPassword) {
    throw new Error("Compila tutti i campi");
  }

  const slug = slugify(businessName);

  // Writes below go through the authenticated (RLS-respecting) client:
  // the tenant_isolation policies explicitly allow is_super_admin() writes.
  const supabase = await createClient();

  const { data: business, error: businessError } = await supabase
    .from("businesses")
    .insert({ name: businessName, slug })
    .select()
    .single();
  if (businessError) throw new Error(businessError.message);

  // Creating the actual login requires the Auth Admin API -- only available
  // with the service-role key, never exposed to the browser.
  const admin = createAdminClient();
  const { data: authUser, error: authError } = await admin.auth.admin.createUser({
    email: ownerEmail,
    password: ownerPassword,
    email_confirm: true,
  });
  if (authError) throw new Error(authError.message);

  const { error: profileError } = await supabase.from("profiles").insert({
    id: authUser.user.id,
    role: "staff",
    business_id: business.id,
    full_name: ownerName,
  });
  if (profileError) throw new Error(profileError.message);

  const { error: staffError } = await supabase.from("staff_members").insert({
    business_id: business.id,
    profile_id: authUser.user.id,
    display_name: ownerName,
  });
  if (staffError) throw new Error(staffError.message);

  await supabase.from("reminder_settings").insert({ business_id: business.id });

  // Default hours: Mon-Sat 9:00-19:00 (weekday 1-6, 0 = Sunday closed).
  const defaultHours = [1, 2, 3, 4, 5, 6].map((weekday) => ({
    business_id: business.id,
    weekday,
    start_time: "09:00",
    end_time: "19:00",
  }));
  await supabase.from("business_hours").insert(defaultHours);

  revalidatePath("/admin");
}
