import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/profile";
import { getAppointmentsInRange, getBookingFormData, type AppointmentWithDetails } from "@/lib/data/dashboard";
import {
  addDays,
  dateKeyInZone,
  formatTimeInZone,
  minutesSinceMidnightInZone,
  startOfWeek,
} from "@/lib/date-utils";
import { textColorFor } from "@/lib/color-utils";
import { AppointmentModal } from "@/components/appointment-modal";
import { cancelAppointmentForm } from "@/lib/actions/appointments";

const DAY_LABELS = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"];
const SLOT_MINUTES = 30;
const SLOT_HEIGHT_PX = 40;
const DAY_START_HOUR = 7;
const DAY_END_HOUR = 21;
const TOTAL_SLOTS = ((DAY_END_HOUR - DAY_START_HOUR) * 60) / SLOT_MINUTES;
const TOTAL_HEIGHT_PX = TOTAL_SLOTS * SLOT_HEIGHT_PX;
const DEFAULT_COLOR = "#111827";

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
  const gridStartMinutes = DAY_START_HOUR * 60;

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
        <div className="flex min-w-[900px]">
          <div className="w-16 shrink-0">
            <div className="h-14 border-b border-neutral-200" />
            <div className="relative" style={{ height: TOTAL_HEIGHT_PX }}>
              {slots.map((label, i) => (
                <div
                  key={label}
                  className="absolute inset-x-0 border-b border-neutral-100 px-2 text-[11px] text-neutral-400 text-right"
                  style={{ top: i * SLOT_HEIGHT_PX, height: SLOT_HEIGHT_PX }}
                >
                  {label}
                </div>
              ))}
            </div>
          </div>

          {weekDays.map((d) => {
            const key = d.toISOString().slice(0, 10);
            const dayAppointments = byDayKey.get(key) ?? [];
            return (
              <div key={key} className="flex-1 border-l border-neutral-200 min-w-[110px]">
                <div className="h-14 border-b border-neutral-200 px-2 py-2 text-center">
                  <div className="text-xs font-semibold text-neutral-500">
                    {DAY_LABELS[(d.getUTCDay() + 6) % 7]}
                  </div>
                  <div className="text-sm">{d.getUTCDate()}</div>
                </div>

                <div className="relative" style={{ height: TOTAL_HEIGHT_PX }}>
                  {slots.map((_, i) => (
                    <div
                      key={i}
                      className="absolute inset-x-0 border-b border-neutral-100"
                      style={{ top: i * SLOT_HEIGHT_PX, height: SLOT_HEIGHT_PX }}
                    />
                  ))}

                  {dayAppointments.map((a) => {
                    const startMin = minutesSinceMidnightInZone(a.starts_at, timezone) - gridStartMinutes;
                    const endMin = minutesSinceMidnightInZone(a.ends_at, timezone) - gridStartMinutes;
                    const top = (Math.max(startMin, 0) / SLOT_MINUTES) * SLOT_HEIGHT_PX;
                    const height = (Math.max(endMin - Math.max(startMin, 0), SLOT_MINUTES / 2) / SLOT_MINUTES) * SLOT_HEIGHT_PX;
                    const color = a.appointment_services[0]?.services?.color ?? DEFAULT_COLOR;
                    const textColor = textColorFor(color);
                    const services = a.appointment_services
                      .map((s) => s.services?.name)
                      .filter(Boolean)
                      .join(", ");

                    return (
                      <div
                        key={a.id}
                        className="absolute inset-x-1 rounded-md p-1.5 text-[11px] overflow-hidden flex flex-col gap-0.5 shadow-sm"
                        style={{ top, height, backgroundColor: color, color: textColor }}
                      >
                        <span className="font-medium truncate">{a.customers?.full_name}</span>
                        <span className="opacity-80 truncate">{services || "—"}</span>
                        <span className="opacity-70">
                          {formatTimeInZone(a.starts_at, timezone)}–{formatTimeInZone(a.ends_at, timezone)}
                        </span>
                        <form action={cancelAppointmentForm}>
                          <input type="hidden" name="id" value={a.id} />
                          <button type="submit" className="text-[10px] underline opacity-80 hover:opacity-100">
                            Annulla
                          </button>
                        </form>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
