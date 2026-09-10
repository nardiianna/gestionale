import Link from "next/link";
import { getCurrentBusiness } from "@/lib/profile";
import { getAppointmentsInRange, getBookingFormData, type AppointmentWithDetails } from "@/lib/data/dashboard";
import { addDays, dateKeyInZone, startOfWeek } from "@/lib/date-utils";
import { AppointmentModal } from "@/components/appointment-modal";
import { AgendaGrid } from "@/components/agenda-grid";

const SLOT_MINUTES = 30;
const SLOT_HEIGHT_PX = 40;
const DAY_START_HOUR = 7;
const DAY_END_HOUR = 21;
const TOTAL_SLOTS = ((DAY_END_HOUR - DAY_START_HOUR) * 60) / SLOT_MINUTES;
const TOTAL_HEIGHT_PX = TOTAL_SLOTS * SLOT_HEIGHT_PX;

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

  const anchor = dateParam ? new Date(`${dateParam}T00:00:00Z`) : new Date();
  const weekStart = startOfWeek(anchor);
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const rangeEnd = addDays(weekStart, 8);

  const [business, appointments, formData] = await Promise.all([
    getCurrentBusiness(),
    getAppointmentsInRange(weekStart.toISOString(), rangeEnd.toISOString()),
    getBookingFormData(),
  ]);
  const timezone = business?.timezone ?? "Europe/Rome";

  const appointmentsByDay: Record<string, AppointmentWithDetails[]> = {};
  for (const appt of appointments) {
    const key = dateKeyInZone(appt.starts_at, timezone);
    if (!appointmentsByDay[key]) appointmentsByDay[key] = [];
    appointmentsByDay[key].push(appt);
  }

  const weekDaysInfo = weekDays.map((d) => ({
    key: d.toISOString().slice(0, 10),
    dayIndex: (d.getUTCDay() + 6) % 7,
    dayNum: d.getUTCDate(),
  }));

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
        <AppointmentModal {...formData} defaultDate={weekDaysInfo[0].key} />
      </div>

      <AgendaGrid
        weekDays={weekDaysInfo}
        slots={slotLabels()}
        slotMinutes={SLOT_MINUTES}
        slotHeightPx={SLOT_HEIGHT_PX}
        totalHeightPx={TOTAL_HEIGHT_PX}
        gridStartMinutes={DAY_START_HOUR * 60}
        timezone={timezone}
        appointmentsByDay={appointmentsByDay}
        {...formData}
      />
    </div>
  );
}
