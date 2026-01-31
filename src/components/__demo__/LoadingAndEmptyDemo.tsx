'use client'

import React, { useState } from "react";
import Skeleton from "../Loading/Skeleton";
import EmptyState from "../Empty/EmptyState";

export default function LoadingAndEmptyDemo() {
	const [loading, setLoading] = useState(true);
	const [items, setItems] = useState<string[]>([]);

	return (
		<div style={{ display: "grid", gap: 16 }}>
			<div style={{ display: "flex", gap: 8 }}>
				<button onClick={() => setLoading((s) => !s)}>{loading ? "Stop loading" : "Start loading"}</button>
				<button onClick={() => { setItems([]); setLoading(false); }}>Set empty</button>
				<button onClick={() => { setLoading(false); setItems(["Collection A", "Collection B"]); }}>Load items</button>
			</div>

			<section>
				{loading ? (
					<Skeleton variant="card" count={3} />
				) : items.length === 0 ? (
					<EmptyState
						icon={<svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden><path d="M3 12h18" stroke="currentColor" strokeWidth="1.2" /></svg>}
						title="No collections"
						description="Create a collection to get started."
						action={<button onClick={() => setItems(["New collection"])}>Create collection</button>}
					/>
				) : (
					<div style={{ display: "grid", gap: 12 }}>
						{items.map((it) => (
							<div key={it} style={{ padding: 12, border: "1px solid rgba(0,0,0,0.08)", borderRadius: 8 }}>
								{it}
							</div>
						))}
					</div>
				)}
			</section>
		</div>
	);
}
