import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/profile";
import { getAppointmentsInRange, getBookingFormData } from "@/lib/data/dashboard";
import { monthGridDates, monthLabel, weekdayLabels, dateKeyInZone, formatTimeInZone } from "@/lib/date-utils";
import { textColorFor } from "@/lib/color-utils";
import { AppointmentModal } from "@/components/appointment-modal";

const DEFAULT_COLOR = "#111827";

export default async function CalendarioPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month: monthParam } = await searchParams;
  const profile = await getCurrentProfile();
  const supabase = await createClient();
  const { data: business } = await supabase
    .from("businesses")
    .select("timezone")
    .eq("id", profile!.business_id!)
    .single();
  const timezone = business?.timezone ?? "Europe/Rome";

  const now = new Date();
  const [year, month] = monthParam
    ? monthParam.split("-").map(Number)
    : [now.getUTCFullYear(), now.getUTCMonth() + 1];
  const zeroBasedMonth = month - 1;

  const days = monthGridDates(year, zeroBasedMonth);
  const rangeStart = new Date(days[0]);
  rangeStart.setUTCDate(rangeStart.getUTCDate() - 1);
  const rangeEnd = new Date(days[days.length - 1]);
  rangeEnd.setUTCDate(rangeEnd.getUTCDate() + 2);

  const [appointments, formData] = await Promise.all([
    getAppointmentsInRange(rangeStart.toISOString(), rangeEnd.toISOString()),
    getBookingFormData(),
  ]);

  const byDay = new Map<string, typeof appointments>();
  for (const appt of appointments) {
    const key = dateKeyInZone(appt.starts_at, timezone);
    if (!byDay.has(key)) byDay.set(key, []);
    byDay.get(key)!.push(appt);
  }

  const prevMonthDate = new Date(Date.UTC(year, zeroBasedMonth - 1, 1));
  const nextMonthDate = new Date(Date.UTC(year, zeroBasedMonth + 1, 1));
  const prevHref = `/calendario?month=${prevMonthDate.getUTCFullYear()}-${String(prevMonthDate.getUTCMonth() + 1).padStart(2, "0")}`;
  const nextHref = `/calendario?month=${nextMonthDate.getUTCFullYear()}-${String(nextMonthDate.getUTCMonth() + 1).padStart(2, "0")}`;
  const todayKey = dateKeyInZone(new Date().toISOString(), timezone);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={prevHref} className="text-neutral-400 hover:text-neutral-700">
            ‹
          </Link>
          <h1 className="text-2xl font-semibold">{monthLabel(year, zeroBasedMonth)}</h1>
          <Link href={nextHref} className="text-neutral-400 hover:text-neutral-700">
            ›
          </Link>
          <Link href="/agenda" className="ml-4 text-sm text-brand-600 hover:underline">
            Vai ad Agenda
          </Link>
        </div>
        <AppointmentModal {...formData} defaultDate={todayKey} />
      </div>

      <div className="grid grid-cols-7 gap-px bg-neutral-200 rounded-xl overflow-hidden border border-neutral-200">
        {weekdayLabels().map((label) => (
          <div key={label} className="bg-neutral-100 px-2 py-2 text-xs font-semibold text-neutral-500">
            {label}
          </div>
        ))}
        {days.map((day) => {
          const key = day.toISOString().slice(0, 10);
          const inMonth = day.getUTCMonth() === zeroBasedMonth;
          const dayAppointments = byDay.get(key) ?? [];
          return (
            <Link
              key={key}
              href={`/agenda?date=${key}`}
              className={`bg-white min-h-24 p-2 flex flex-col gap-1 hover:bg-neutral-50 transition-colors ${
                inMonth ? "" : "opacity-40"
              } ${key === todayKey ? "ring-2 ring-inset ring-brand-300" : ""}`}
            >
              <span className="text-sm">{day.getUTCDate()}</span>
              <div className="flex flex-col gap-0.5">
                {dayAppointments.slice(0, 3).map((a) => {
                  const color = a.appointment_services[0]?.services?.color ?? DEFAULT_COLOR;
                  return (
                    <span
                      key={a.id}
                      className="rounded text-[11px] px-1.5 py-0.5 truncate"
                      style={{ backgroundColor: color, color: textColorFor(color) }}
                    >
                      {formatTimeInZone(a.starts_at, timezone)} {a.customers?.full_name}
                    </span>
                  );
                })}
                {dayAppointments.length > 3 && (
                  <span className="text-[11px] text-neutral-400">+{dayAppointments.length - 3} altri</span>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
