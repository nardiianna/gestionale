import { createClient } from "@/lib/supabase/server";

export type Profile = {
  id: string;
  role: "super_admin" | "staff";
  business_id: string | null;
  full_name: string | null;
};

export async function getCurrentProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("id, role, business_id, full_name")
    .eq("id", user.id)
    .single();

  return (data as Profile) ?? null;
}
