import type { BuildSummary, ProcessedRun } from "@stressnet/core";
import { useState } from "react";

import { ContextDrawer } from "./ContextDrawer";

interface BuildDetailProps {
	build: BuildSummary | null;
}

export const BuildDetail = ({ build }: BuildDetailProps) => {
	const [inspectingRun, setInspectingRun] = useState<ProcessedRun | null>(null);

	if (!build) {
		return (
			<div className="h-full flex flex-col items-center justify-center bg-gray-50 text-gray-400">
				<div className="mb-4 text-6xl">🔍</div>
				<p>Select a build from the timeline to view details</p>
			</div>
		);
	}

	return (
		<div className="relative h-full overflow-y-auto bg-white p-8">
			<header className="mb-10 border-b pb-6">
				<h1 className="mb-2 text-3xl font-bold">Build {build.version}</h1>
				<div className="flex items-center gap-6 text-sm text-gray-600">
					<span>
						loaded:{" "}
						<span className="font-mono font-medium">
							{new Date(build.startTime).toLocaleString()}
						</span>
					</span>
					<span>
						duration:{" "}
						<span className="font-mono font-medium">{(build.durationSec / 3600).toFixed(1)}h</span>
					</span>
					<span className="flex items-center gap-1">
						<span
							className={`h-2 w-2 rounded-full ${
								build.opsFailureRate > 0.1 ? "bg-red-500" : "bg-green-500"
							}`}
						/>
						{(build.opsFailureRate * 100).toFixed(1)}% Ops Failures
					</span>
				</div>
			</header>

			{build.regressions.length > 0 && (
				<section className="mb-12">
					<h2 className="mb-4 flex items-center gap-2 text-xl font-bold text-red-700">
						<span>⚠️</span> Detected Regressions ({build.regressions.length})
					</h2>
					<div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
						{build.regressions.map((run) => (
							<WorkloadCard
								key={run.reportId}
								run={run}
								isRegression
								onInvestigate={() => setInspectingRun(run)}
							/>
						))}
					</div>
				</section>
			)}

			<section>
				<h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-gray-700">
					<span>✅</span> Healthy Workloads ({build.stable.length})
				</h2>
				<div className="grid grid-cols-1 gap-4 opacity-75 transition-opacity hover:opacity-100 md:grid-cols-2 xl:grid-cols-3">
					{build.stable.map((run) => (
						<WorkloadCard key={run.reportId} run={run} isRegression={false} />
					))}
				</div>
			</section>

			{inspectingRun && (
				<ContextDrawer run={inspectingRun} onClose={() => setInspectingRun(null)} />
			)}
		</div>
	);
};

const WorkloadCard = ({
	run,
	isRegression,
	onInvestigate,
}: {
	run: ProcessedRun;
	isRegression: boolean;
	onInvestigate?: () => void;
}) => (
	<div
		className={`rounded-lg border p-5 shadow-sm transition-shadow ${
			isRegression
				? "border-red-200 bg-red-50 shadow-red-100"
				: "border-gray-200 bg-white hover:shadow-md"
		}`}
	>
		<div className="mb-3 flex items-start justify-between">
			<h4 className="pr-4 text-sm font-bold text-gray-800" title={run.workloadName}>
				{run.workloadName}
			</h4>
			{isRegression && (
				<button
					onClick={onInvestigate}
					type="button"
					className="rounded bg-white px-2 py-1 text-xs font-medium text-red-600 outline-none ring-red-200 transition hover:bg-red-50 focus:ring"
				>
					Investigate
				</button>
			)}
		</div>

		<div className="grid grid-cols-2 gap-4 text-sm">
			<div>
				<div className="mb-0.5 text-xs uppercase tracking-wider text-gray-500">TPS</div>
				<div className="font-mono text-lg">
					{run.metrics.committedTps.toFixed(0)}
					{isRegression && run.deviation.tps < -5 && (
						<span className="ml-2 text-xs font-bold text-red-600">
							▼ {Math.abs(run.deviation.tps).toFixed(0)}%
						</span>
					)}
				</div>
			</div>
			<div>
				<div className="mb-0.5 text-xs uppercase tracking-wider text-gray-500">Drop Rate</div>
				<div className="font-mono text-lg">
					{(run.metrics.dropRate * 100).toFixed(1)}%
					{isRegression && run.deviation.dropRate > 5 && (
						<span className="ml-2 text-xs font-bold text-red-600">
							▲ {run.deviation.dropRate.toFixed(0)}%
						</span>
					)}
				</div>
			</div>
		</div>
	</div>
);
