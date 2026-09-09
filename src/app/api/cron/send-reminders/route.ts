import { createAdminClient } from "@/lib/supabase/admin";

const SENDER_DOMAIN = "notifiche@gestionale.nardianna.it";

// Only the shared domain is verified for sending, so every business's
// reminders go out through the same address -- but the display name is
// the business's own name, so the recipient immediately recognizes who
// it's from.
function fromAddressFor(businessName: string) {
  return `"${businessName.replace(/"/g, "")}" <${SENDER_DOMAIN}>`;
}

type DueReminder = {
  appointment_id: string;
  starts_at: string;
  customer_email: string;
  customer_name: string;
  business_name: string;
  business_timezone: string;
  email_subject_template: string;
};

async function sendReminderEmail(reminder: DueReminder): Promise<string | null> {
  const formattedTime = new Intl.DateTimeFormat("it-IT", {
    timeZone: reminder.business_timezone,
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(reminder.starts_at));

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: fromAddressFor(reminder.business_name),
      to: [reminder.customer_email],
      subject: reminder.email_subject_template,
      html:
        `<p>Ciao ${reminder.customer_name},</p>` +
        `<p>ti ricordiamo il tuo appuntamento presso <strong>${reminder.business_name}</strong> per <strong>${formattedTime}</strong>.</p>` +
        `<p>A presto!</p>`,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error(`resend send failed for appointment ${reminder.appointment_id}`, body);
    return body.slice(0, 500);
  }
  return null;
}

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const supabase = createAdminClient();
  const { data: dueReminders, error } = await supabase.rpc("get_due_reminders");

  if (error) {
    console.error("get_due_reminders failed", error);
    return Response.json({ error: error.message }, { status: 500 });
  }

  let sent = 0;
  let failed = 0;

  for (const reminder of (dueReminders ?? []) as DueReminder[]) {
    const sendError = await sendReminderEmail(reminder);

    await supabase.from("reminder_log").insert({
      appointment_id: reminder.appointment_id,
      reminder_type: "email_24h",
      status: sendError ? "failed" : "sent",
      error_message: sendError,
    });

    if (sendError) {
      failed++;
    } else {
      sent++;
    }
  }

  return Response.json({ sent, failed });
}
