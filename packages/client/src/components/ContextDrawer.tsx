import type { ProcessedRun } from "@stressnet/core";
import { useEffect, useMemo, useState } from "react";

const API_URL = import.meta.env.VITE_API_URL || "/api";

interface ContextDrawerProps {
	run: ProcessedRun;
	onClose: () => void;
}

export const ContextDrawer = ({ run, onClose }: ContextDrawerProps) => {
	const [history, setHistory] = useState<ProcessedRun[]>([]);

	useEffect(() => {
		const loadHistory = async () => {
			try {
				const response = await fetch(`${API_URL}/workload/${run.workloadHash}/history`);
				if (!response.ok) return;
				const data: ProcessedRun[] = await response.json();
				setHistory(data);
			} catch (err) {
				console.error("Failed to load workload history", err);
			}
		};

		loadHistory();
	}, [run.workloadHash]);

	const recentRuns = useMemo(
		() =>
			history
				.slice()
				.sort((a, b) => b.timestamp - a.timestamp)
				.slice(0, 6),
		[history],
	);

	return (
		<div className="fixed inset-0 z-50 flex items-stretch">
			<button
				type="button"
				aria-label="Close context drawer"
				onClick={onClose}
				className="h-full w-full bg-black/20 backdrop-blur-sm"
			/>

			<aside className="relative h-full w-full max-w-lg overflow-y-auto bg-white shadow-2xl">
				<header className="flex items-start justify-between border-b px-6 py-4">
					<div>
						<p className="text-xs uppercase tracking-widest text-gray-500">Investigating</p>
						<h3 className="text-lg font-bold text-gray-900">{run.workloadName}</h3>
						<p className="text-sm text-gray-500">Build {run.buildVersion}</p>
					</div>
					<button
						type="button"
						onClick={onClose}
						className="rounded-full bg-gray-100 px-3 py-1 text-sm font-semibold text-gray-600 transition hover:bg-gray-200"
					>
						Close
					</button>
				</header>

				<section className="space-y-6 px-6 py-5">
					<div className="grid grid-cols-2 gap-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
						<div>
							<div className="text-xs font-semibold uppercase tracking-widest text-gray-500">
								Committed TPS
							</div>
							<div className="text-2xl font-mono font-bold text-gray-900">
								{run.metrics.committedTps.toFixed(0)}
							</div>
						</div>
						<div>
							<div className="text-xs font-semibold uppercase tracking-widest text-gray-500">
								Drop Rate
							</div>
							<div className="text-2xl font-mono font-bold text-gray-900">
								{(run.metrics.dropRate * 100).toFixed(1)}%
							</div>
						</div>
						<div>
							<div className="text-xs font-semibold uppercase tracking-widest text-gray-500">
								Status
							</div>
							<div className="text-sm font-semibold text-gray-900">{run.status}</div>
						</div>
						<div>
							<div className="text-xs font-semibold uppercase tracking-widest text-gray-500">
								Run ID
							</div>
							<div className="font-mono text-sm text-gray-800">{run.reportId}</div>
						</div>
					</div>

					<div className="space-y-2">
						<h4 className="text-sm font-semibold text-gray-700">Recent history</h4>
						{recentRuns.length === 0 ? (
							<p className="text-sm text-gray-500">No history available.</p>
						) : (
							<ul className="space-y-2">
								{recentRuns.map((item) => (
									<li
										key={item.reportId}
										className="flex items-center justify-between rounded-md border border-gray-200 px-3 py-2 text-sm"
									>
										<div className="flex flex-col">
											<span className="font-mono text-xs text-gray-500">
												{new Date(item.timestamp).toLocaleString()}
											</span>
											<span className="font-medium text-gray-900">{item.buildVersion}</span>
										</div>
										<div className="text-right">
											<div className="font-mono text-sm text-gray-800">
												{item.metrics.committedTps.toFixed(0)} TPS
											</div>
											<div className="text-xs text-gray-500">
												Drop {(item.metrics.dropRate * 100).toFixed(1)}% • {item.status}
											</div>
										</div>
									</li>
								))}
							</ul>
						)}
					</div>
				</section>
			</aside>
		</div>
	);
};
