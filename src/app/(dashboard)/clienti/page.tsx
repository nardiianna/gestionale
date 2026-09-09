import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createCustomer } from "./actions";

export default async function ClientiPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("customers")
    .select("id, full_name, phone, email")
    .order("full_name");
  if (q) {
    query = query.or(`full_name.ilike.%${q}%,phone.ilike.%${q}%`);
  }
  const { data: customers } = await query;

  return (
    <div className="grid gap-6 lg:grid-cols-[2fr_1fr] max-w-5xl">
      <section className="bg-white rounded-2xl border border-neutral-200 p-6">
        <h1 className="text-lg font-semibold mb-4">Clienti</h1>
        <form className="mb-4">
          <input
            name="q"
            defaultValue={q}
            placeholder="Cerca cliente per nome o telefono"
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
          />
        </form>
        <ul className="flex flex-col gap-2">
          {customers?.map((c) => (
            <li key={c.id}>
              <Link
                href={`/clienti/${c.id}`}
                className="flex items-center justify-between rounded-lg border border-neutral-200 px-3 py-2 text-sm hover:bg-neutral-50"
              >
                <span className="font-medium">{c.full_name}</span>
                <span className="text-neutral-500">{c.phone}</span>
              </Link>
            </li>
          ))}
          {!customers?.length && (
            <li className="text-sm text-neutral-500">Nessun cliente trovato.</li>
          )}
        </ul>
      </section>

      <section className="bg-white rounded-2xl border border-neutral-200 p-6">
        <h2 className="text-lg font-semibold mb-4">Nuovo cliente</h2>
        <form action={createCustomer} className="flex flex-col gap-3">
          <input
            name="fullName"
            placeholder="Nome"
            required
            className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
          />
          <input
            name="phone"
            placeholder="Telefono"
            required
            className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
          />
          <input
            name="email"
            type="email"
            placeholder="Email"
            required
            className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
          />
          <textarea
            name="notes"
            placeholder="Nota del cliente"
            rows={2}
            className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
          />
          <button
            type="submit"
            className="mt-2 rounded-lg bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium py-2.5 transition-colors"
          >
            Aggiungi cliente
          </button>
        </form>
      </section>
    </div>
  );
}
