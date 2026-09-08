"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Service = { id: string; name: string; duration_minutes: number; price_cents: number };

export function BookingWizard({ slug, services }: { slug: string; services: Service[] }) {
  const [step, setStep] = useState<"services" | "slots" | "details" | "done">("services");
  const [serviceIds, setServiceIds] = useState<string[]>([]);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [slots, setSlots] = useState<string[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function toggleService(id: string) {
    setServiceIds((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));
  }

  async function loadSlots() {
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase.rpc("get_available_slots", {
      p_business_slug: slug,
      p_service_ids: serviceIds,
      p_date: date,
    });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setSlots((data ?? []).map((row: { slot_start: string }) => row.slot_start));
    setStep("slots");
  }

  async function submitBooking(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.rpc("create_public_booking", {
      p_business_slug: slug,
      p_service_ids: serviceIds,
      p_starts_at: selectedSlot,
      p_full_name: fullName,
      p_phone: phone,
      p_email: email || null,
    });
    setLoading(false);
    if (error) {
      if (error.message.includes("SLOT_TAKEN")) {
        setError("Questo orario non è più disponibile. Scegline un altro.");
        setStep("slots");
        loadSlots();
        return;
      }
      setError(error.message);
      return;
    }
    setStep("done");
  }

  const totalMinutes = services
    .filter((s) => serviceIds.includes(s.id))
    .reduce((sum, s) => sum + s.duration_minutes, 0);

  if (step === "done") {
    return (
      <div className="text-center py-8">
        <p className="text-lg font-medium text-green-700">Prenotazione confermata!</p>
        <p className="text-sm text-neutral-500 mt-2">Riceverai un promemoria prima dell&apos;appuntamento.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {step === "services" && (
        <>
          <h2 className="text-sm font-semibold text-neutral-700">1. Scegli i servizi</h2>
          <div className="flex flex-col gap-1 border border-neutral-200 rounded-lg p-2">
            {services.map((s) => (
              <label key={s.id} className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={serviceIds.includes(s.id)} onChange={() => toggleService(s.id)} />
                {s.name} · {s.duration_minutes} min · {(s.price_cents / 100).toFixed(2)} €
              </label>
            ))}
            {!services.length && <p className="text-sm text-neutral-400">Nessun servizio disponibile.</p>}
          </div>

          <label className="flex flex-col gap-1 text-sm text-neutral-600">
            Data
            <input
              type="date"
              value={date}
              min={new Date().toISOString().slice(0, 10)}
              onChange={(e) => setDate(e.target.value)}
              className="rounded-lg border border-neutral-300 px-3 py-2"
            />
          </label>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            onClick={loadSlots}
            disabled={!serviceIds.length || loading}
            className="rounded-lg bg-pink-500 hover:bg-pink-600 disabled:opacity-60 text-white text-sm font-medium py-2.5"
          >
            {loading ? "Ricerca..." : "Cerca disponibilità"}
          </button>
        </>
      )}

      {step === "slots" && (
        <>
          <h2 className="text-sm font-semibold text-neutral-700">2. Scegli l&apos;orario</h2>
          <p className="text-xs text-neutral-500">Durata totale: {totalMinutes} min</p>
          <div className="grid grid-cols-3 gap-2">
            {slots.map((slot) => (
              <button
                key={slot}
                onClick={() => {
                  setSelectedSlot(slot);
                  setStep("details");
                }}
                className="rounded-lg border border-neutral-300 hover:border-indigo-500 hover:bg-indigo-50 px-2 py-2 text-sm"
              >
                {new Date(slot).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}
              </button>
            ))}
            {!slots.length && <p className="col-span-3 text-sm text-neutral-400">Nessun orario disponibile per questa data.</p>}
          </div>
          <button onClick={() => setStep("services")} className="text-sm text-neutral-500 hover:underline w-fit">
            ‹ Indietro
          </button>
        </>
      )}

      {step === "details" && (
        <form onSubmit={submitBooking} className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-neutral-700">3. I tuoi dati</h2>
          <input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Nome e cognome"
            required
            className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
          />
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Telefono"
            required
            className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
          />
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            placeholder="Email (opzionale, per il promemoria)"
            className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
          />

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-pink-500 hover:bg-pink-600 disabled:opacity-60 text-white text-sm font-medium py-2.5"
          >
            {loading ? "Conferma in corso..." : "Conferma prenotazione"}
          </button>
          <button type="button" onClick={() => setStep("slots")} className="text-sm text-neutral-500 hover:underline w-fit">
            ‹ Indietro
          </button>
        </form>
      )}
    </div>
  );
}
