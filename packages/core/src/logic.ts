import type {
	BaselineMetrics,
	ProcessedRun,
	RunStatus,
	TxGenReport,
	WorkloadBaseline,
} from "./types";

type WorkloadGroup = TxGenReport["config"]["workload_groups"][number];

const ALPHA = 0.2;
const SIGMA_MULTIPLIER = 2.0;

// STABLE HASHING: Extract only what physically defines the workload
export function computeWorkloadHash(group: WorkloadGroup): string {
	// We combine Name + TPS + GenMode.
	// We assume the first generator defines the physics of the workload.
	const primaryGen = group.traffic_gens[0] || {};
	const modeKey = Object.keys(primaryGen.gen_mode || {})[0] || "unknown";

	return `${group.name}::${primaryGen.tps}::${modeKey}`;
}

export function isOpsFailure(report: TxGenReport): boolean {
	if (report.txs_committed === 0) return true;

	// Fail if RPC stats exist AND all tried nodes failed 100%
	if (report.rpc_stats && report.rpc_stats.length > 0) {
		const activeNodes = report.rpc_stats.filter((r) => r.success + r.failure > 0);
		if (activeNodes.length > 0 && activeNodes.every((r) => r.success === 0)) {
			return true;
		}
	}
	return false;
}

export function analyzeRun(
	report: TxGenReport,
	filename: string,
	baseline: WorkloadBaseline | undefined,
): ProcessedRun {
	const isOps = isOpsFailure(report);
	const duration =
		(new Date(report.end_time).getTime() - new Date(report.start_time).getTime()) / 1000;
	const tps = duration > 0 ? report.txs_committed / duration : 0;
	const dropRate =
		report.txs_sent > 0 ? (report.txs_sent - report.txs_committed) / report.txs_sent : 0;

	const group = report.config.workload_groups[0];
	const hash = computeWorkloadHash(group);

	// Default to GREEN unless proven otherwise
	let status: RunStatus = "GREEN";
	const deviation = { tps: 0, dropRate: 0 };

	if (isOps) {
		status = "OPS_FAILURE";
	} else if (baseline) {
		// Calculate Z-Score-ish deviations
		deviation.tps =
			baseline.committedTps.mean > 0
				? ((tps - baseline.committedTps.mean) / baseline.committedTps.mean) * 100
				: 0;
		deviation.dropRate = (dropRate - baseline.dropRate.mean) * 100; // Absolute % diff

		const dropLimit = baseline.dropRate.mean + baseline.dropRate.mad * SIGMA_MULTIPLIER;
		const tpsLimit = baseline.committedTps.mean - baseline.committedTps.mad * SIGMA_MULTIPLIER;

		// Logic: If Drop Rate spikes OR TPS crashes -> RED
		if (dropRate > dropLimit || tps < tpsLimit) {
			status = "RED";
		} else if (dropRate > baseline.dropRate.mean + baseline.dropRate.mad) {
			status = "YELLOW";
		}
	}

	return {
		reportId: filename,
		workloadHash: hash,
		workloadName: group.name,
		buildVersion: report.client_version || "unknown",
		timestamp: new Date(report.start_time).getTime(),
		metrics: { committedTps: tps, dropRate },
		status,
		deviation,
		isOpsIssue: isOps,
	};
}

export function updateBaseline(
	current: WorkloadBaseline | undefined,
	run: ProcessedRun,
): WorkloadBaseline {
	// Initialize
	if (!current) {
		return {
			lastUpdatedBuild: run.buildVersion,
			committedTps: { mean: run.metrics.committedTps, mad: 0 },
			dropRate: { mean: run.metrics.dropRate, mad: 0 },
		};
	}

	// Only learn from "Healthy-ish" runs
	if (run.status === "OPS_FAILURE" || run.status === "RED") return current;

	const calcEma = (old: BaselineMetrics, val: number) => ({
		mean: ALPHA * val + (1 - ALPHA) * old.mean,
		mad: ALPHA * Math.abs(val - (ALPHA * val + (1 - ALPHA) * old.mean)) + (1 - ALPHA) * old.mad,
	});

	return {
		lastUpdatedBuild: run.buildVersion,
		committedTps: calcEma(current.committedTps, run.metrics.committedTps),
		dropRate: calcEma(current.dropRate, run.metrics.dropRate),
	};
}
