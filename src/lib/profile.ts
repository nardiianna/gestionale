import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export type Profile = {
  id: string;
  role: "super_admin" | "staff";
  business_id: string | null;
  full_name: string | null;
};

export type Business = {
  id: string;
  name: string;
  timezone: string;
};

// Cached per request: the layout and the page both need the profile, and
// without this every render pass hit Supabase auth + the profiles table twice.
export const getCurrentProfile = cache(async (): Promise<Profile | null> => {
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
});

// Cached per request for the same reason as getCurrentProfile above.
export const getCurrentBusiness = cache(async (): Promise<Business | null> => {
  const profile = await getCurrentProfile();
  if (!profile?.business_id) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from("businesses")
    .select("id, name, timezone")
    .eq("id", profile.business_id)
    .single();

  return (data as Business) ?? null;
});
