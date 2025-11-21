import type { BuildSummary, ProcessedRun, RunStatus } from "@stressnet/core";
import { useEffect, useState } from "react";

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
		<div className="flex h-screen bg-gray-50">
			{/* Left Panel: Vertical Timeline */}
			<div className="w-1/3 border-r border-gray-200 overflow-y-auto p-4">
				<h2 className="text-xl font-bold mb-4">Build Timeline</h2>
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

			{/* Right Panel: Triage View (Build Details) */}
			<div className="flex-1 p-8 overflow-y-auto">
				{selectedBuild ? (
					<div>
						<header className="mb-8 pb-4 border-b">
							<h1 className="text-2xl font-bold mb-2">Build: {selectedBuild.version}</h1>
							<div className="flex gap-4">
								<StatusBadge status={selectedBuild.overallStatus} />
								<span className="text-sm text-gray-500 self-center">
									Loaded at: {selectedBuild.startTime}
								</span>
							</div>
						</header>

						{/* Zone A: Regressions (The Problem List) */}
						{selectedBuild.regressions.length > 0 && (
							<section className="mb-8">
								<h2 className="text-red-600 font-bold text-lg mb-4 flex items-center">
									<span className="mr-2">⚠️</span>
									Regressions Detected ({selectedBuild.regressions.length})
								</h2>
								<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
									{selectedBuild.regressions.map((run) => (
										<WorkloadCard key={run.reportId} run={run} isRegression={true} />
									))}
								</div>
							</section>
						)}

						{/* Zone B: Healthy (Collapsible-ish) */}
						<section>
							<h2 className="text-green-700 font-bold text-lg mb-4">
								Healthy Workloads ({selectedBuild.stable.length})
							</h2>
							<div className="grid grid-cols-1 lg:grid-cols-3 gap-4 opacity-80">
								{selectedBuild.stable.map((run) => (
									<WorkloadCard key={run.reportId} run={run} isRegression={false} />
								))}
							</div>
						</section>
					</div>
				) : (
					<div className="flex items-center justify-center h-full text-gray-400">
						Select a build to view details
					</div>
				)}
			</div>
		</div>
	);
};

// Sub-component for individual cards
const WorkloadCard = ({
	run,
	isRegression,
}: {
	run: ProcessedRun;
	isRegression: boolean;
}) => (
	<div
		className={`p-4 rounded border ${
			isRegression ? "bg-red-50 border-red-200" : "bg-white border-gray-200"
		}`}
	>
		<h4 className="font-bold text-sm truncate" title={run.workloadName}>
			{run.workloadName}
		</h4>

		<div className="mt-3 grid grid-cols-2 gap-2 text-sm">
			<div>
				<span className="text-gray-500 text-xs block">Throughput</span>
				<span className={run.deviation.tps < -10 ? "text-red-600 font-bold" : ""}>
					{run.metrics.committedTps.toFixed(0)} TPS
				</span>
				{isRegression && (
					<span className="text-xs text-red-500 block">
						{run.deviation.tps.toFixed(1)}% vs Baseline
					</span>
				)}
			</div>

			<div>
				<span className="text-gray-500 text-xs block">Drop Rate</span>
				<span className={run.deviation.dropRate > 10 ? "text-red-600 font-bold" : ""}>
					{(run.metrics.dropRate * 100).toFixed(1)}%
				</span>
			</div>
		</div>
	</div>
);
