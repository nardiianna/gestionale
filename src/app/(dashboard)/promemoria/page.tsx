import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/profile";
import { updateReminderSettings } from "./actions";

export default async function PromemoriaPage() {
  const profile = await getCurrentProfile();
  const supabase = await createClient();
  const { data: settings } = await supabase
    .from("reminder_settings")
    .select("enabled, hours_before, email_subject_template")
    .eq("business_id", profile!.business_id!)
    .single();

  return (
    <div className="max-w-2xl bg-white rounded-2xl border border-neutral-200 p-6">
      <h1 className="text-lg font-semibold mb-1">Promemoria appuntamento</h1>
      <p className="text-sm text-neutral-500 mb-4">
        Invia automaticamente un&apos;email di promemoria prima di ogni appuntamento.
      </p>

      <form action={updateReminderSettings} className="flex flex-col gap-4">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="enabled"
            defaultChecked={settings?.enabled ?? true}
          />
          Promemoria attivo
        </label>

        <label className="flex flex-col gap-1 text-sm text-neutral-600">
          Ore prima dell&apos;appuntamento
          <input
            type="number"
            name="hoursBefore"
            min={1}
            defaultValue={settings?.hours_before ?? 24}
            className="w-32 rounded-lg border border-neutral-300 px-3 py-2"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm text-neutral-600">
          Oggetto email
          <input
            type="text"
            name="emailSubject"
            defaultValue={settings?.email_subject_template ?? "Promemoria appuntamento"}
            className="rounded-lg border border-neutral-300 px-3 py-2"
          />
        </label>

        <div className="flex items-center gap-2 text-sm">
          <span className="rounded-full bg-neutral-100 px-3 py-1 text-neutral-500">SMS — prossimamente</span>
          <span className="rounded-full bg-neutral-100 px-3 py-1 text-neutral-500">WhatsApp — prossimamente</span>
        </div>

        <button
          type="submit"
          className="mt-2 w-fit rounded-lg bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium px-4 py-2.5 transition-colors"
        >
          Salva impostazioni
        </button>
      </form>
    </div>
  );
}
