import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/profile";

export default async function Home() {
  const profile = await getCurrentProfile();

  if (!profile) redirect("/login");
  redirect(profile.role === "super_admin" ? "/admin" : "/calendario");
}
