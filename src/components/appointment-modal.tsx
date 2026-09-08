"use client";

import { useState } from "react";
import { AppointmentDialog, type Customer, type Service, type StaffMember } from "@/components/appointment-dialog";

type Props = {
  services: Service[];
  staffMembers: StaffMember[];
  customers: Customer[];
  defaultDate?: string;
  defaultTime?: string;
  initialCustomerId?: string;
  trigger?: React.ReactNode;
};

export function AppointmentModal({ trigger, ...dialogProps }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium px-4 py-2 transition-colors"
      >
        {trigger ?? "+ Nuovo appuntamento"}
      </button>

      <AppointmentDialog {...dialogProps} open={open} onClose={() => setOpen(false)} />
    </>
  );
}
