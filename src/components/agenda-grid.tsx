"use client";

import { useState } from "react";
import type { AppointmentWithDetails } from "@/lib/data/dashboard";
import { formatTimeInZone, minutesSinceMidnightInZone } from "@/lib/date-utils";
import { textColorFor } from "@/lib/color-utils";
import { cancelAppointmentForm } from "@/lib/actions/appointments";
import { AppointmentDialog, type Customer, type Service, type StaffMember } from "@/components/appointment-dialog";

const DAY_LABELS = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"];
const DEFAULT_COLOR = "#111827";

type DayInfo = { key: string; dayIndex: number; dayNum: number };

type Props = {
  weekDays: DayInfo[];
  slots: string[];
  slotMinutes: number;
  slotHeightPx: number;
  totalHeightPx: number;
  gridStartMinutes: number;
  timezone: string;
  appointmentsByDay: Record<string, AppointmentWithDetails[]>;
  services: Service[];
  staffMembers: StaffMember[];
  customers: Customer[];
};

export function AgendaGrid({
  weekDays,
  slots,
  slotMinutes,
  slotHeightPx,
  totalHeightPx,
  gridStartMinutes,
  timezone,
  appointmentsByDay,
  services,
  staffMembers,
  customers,
}: Props) {
  const [activeSlot, setActiveSlot] = useState<{ date: string; time: string } | null>(null);

  return (
    <>
      <div className="overflow-x-auto border border-neutral-200 rounded-xl bg-white">
        <div className="flex min-w-[900px]">
          <div className="w-16 shrink-0">
            <div className="h-14 border-b border-neutral-200" />
            <div className="relative" style={{ height: totalHeightPx }}>
              {slots.map((label, i) => (
                <div
                  key={label}
                  className="absolute inset-x-0 border-b border-neutral-100 px-2 text-[11px] text-neutral-400 text-right"
                  style={{ top: i * slotHeightPx, height: slotHeightPx }}
                >
                  {label}
                </div>
              ))}
            </div>
          </div>

          {weekDays.map((d) => {
            const dayAppointments = appointmentsByDay[d.key] ?? [];
            return (
              <div key={d.key} className="flex-1 border-l border-neutral-200 min-w-[110px]">
                <div className="h-14 border-b border-neutral-200 px-2 py-2 text-center">
                  <div className="text-xs font-semibold text-neutral-500">{DAY_LABELS[d.dayIndex]}</div>
                  <div className="text-sm">{d.dayNum}</div>
                </div>

                <div className="relative" style={{ height: totalHeightPx }}>
                  {slots.map((slotLabel, i) => (
                    <button
                      key={slotLabel}
                      type="button"
                      onClick={() => setActiveSlot({ date: d.key, time: slotLabel })}
                      className="absolute inset-x-0 border-b border-neutral-100 hover:bg-brand-50 transition-colors"
                      style={{ top: i * slotHeightPx, height: slotHeightPx }}
                    />
                  ))}

                  {dayAppointments.map((a) => {
                    const startMin = minutesSinceMidnightInZone(a.starts_at, timezone) - gridStartMinutes;
                    const endMin = minutesSinceMidnightInZone(a.ends_at, timezone) - gridStartMinutes;
                    const top = (Math.max(startMin, 0) / slotMinutes) * slotHeightPx;
                    const height =
                      (Math.max(endMin - Math.max(startMin, 0), slotMinutes / 2) / slotMinutes) * slotHeightPx;
                    const color = a.appointment_services[0]?.services?.color ?? DEFAULT_COLOR;
                    const textColor = textColorFor(color);
                    const serviceNames = a.appointment_services
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
                        <span className="opacity-80 truncate">{serviceNames || "—"}</span>
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

      <AppointmentDialog
        key={activeSlot ? `${activeSlot.date}-${activeSlot.time}` : "closed"}
        open={!!activeSlot}
        onClose={() => setActiveSlot(null)}
        defaultDate={activeSlot?.date}
        defaultTime={activeSlot?.time}
        services={services}
        staffMembers={staffMembers}
        customers={customers}
      />
    </>
  );
}
