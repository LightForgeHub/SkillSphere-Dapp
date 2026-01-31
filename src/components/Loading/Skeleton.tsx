import React from "react";
import styles from "./Skeleton.module.css";

type Variant = "card" | "list" | "tableRow";

interface SkeletonProps {
	variant?: Variant;
	count?: number;
	className?: string;
}

/**
 * Reusable skeleton UI:
 * - variant: 'card' | 'list' | 'tableRow'
 * - count: how many repeated skeletons
 */
export default function Skeleton({
	variant = "card",
	count = 1,
	className,
}: SkeletonProps) {
	const items = Array.from({ length: count });
	return (
		<div aria-busy="true" role="status" className={`${styles.container} ${className ?? ""}`}>
			{items.map((_, i) => (
				<div key={i} className={`${styles.skeleton} ${styles[variant]}`}>
					{variant === "card" && (
						<>
							<div className={styles.image} />
							<div className={styles.content}>
								<div className={styles.line} style={{ width: "60%" }} />
								<div className={styles.line} style={{ width: "90%" }} />
								<div className={styles.line} style={{ width: "40%" }} />
							</div>
						</>
					)}

					{variant === "list" && (
						<>
							<div className={styles.row}>
								<div className={styles.avatar} />
								<div className={styles.content}>
									<div className={styles.line} style={{ width: "40%" }} />
									<div className={styles.line} style={{ width: "70%" }} />
								</div>
							</div>
						</>
					)}

					{variant === "tableRow" && (
						<>
							<div className={styles.rowCells}>
								<div className={styles.cell} style={{ width: "30%" }} />
								<div className={styles.cell} style={{ width: "40%" }} />
								<div className={styles.cell} style={{ width: "20%" }} />
							</div>
						</>
					)}

					<div className={styles.shimmer} aria-hidden="true" />
				</div>
			))}
		</div>
	);
}
