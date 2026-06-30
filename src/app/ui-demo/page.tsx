'use-client'

import React from "react";
import LoadingAndEmptyDemo from "../../components/__demo__/LoadingAndEmptyDemo";
import ClassChatRoom from "@/components/dashboard/chat/ClassChatRoom";
import TaskTabContent from "@/components/dashboard/TaskTabContent";

export default function UiDemoPage() {
	return (
		<main style={{ padding: 20, display: "grid", gap: 32 }}>
			<section>
				<h1 className="text-xl font-bold mb-4 text-foreground">UI Demo: Task Tab Content</h1>
				<div className="flex justify-center">
					<TaskTabContent />
				</div>
			</section>

			<section>
				<h1 className="text-xl font-bold mb-4 text-foreground">UI Demo: Class Chat Room</h1>
				<div className="max-w-[800px]">
					<ClassChatRoom />
				</div>
			</section>

			<section>
				<h1 className="text-xl font-bold mb-4 text-foreground">UI Demo: Loading & Empty states</h1>
				<LoadingAndEmptyDemo />
			</section>
		</main>
	);
}
