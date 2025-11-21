import { useState } from "react";

import { Timeline } from "./components/Timeline";
import { TrendView } from "./components/TrendView";

export const App = () => {
	const [currentView, setCurrentView] = useState<"TRIAGE" | "TRENDS">("TRIAGE");

	return (
		<div className="flex min-h-screen flex-col bg-gray-50 font-sans text-gray-900">
			<nav className="z-10 flex items-center justify-between border-b border-gray-200 bg-white px-6 py-3 shadow-sm">
				<div className="flex items-center gap-2">
					<div className="h-6 w-6 rounded-sm bg-blue-600" />
					<span className="text-lg font-bold tracking-tight">Stressnet Dashboard</span>
				</div>

				<div className="flex space-x-1 rounded-lg bg-gray-100 p-1">
					<NavButton
						active={currentView === "TRIAGE"}
						onClick={() => setCurrentView("TRIAGE")}
						label="Run Triage"
					/>
					<NavButton
						active={currentView === "TRENDS"}
						onClick={() => setCurrentView("TRENDS")}
						label="Long-term Trends"
					/>
				</div>
			</nav>

			<main className="relative flex-1 overflow-hidden">
				{currentView === "TRIAGE" ? <Timeline /> : <TrendView />}
			</main>
		</div>
	);
};

const NavButton = ({
	active,
	onClick,
	label,
}: { active: boolean; onClick: () => void; label: string }) => (
	<button
		onClick={onClick}
		className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
			active
				? "bg-white text-blue-700 shadow-sm"
				: "text-gray-600 hover:bg-gray-200 hover:text-gray-900"
		}`}
		type="button"
	>
		{label}
	</button>
);

export default App;
