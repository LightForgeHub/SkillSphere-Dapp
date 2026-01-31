import React from "react";
import LoadingAndEmptyDemo from "../src/components/__demo__/LoadingAndEmptyDemo";

export default function TestPage() {
	return (
		<main style={{ padding: 20, display: "grid", gap: 16 }}>
			<h1>Test: Loading & Empty states</h1>
			<LoadingAndEmptyDemo />
		</main>
	);
}
