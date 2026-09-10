import Link from "next/link";
import { getCurrentBusiness } from "@/lib/profile";
import { getAppointmentsInRange, getBookingFormData, type AppointmentWithDetails } from "@/lib/data/dashboard";
import { monthGridDates, monthLabel, weekdayLabels, dateKeyInZone } from "@/lib/date-utils";
import { AppointmentModal } from "@/components/appointment-modal";
import { MonthGrid } from "@/components/month-grid";

export default async function CalendarioPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month: monthParam } = await searchParams;

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

  const [business, appointments, formData] = await Promise.all([
    getCurrentBusiness(),
    getAppointmentsInRange(rangeStart.toISOString(), rangeEnd.toISOString()),
    getBookingFormData(),
  ]);
  const timezone = business?.timezone ?? "Europe/Rome";

  const appointmentsByDay: Record<string, AppointmentWithDetails[]> = {};
  for (const appt of appointments) {
    const key = dateKeyInZone(appt.starts_at, timezone);
    if (!appointmentsByDay[key]) appointmentsByDay[key] = [];
    appointmentsByDay[key].push(appt);
  }

  const prevMonthDate = new Date(Date.UTC(year, zeroBasedMonth - 1, 1));
  const nextMonthDate = new Date(Date.UTC(year, zeroBasedMonth + 1, 1));
  const prevHref = `/calendario?month=${prevMonthDate.getUTCFullYear()}-${String(prevMonthDate.getUTCMonth() + 1).padStart(2, "0")}`;
  const nextHref = `/calendario?month=${nextMonthDate.getUTCFullYear()}-${String(nextMonthDate.getUTCMonth() + 1).padStart(2, "0")}`;
  const todayKey = dateKeyInZone(new Date().toISOString(), timezone);

  const daysInfo = days.map((day) => ({
    key: day.toISOString().slice(0, 10),
    dayNum: day.getUTCDate(),
    inMonth: day.getUTCMonth() === zeroBasedMonth,
    isToday: day.toISOString().slice(0, 10) === todayKey,
  }));

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
        <MonthGrid
          days={daysInfo}
          timezone={timezone}
          appointmentsByDay={appointmentsByDay}
          {...formData}
        />
      </div>
    </div>
  );
}
