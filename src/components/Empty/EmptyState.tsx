import React from "react";
import styles from "./EmptyState.module.css";

interface EmptyStateProps {
	title?: React.ReactNode;
	description?: React.ReactNode;
	icon?: React.ReactNode;
	action?: React.ReactNode;
	className?: string;
}

/**
 * EmptyState: simple, neutral, dark-mode friendly.
 * - Avoids hardcoded copy (accepts props for strings)
 */
export default function EmptyState({
	title,
	description,
	icon,
	action,
	className,
}: EmptyStateProps) {
	return (
		<div className={`${styles.wrapper} ${className ?? ""}`} role="status" aria-live="polite">
			<div className={styles.inner}>
				{icon && <div className={styles.icon}>{icon}</div>}
				{title && <h3 className={styles.title}>{title}</h3>}
				{description && <p className={styles.description}>{description}</p>}
				{action && <div className={styles.action}>{action}</div>}
			</div>
		</div>
	);
}
