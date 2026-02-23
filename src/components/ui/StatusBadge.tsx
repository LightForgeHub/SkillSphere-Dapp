import * as React from "react";
import { Badge } from "./Badge";
import { cn } from "./utils";

export type StatusVariant = "resolved" | "pending" | "completed";

interface StatusBadgeProps extends React.ComponentProps<typeof Badge> {
    status: StatusVariant | string;
    className?: string;
}

const statusMap: Record<string, { label: string; variant: React.ComponentProps<typeof Badge>["variant"] }> = {
    resolved: {
        label: "Resolved",
        variant: "success",
    },
    pending: {
        label: "Pending",
        variant: "warning",
    },
    completed: {
        label: "Completed",
        variant: "info",
    },
};

export function StatusBadge({ status, className, ...props }: StatusBadgeProps) {
    const normalizedStatus = status.toLowerCase();
    const config = statusMap[normalizedStatus] || {
        label: status,
        variant: "outline",
    };

    return (
        <Badge
            variant={config.variant}
            className={cn("capitalize font-medium align-middle", className)}
            {...props}
        >
            {config.label}
        </Badge>
    );
}
