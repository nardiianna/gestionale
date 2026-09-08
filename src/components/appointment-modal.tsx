"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createAppointment } from "@/lib/actions/appointments";

type Service = { id: string; name: string; duration_minutes: number; price_cents: number };
type StaffMember = { id: string; display_name: string };
type Customer = { id: string; full_name: string; phone: string };

type Props = {
  services: Service[];
  staffMembers: StaffMember[];
  customers: Customer[];
  defaultDate?: string;
  defaultTime?: string;
  initialCustomerId?: string;
  trigger?: React.ReactNode;
};

export function AppointmentModal({
  services,
  staffMembers,
  customers,
  defaultDate,
  defaultTime,
  initialCustomerId,
  trigger,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [date, setDate] = useState(defaultDate ?? new Date().toISOString().slice(0, 10));
  const [startTime, setStartTime] = useState(defaultTime ?? "09:00");
  const [staffMemberId, setStaffMemberId] = useState(staffMembers[0]?.id ?? "");
  const [serviceIds, setServiceIds] = useState<string[]>([]);
  const [customerSearch, setCustomerSearch] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(
    initialCustomerId ?? null,
  );
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerPhone, setNewCustomerPhone] = useState("");
  const [notes, setNotes] = useState("");

  const matchingCustomers = useMemo(() => {
    if (!customerSearch || selectedCustomerId) return [];
    const q = customerSearch.toLowerCase();
    return customers
      .filter((c) => c.full_name.toLowerCase().includes(q) || c.phone.includes(q))
      .slice(0, 6);
  }, [customerSearch, customers, selectedCustomerId]);

  function resetAndClose() {
    setOpen(false);
    setError(null);
    setServiceIds([]);
    setSelectedCustomerId(null);
    setCustomerSearch("");
    setNewCustomerName("");
    setNewCustomerPhone("");
    setNotes("");
  }

  function toggleService(id: string) {
    setServiceIds((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const formData = new FormData();
    formData.set("date", date);
    formData.set("startTime", startTime);
    formData.set("staffMemberId", staffMemberId);
    if (selectedCustomerId) {
      formData.set("customerId", selectedCustomerId);
    } else {
      formData.set("newCustomerName", newCustomerName);
      formData.set("newCustomerPhone", newCustomerPhone);
    }
    serviceIds.forEach((id) => formData.append("serviceIds", id));
    formData.set("notes", notes);

    startTransition(async () => {
      const result = await createAppointment(formData);
      if (result?.error) {
        setError(result.error);
        return;
      }
      resetAndClose();
      router.refresh();
    });
  }

  const totalPrice = services
    .filter((s) => serviceIds.includes(s.id))
    .reduce((sum, s) => sum + s.price_cents, 0);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg bg-pink-500 hover:bg-pink-600 text-white text-sm font-medium px-4 py-2 transition-colors"
      >
        {trigger ?? "+ Nuovo appuntamento"}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Nuovo appuntamento</h2>
              <button onClick={resetAndClose} className="text-neutral-400 hover:text-neutral-700">
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-3">
                <label className="flex flex-col gap-1 text-sm text-neutral-600">
                  Data
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                    className="rounded-lg border border-neutral-300 px-3 py-2"
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm text-neutral-600">
                  Ora di inizio
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    required
                    className="rounded-lg border border-neutral-300 px-3 py-2"
                  />
                </label>
              </div>

              <label className="flex flex-col gap-1 text-sm text-neutral-600">
                Operatore
                <select
                  value={staffMemberId}
                  onChange={(e) => setStaffMemberId(e.target.value)}
                  required
                  className="rounded-lg border border-neutral-300 px-3 py-2"
                >
                  {staffMembers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.display_name}
                    </option>
                  ))}
                </select>
              </label>

              <div className="flex flex-col gap-2">
                <span className="text-sm text-neutral-600">Servizi</span>
                <div className="flex flex-col gap-1 max-h-32 overflow-y-auto border border-neutral-200 rounded-lg p-2">
                  {services.map((s) => (
                    <label key={s.id} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={serviceIds.includes(s.id)}
                        onChange={() => toggleService(s.id)}
                      />
                      {s.name} · {s.duration_minutes} min
                    </label>
                  ))}
                  {!services.length && (
                    <span className="text-sm text-neutral-400">
                      Nessun servizio: creane uno nella sezione Servizi.
                    </span>
                  )}
                </div>
                <div className="text-sm text-neutral-500 text-right">
                  Totale: {(totalPrice / 100).toFixed(2)} €
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <span className="text-sm text-neutral-600">Cliente</span>
                {selectedCustomerId ? (
                  <div className="flex items-center justify-between rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm">
                    <span>{customers.find((c) => c.id === selectedCustomerId)?.full_name}</span>
                    <button
                      type="button"
                      onClick={() => setSelectedCustomerId(null)}
                      className="text-xs text-indigo-600 hover:underline"
                    >
                      Cambia
                    </button>
                  </div>
                ) : (
                  <>
                    <input
                      value={customerSearch}
                      onChange={(e) => setCustomerSearch(e.target.value)}
                      placeholder="Cerca cliente esistente per nome o telefono"
                      className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                    />
                    {matchingCustomers.length > 0 && (
                      <ul className="border border-neutral-200 rounded-lg divide-y">
                        {matchingCustomers.map((c) => (
                          <li key={c.id}>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedCustomerId(c.id);
                                setCustomerSearch("");
                              }}
                              className="w-full text-left px-3 py-2 text-sm hover:bg-neutral-50"
                            >
                              {c.full_name} · {c.phone}
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                    <div className="text-xs text-neutral-400">oppure nuovo cliente:</div>
                    <input
                      value={newCustomerName}
                      onChange={(e) => setNewCustomerName(e.target.value)}
                      placeholder="Nome e cognome"
                      className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                    />
                    <input
                      value={newCustomerPhone}
                      onChange={(e) => setNewCustomerPhone(e.target.value)}
                      placeholder="Telefono"
                      className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                    />
                  </>
                )}
              </div>

              <label className="flex flex-col gap-1 text-sm text-neutral-600">
                Nota
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="rounded-lg border border-neutral-300 px-3 py-2"
                />
              </label>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <button
                type="submit"
                disabled={isPending}
                className="mt-2 rounded-lg bg-pink-500 hover:bg-pink-600 disabled:opacity-60 text-white text-sm font-medium py-2.5 transition-colors"
              >
                {isPending ? "Salvataggio..." : "Aggiungi appuntamento"}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
