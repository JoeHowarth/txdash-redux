import type { BuildSummary, ProcessedRun } from "@stressnet/core";
import { useEffect, useMemo, useState } from "react";
import type { DotProps } from "recharts";
import {
	CartesianGrid,
	Line,
	LineChart,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";

const API_URL = import.meta.env.VITE_API_URL || "/api";

export const TrendView = () => {
	const [workloads, setWorkloads] = useState<string[]>([]);
	const [selectedHash, setSelectedHash] = useState<string>("");
	const [history, setHistory] = useState<ProcessedRun[]>([]);

	useEffect(() => {
		const load = async () => {
			try {
				const response = await fetch(`${API_URL}/timeline`);
				if (!response.ok) return;
				const builds: BuildSummary[] = await response.json();

				const unique = new Set<string>();
				if (builds[0]) {
					for (const run of [...builds[0].regressions, ...builds[0].stable]) {
						unique.add(`${run.workloadName}|${run.workloadHash}`);
					}
				}

				const list = Array.from(unique);
				setWorkloads(list);
				if (list.length > 0) setSelectedHash(list[0]);
			} catch (err) {
				console.error("Failed to load workloads", err);
			}
		};

		load();
	}, []);

	useEffect(() => {
		if (!selectedHash) return;
		const [, hash] = selectedHash.split("|");

		const loadHistory = async () => {
			try {
				const response = await fetch(`${API_URL}/workload/${encodeURIComponent(hash)}/history`);
				if (!response.ok) return;
				const data: ProcessedRun[] = await response.json();
				setHistory(data);
			} catch (err) {
				console.error("Failed to load history", err);
			}
		};

		loadHistory();
	}, [selectedHash]);

	const chartData = useMemo(
		() =>
			history
				.map((run) => ({
					version: run.buildVersion,
					tps: run.metrics.committedTps,
					dropRate: run.metrics.dropRate * 100,
					status: run.status,
					timestamp: run.timestamp,
				}))
				.sort((a, b) => a.timestamp - b.timestamp),
		[history],
	);

	const selectedName = selectedHash ? selectedHash.split("|")[0] : "—";

	type CustomDotProps = DotProps & { payload?: { status?: string } };

	const CustomDot = ({ cx, cy, payload }: CustomDotProps) => {
		if (typeof cx !== "number" || typeof cy !== "number" || !payload) return null;
		const color = payload.status === "RED" ? "#ef4444" : "#22c55e";
		return <circle cx={cx} cy={cy} r={4} stroke={color} strokeWidth={2} fill="white" />;
	};

	return (
		<div className="flex h-full flex-col p-8">
			<header className="mb-8 flex items-end justify-between">
				<div>
					<h1 className="text-2xl font-bold text-gray-900">Workload Performance History</h1>
					<p className="mt-1 text-gray-500">Statistical Process Control (SPC) for {selectedName}</p>
				</div>

				<div className="w-64">
					<label
						htmlFor="workload-select"
						className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500"
					>
						Select Workload
					</label>
					<select
						id="workload-select"
						className="w-full rounded-md border border-gray-300 bg-white p-2 text-sm shadow-sm"
						value={selectedHash}
						onChange={(event) => setSelectedHash(event.target.value)}
					>
						{workloads.map((workload) => (
							<option key={workload} value={workload}>
								{workload.split("|")[0]}
							</option>
						))}
					</select>
				</div>
			</header>

			<div className="flex-1 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
				{history.length === 0 ? (
					<div className="flex h-full items-center justify-center text-gray-400">
						Loading history...
					</div>
				) : (
					<ResponsiveContainer width="100%" height="100%">
						<LineChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
							<CartesianGrid strokeDasharray="3 3" vertical={false} />
							<XAxis
								dataKey="version"
								height={60}
								angle={-45}
								textAnchor="end"
								tick={{ fontSize: 12 }}
							/>
							<YAxis label={{ value: "Committed TPS", angle: -90, position: "insideLeft" }} />
							<Tooltip
								contentStyle={{
									borderRadius: "8px",
									border: "none",
									boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
								}}
								labelStyle={{ fontWeight: "bold", color: "#374151" }}
							/>
							<Line
								type="monotone"
								dataKey="tps"
								stroke="#3b82f6"
								strokeWidth={2}
								dot={<CustomDot />}
								activeDot={{ r: 6 }}
							/>
						</LineChart>
					</ResponsiveContainer>
				)}
			</div>
		</div>
	);
};
