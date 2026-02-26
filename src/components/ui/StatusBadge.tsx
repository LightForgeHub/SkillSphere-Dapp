import * as React from "react";
import { Badge } from "./Badge";
import { cn } from "./utils";

export type StatusVariant =
    | "resolved"
    | "pending"
    | "completed"
    | "published"
    | "draft";

/** Alias for the two course-status values used in CourseCard */
export type CourseStatus = "Published" | "Draft";

interface StatusBadgeProps extends React.ComponentProps<typeof Badge> {
    status: StatusVariant | CourseStatus | string;
    className?: string;
}

const statusMap: Record<
    string,
    { label: string; variant: React.ComponentProps<typeof Badge>["variant"] }
> = {
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
    published: {
        label: "Published",
        variant: "published",
    },
    draft: {
        label: "Draft",
        variant: "draft",
    },
};

export function StatusBadge({ status, className, ...props }: StatusBadgeProps) {
    const normalizedStatus = status.toLowerCase();
    const config = statusMap[normalizedStatus] ?? {
        label: status,
        variant: "outline" as const,
    };

    return (
        <Badge
            variant={config.variant}
            className={cn(
                "capitalize font-medium align-middle text-xs px-3 py-1 rounded-full",
                className
            )}
            {...props}
        >
            {config.label}
        </Badge>
    );
}
