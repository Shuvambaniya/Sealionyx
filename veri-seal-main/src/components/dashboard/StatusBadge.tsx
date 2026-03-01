import { cn } from "@/lib/utils";
import { CheckCircle, AlertCircle, XCircle, Clock } from "lucide-react";

type StatusType = "valid" | "warning" | "error" | "pending";

interface StatusBadgeProps {
  status: StatusType;
  label: string;
}

const statusConfig = {
  valid: {
    icon: CheckCircle,
    className: "status-badge-success",
  },
  warning: {
    icon: AlertCircle,
    className: "status-badge-warning",
  },
  error: {
    icon: XCircle,
    className: "status-badge-error",
  },
  pending: {
    icon: Clock,
    className: "status-badge-info",
  },
};

export function StatusBadge({ status, label }: StatusBadgeProps) {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <span className={cn("status-badge", config.className)}>
      <Icon className="h-3.5 w-3.5" />
      {label}
    </span>
  );
}
