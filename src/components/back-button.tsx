"use client";

import { useRouter } from "next/navigation";

export function BackButton({ className }: { className?: string }) {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => router.back()}
      aria-label="Indietro"
      className={className ?? "flex items-center gap-1 text-sm text-neutral-500 hover:text-black transition-colors"}
    >
      ← Indietro
    </button>
  );
}
