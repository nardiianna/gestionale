import { createClient } from "@/lib/supabase/server";
import { createBusiness } from "./actions";

export default async function AdminPage() {
  const supabase = await createClient();
  const { data: businesses } = await supabase
    .from("businesses")
    .select("id, name, slug, active, created_at")
    .order("created_at", { ascending: false });

  return (
    <div className="grid gap-6 lg:grid-cols-2 max-w-5xl">
      <section className="bg-white rounded-2xl border border-neutral-200 p-6">
        <h2 className="text-lg font-semibold mb-4">Clienti (business)</h2>
        <ul className="flex flex-col gap-2">
          {businesses?.map((b) => (
            <li
              key={b.id}
              className="flex items-center justify-between rounded-lg border border-neutral-200 px-3 py-2 text-sm"
            >
              <span className="font-medium">{b.name}</span>
              <span className="text-neutral-500">/{b.slug}</span>
            </li>
          ))}
          {!businesses?.length && (
            <li className="text-sm text-neutral-500">Nessun cliente ancora.</li>
          )}
        </ul>
      </section>

      <section className="bg-white rounded-2xl border border-neutral-200 p-6">
        <h2 className="text-lg font-semibold mb-4">Nuovo cliente</h2>
        <form action={createBusiness} className="flex flex-col gap-3">
          <input
            name="businessName"
            placeholder="Nome attività (es. Beauty Boutique)"
            required
            className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
          />
          <input
            name="ownerName"
            placeholder="Nome titolare/operatore"
            required
            className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
          />
          <input
            name="ownerEmail"
            type="email"
            placeholder="Email di accesso"
            required
            className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
          />
          <input
            name="ownerPassword"
            type="password"
            placeholder="Password iniziale"
            required
            minLength={8}
            className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
          />
          <button
            type="submit"
            className="mt-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium py-2.5 transition-colors"
          >
            Crea cliente
          </button>
        </form>
      </section>
    </div>
  );
}
