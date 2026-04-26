import { cn } from "@/lib/utils";
import { APPOINTMENT_STATUS_LABELS, PAYMENT_STATUS_LABELS } from "@/lib/types";

const statusStyles: Record<string, { bg: string; text: string }> = {
  scheduled: { bg: "bg-status-scheduled-bg", text: "text-status-scheduled" },
  confirmed: { bg: "bg-status-confirmed-bg", text: "text-status-confirmed" },
  in_progress: { bg: "bg-status-in-progress-bg", text: "text-status-in-progress" },
  completed: { bg: "bg-status-completed-bg", text: "text-status-completed" },
  cancelled: { bg: "bg-status-cancelled-bg", text: "text-status-cancelled" },
  missed: { bg: "bg-status-missed-bg", text: "text-status-missed" },
  rescheduled: { bg: "bg-status-rescheduled-bg", text: "text-status-rescheduled" },
  active: { bg: "bg-status-completed-bg", text: "text-status-completed" },
  inactive: { bg: "bg-status-cancelled-bg", text: "text-status-cancelled" },
  pending: { bg: "bg-status-scheduled-bg", text: "text-status-scheduled" },
  paid: { bg: "bg-status-completed-bg", text: "text-status-completed" },
  overdue: { bg: "bg-status-missed-bg", text: "text-status-missed" },
  paused: { bg: "bg-status-rescheduled-bg", text: "text-status-rescheduled" },
};

interface StatusBadgeProps {
  status: string;
  label?: string;
  className?: string;
}

export function StatusBadge({ status, label, className }: StatusBadgeProps) {
  const style = statusStyles[status] ?? statusStyles.scheduled;
  const displayLabel = label
    ?? (APPOINTMENT_STATUS_LABELS as Record<string, string>)[status]
    ?? (PAYMENT_STATUS_LABELS as Record<string, string>)[status]
    ?? status;

  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", style.bg, style.text, className)}>
      {displayLabel}
    </span>
  );
}
