import { Badge } from "@/components/ui/badge";
import {
  REMINDER_STATUS_LABELS,
  REMINDER_STATUS_VARIANTS,
  type ReminderStatus,
} from "@/services/appointmentReminderService";

interface Props {
  status: ReminderStatus;
}

export function ReminderStatusBadge({ status }: Props) {
  return (
    <Badge variant={REMINDER_STATUS_VARIANTS[status]}>
      {REMINDER_STATUS_LABELS[status]}
    </Badge>
  );
}
