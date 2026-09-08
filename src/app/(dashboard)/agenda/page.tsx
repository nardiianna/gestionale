import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/profile";
import { getAppointmentsInRange, getBookingFormData, type AppointmentWithDetails } from "@/lib/data/dashboard";
import { addDays, dateKeyInZone, formatTimeInZone, startOfWeek } from "@/lib/date-utils";
import { AppointmentModal } from "@/components/appointment-modal";
import { cancelAppointmentForm } from "@/lib/actions/appointments";

const DAY_LABELS = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"];
const DAY_START_HOUR = 7;
const DAY_END_HOUR = 21;

function slotLabels() {
  const labels: string[] = [];
  for (let h = DAY_START_HOUR; h < DAY_END_HOUR; h++) {
    labels.push(`${String(h).padStart(2, "0")}:00`);
    labels.push(`${String(h).padStart(2, "0")}:30`);
  }
  return labels;
}

export default async function AgendaPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { date: dateParam } = await searchParams;
  const profile = await getCurrentProfile();
  const supabase = await createClient();
  const { data: business } = await supabase
    .from("businesses")
    .select("timezone")
    .eq("id", profile!.business_id!)
    .single();
  const timezone = business?.timezone ?? "Europe/Rome";

  const anchor = dateParam ? new Date(`${dateParam}T00:00:00Z`) : new Date();
  const weekStart = startOfWeek(anchor);
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const rangeEnd = addDays(weekStart, 8);

  const [appointments, formData] = await Promise.all([
    getAppointmentsInRange(weekStart.toISOString(), rangeEnd.toISOString()),
    getBookingFormData(),
  ]);

  const byDayKey = new Map<string, AppointmentWithDetails[]>();
  for (const appt of appointments) {
    const key = dateKeyInZone(appt.starts_at, timezone);
    if (!byDayKey.has(key)) byDayKey.set(key, []);
    byDayKey.get(key)!.push(appt);
  }

  const slots = slotLabels();
  const prevHref = `/agenda?date=${addDays(weekStart, -1).toISOString().slice(0, 10)}`;
  const nextHref = `/agenda?date=${addDays(weekStart, 7).toISOString().slice(0, 10)}`;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={prevHref} className="text-neutral-400 hover:text-neutral-700">
            ‹
          </Link>
          <h1 className="text-2xl font-semibold">
            {weekDays[0].getUTCDate()} - {weekDays[6].getUTCDate()}{" "}
            {weekDays[6].toLocaleDateString("it-IT", { month: "long", timeZone: "UTC" })}
          </h1>
          <Link href={nextHref} className="text-neutral-400 hover:text-neutral-700">
            ›
          </Link>
          <Link href="/calendario" className="ml-4 text-sm text-brand-600 hover:underline">
            Vai a Calendario
          </Link>
        </div>
        <AppointmentModal {...formData} defaultDate={weekDays[0].toISOString().slice(0, 10)} />
      </div>

      <div className="overflow-x-auto border border-neutral-200 rounded-xl bg-white">
        <div className="grid grid-cols-[64px_repeat(7,1fr)] min-w-[900px]">
          <div className="border-b border-neutral-200" />
          {weekDays.map((d) => {
            const key = d.toISOString().slice(0, 10);
            return (
              <div key={key} className="border-b border-l border-neutral-200 px-2 py-2 text-center">
                <div className="text-xs font-semibold text-neutral-500">{DAY_LABELS[(d.getUTCDay() + 6) % 7]}</div>
                <div className="text-sm">{d.getUTCDate()}</div>
              </div>
            );
          })}

          {slots.map((slotLabel) => (
            <FragmentRow
              key={slotLabel}
              slotLabel={slotLabel}
              weekDays={weekDays}
              byDayKey={byDayKey}
              timezone={timezone}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function FragmentRow({
  slotLabel,
  weekDays,
  byDayKey,
  timezone,
}: {
  slotLabel: string;
  weekDays: Date[];
  byDayKey: Map<string, AppointmentWithDetails[]>;
  timezone: string;
}) {
  return (
    <>
      <div className="border-b border-neutral-100 px-2 py-1 text-[11px] text-neutral-400 text-right">
        {slotLabel}
      </div>
      {weekDays.map((d) => {
        const key = d.toISOString().slice(0, 10);
        const dayAppointments = byDayKey.get(key) ?? [];
        const startingHere = dayAppointments.find(
          (a) => formatTimeInZone(a.starts_at, timezone) === slotLabel,
        );
        const covered = dayAppointments.find((a) => {
          const startLabel = formatTimeInZone(a.starts_at, timezone);
          const endLabel = formatTimeInZone(a.ends_at, timezone);
          return startLabel < slotLabel && slotLabel < endLabel;
        });

        if (startingHere) {
          const services = startingHere.appointment_services
            .map((s) => s.services?.name)
            .filter(Boolean)
            .join(", ");
          return (
            <div key={key} className="border-b border-l border-neutral-100 p-1">
              <div className="rounded-md bg-black text-white text-[11px] p-1.5 flex flex-col gap-0.5">
                <span className="font-medium truncate">{startingHere.customers?.full_name}</span>
                <span className="opacity-80 truncate">{services || "—"}</span>
                <span className="opacity-70">
                  {formatTimeInZone(startingHere.starts_at, timezone)}–{formatTimeInZone(startingHere.ends_at, timezone)}
                </span>
                <form action={cancelAppointmentForm}>
                  <input type="hidden" name="id" value={startingHere.id} />
                  <button type="submit" className="text-[10px] underline opacity-80 hover:opacity-100">
                    Annulla
                  </button>
                </form>
              </div>
            </div>
          );
        }

        if (covered) {
          return <div key={key} className="border-b border-l border-neutral-100 bg-neutral-100" />;
        }

        return (
          <div key={key} className="border-b border-l border-neutral-100 min-h-8" />
        );
      })}
    </>
  );
}
