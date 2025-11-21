import type { BuildSummary, RunStatus } from "@stressnet/core";
import { useEffect, useState } from "react";

import { BuildDetail } from "./BuildDetail";

const API_URL = import.meta.env.VITE_API_URL || "/api";

// Helper: Status Badge
const StatusBadge = ({ status }: { status: RunStatus }) => {
	const colors =
		{
			GREEN: "bg-green-100 text-green-800",
			YELLOW: "bg-yellow-100 text-yellow-800",
			RED: "bg-red-100 text-red-800",
			OPS_FAILURE: "bg-gray-200 text-gray-600",
		}[status] || "bg-gray-100";

	return <span className={`px-2 py-1 rounded text-xs font-bold ${colors}`}>{status}</span>;
};

export const Timeline = () => {
	const [builds, setBuilds] = useState<BuildSummary[]>([]);
	const [selectedBuild, setSelectedBuild] = useState<BuildSummary | null>(null);

	useEffect(() => {
		const load = async () => {
			try {
				const response = await fetch(`${API_URL}/timeline`);
				if (!response.ok) {
					throw new Error(`Failed to fetch timeline (${response.status})`);
				}
				const data: BuildSummary[] = await response.json();
				setBuilds(data);
				setSelectedBuild((current) => current ?? data[0] ?? null);
			} catch (err) {
				console.error("Error loading timeline", err);
			}
		};

		load();
	}, []);

	return (
		<div className="flex h-full bg-gray-50">
			<div className="w-1/3 overflow-y-auto border-r border-gray-200 p-4">
				<h2 className="mb-4 text-xl font-bold">Build Timeline</h2>
				<div className="space-y-4">
					{builds.map((build) => (
						<button
							key={build.version}
							type="button"
							onClick={() => setSelectedBuild(build)}
							className={`w-full text-left p-4 bg-white rounded shadow cursor-pointer border-l-4 hover:bg-gray-50 transition
                ${build.overallStatus === "RED" ? "border-red-500" : "border-green-500"}
                ${selectedBuild?.version === build.version ? "ring-2 ring-blue-500" : ""}
              `}
						>
							<div className="flex justify-between items-start">
								<div>
									<h3 className="font-mono text-sm font-bold">{build.version}</h3>
									<p className="text-xs text-gray-500">
										{new Date(build.startTime).toLocaleString()}
									</p>
								</div>
								<StatusBadge status={build.overallStatus} />
							</div>

							<div className="mt-2 text-xs text-gray-600 flex justify-between">
								<span>Ops Issues: {(build.opsFailureRate * 100).toFixed(0)}%</span>
								<span>Runs: {build.totalRuns}</span>
							</div>
						</button>
					))}
				</div>
			</div>

			<div className="flex-1 overflow-y-auto p-8">
				<BuildDetail build={selectedBuild} />
			</div>
		</div>
	);
};
