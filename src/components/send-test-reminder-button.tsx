"use client";

import { useTransition, useState } from "react";
import { sendTestReminder } from "@/app/(dashboard)/promemoria/actions";

export function SendTestReminderButton() {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{ error?: string; success?: boolean } | null>(null);

  function handleClick() {
    setResult(null);
    startTransition(async () => {
      const res = await sendTestReminder();
      setResult(res);
    });
  }

  return (
    <div className="flex flex-col gap-2 items-start">
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className="rounded-lg border border-neutral-300 hover:border-brand-400 disabled:opacity-60 text-sm font-medium px-4 py-2 transition-colors"
      >
        {isPending ? "Invio in corso..." : "Invia test"}
      </button>
      {result?.success && <p className="text-sm text-green-700">Email di test inviata alla tua casella.</p>}
      {result?.error && <p className="text-sm text-red-600">Invio fallito: {result.error}</p>}
    </div>
  );
}
