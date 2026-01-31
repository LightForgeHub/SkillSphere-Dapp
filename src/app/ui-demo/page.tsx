'use-client'

import React from "react";
import LoadingAndEmptyDemo from "../../components/__demo__/LoadingAndEmptyDemo";

export default function UiDemoPage() {
	return (
		<main style={{ padding: 20, display: "grid", gap: 16 }}>
			<h1>UI Demo: Loading & Empty states</h1>
			<LoadingAndEmptyDemo />
		</main>
	);
}
