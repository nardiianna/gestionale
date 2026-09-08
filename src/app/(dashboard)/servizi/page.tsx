import { createClient } from "@/lib/supabase/server";
import { createService, toggleService } from "./actions";

export default async function ServiziPage() {
  const supabase = await createClient();
  const { data: services } = await supabase
    .from("services")
    .select("id, name, duration_minutes, price_cents, color, active")
    .order("created_at", { ascending: true });

  return (
    <div className="grid gap-6 lg:grid-cols-2 max-w-5xl">
      <section className="bg-white rounded-2xl border border-neutral-200 p-6">
        <h1 className="text-lg font-semibold mb-4">Servizi</h1>
        <ul className="flex flex-col gap-2">
          {services?.map((s) => (
            <li
              key={s.id}
              className="flex items-center justify-between rounded-lg border border-neutral-200 px-3 py-2 text-sm"
            >
              <div className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: s.color }}
                />
                <span className={s.active ? "" : "line-through text-neutral-400"}>
                  {s.name}
                </span>
                <span className="text-neutral-500">
                  · {s.duration_minutes} min · {(s.price_cents / 100).toFixed(2)} €
                </span>
              </div>
              <form action={toggleService}>
                <input type="hidden" name="id" value={s.id} />
                <input type="hidden" name="active" value={String(s.active)} />
                <button type="submit" className="text-xs text-brand-600 hover:underline">
                  {s.active ? "Disattiva" : "Riattiva"}
                </button>
              </form>
            </li>
          ))}
          {!services?.length && (
            <li className="text-sm text-neutral-500">Nessun servizio ancora.</li>
          )}
        </ul>
      </section>

      <section className="bg-white rounded-2xl border border-neutral-200 p-6">
        <h2 className="text-lg font-semibold mb-4">Nuovo servizio</h2>
        <form action={createService} className="flex flex-col gap-3">
          <input
            name="name"
            placeholder="Nome servizio (es. Manicure)"
            required
            className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
          />
          <input
            name="duration"
            type="number"
            min={5}
            step={5}
            placeholder="Durata (minuti)"
            required
            className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
          />
          <input
            name="price"
            type="number"
            min={0}
            step={0.5}
            placeholder="Prezzo (€)"
            className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
          />
          <label className="flex items-center gap-2 text-sm text-neutral-600">
            Colore
            <input name="color" type="color" defaultValue="#6366f1" className="h-8 w-12 rounded" />
          </label>
          <button
            type="submit"
            className="mt-2 rounded-lg bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium py-2.5 transition-colors"
          >
            Aggiungi servizio
          </button>
        </form>
      </section>
    </div>
  );
}
