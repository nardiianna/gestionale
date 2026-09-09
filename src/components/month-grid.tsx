"use client";

import { useState } from "react";
import Link from "next/link";
import type { AppointmentWithDetails } from "@/lib/data/dashboard";
import { dateKeyInZone, formatTimeInZone } from "@/lib/date-utils";
import { textColorFor } from "@/lib/color-utils";
import { AppointmentDialog, type Customer, type Service, type StaffMember } from "@/components/appointment-dialog";

const DEFAULT_COLOR = "#111827";

type DayInfo = { key: string; dayNum: number; inMonth: boolean; isToday: boolean };

type Props = {
  days: DayInfo[];
  timezone: string;
  appointmentsByDay: Record<string, AppointmentWithDetails[]>;
  services: Service[];
  staffMembers: StaffMember[];
  customers: Customer[];
};

export function MonthGrid({ days, timezone, appointmentsByDay, services, staffMembers, customers }: Props) {
  const [editingAppointment, setEditingAppointment] = useState<AppointmentWithDetails | null>(null);

  return (
    <>
      {days.map((day) => {
        const dayAppointments = appointmentsByDay[day.key] ?? [];
        const cellClasses = `bg-white min-h-24 p-2 flex flex-col gap-1 ${
          day.inMonth ? "" : "opacity-40"
        } ${day.isToday ? "ring-2 ring-inset ring-brand-300" : ""}`;

        if (!dayAppointments.length) {
          return (
            <Link
              key={day.key}
              href={`/agenda?date=${day.key}`}
              className={`${cellClasses} hover:bg-neutral-50 transition-colors`}
            >
              <span className="text-sm">{day.dayNum}</span>
            </Link>
          );
        }

        return (
          <div key={day.key} className={cellClasses}>
            <Link href={`/agenda?date=${day.key}`} className="text-sm w-fit hover:underline">
              {day.dayNum}
            </Link>
            <div className="flex flex-col gap-0.5">
              {dayAppointments.slice(0, 3).map((a) => {
                const color = a.appointment_services[0]?.services?.color ?? DEFAULT_COLOR;
                return (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => setEditingAppointment(a)}
                    className="rounded text-[11px] px-1.5 py-0.5 truncate text-left cursor-pointer"
                    style={{ backgroundColor: color, color: textColorFor(color) }}
                  >
                    {formatTimeInZone(a.starts_at, timezone)} {a.customers?.full_name}
                  </button>
                );
              })}
              {dayAppointments.length > 3 && (
                <Link href={`/agenda?date=${day.key}`} className="text-[11px] text-neutral-400 hover:underline">
                  +{dayAppointments.length - 3} altri
                </Link>
              )}
            </div>
          </div>
        );
      })}

      <AppointmentDialog
        key={editingAppointment?.id ?? "not-editing"}
        open={!!editingAppointment}
        onClose={() => setEditingAppointment(null)}
        appointmentId={editingAppointment?.id}
        customerName={editingAppointment?.customers?.full_name}
        defaultDate={editingAppointment ? dateKeyInZone(editingAppointment.starts_at, timezone) : undefined}
        defaultTime={editingAppointment ? formatTimeInZone(editingAppointment.starts_at, timezone) : undefined}
        initialStaffMemberId={editingAppointment?.staff_members?.id}
        initialServiceIds={editingAppointment?.appointment_services.map((s) => s.service_id)}
        initialNotes={editingAppointment?.notes ?? undefined}
        services={services}
        staffMembers={staffMembers}
        customers={customers}
      />
    </>
  );
}
