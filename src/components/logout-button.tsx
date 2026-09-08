"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function LogoutButton({
  className = "text-sm text-white/70 hover:text-white transition-colors",
}: {
  className?: string;
}) {
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <button onClick={handleLogout} className={className}>
      Esci
    </button>
  );
}
