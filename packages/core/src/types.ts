export interface RpcStat {
	success: number;
	failure: number;
	url: string;
	txs_sent: number;
}

export interface TxGenReport {
	start_time: string;
	end_time: string;
	client_version: string | null;
	config: {
		chain_id: number;
		workload_groups: {
			name: string;
			traffic_gens: { tps: number; gen_mode: Record<string, unknown> }[];
		}[];
	};
	rpc_stats?: RpcStat[];
	txs_sent: number;
	txs_committed: number;
	txs_dropped: number;
	target_tps: number;
}

export type RunStatus = "GREEN" | "YELLOW" | "RED" | "OPS_FAILURE";

export interface BaselineMetrics {
	mean: number;
	mad: number;
}

export interface WorkloadBaseline {
	lastUpdatedBuild: string;
	committedTps: BaselineMetrics;
	dropRate: BaselineMetrics;
}

export interface ProcessedRun {
	reportId: string;
	workloadHash: string;
	workloadName: string;
	buildVersion: string;
	timestamp: number;
	metrics: { committedTps: number; dropRate: number };
	status: RunStatus;
	deviation: { tps: number; dropRate: number };
	isOpsIssue: boolean;
}

export interface BuildSummary {
	version: string;
	startTime: string;
	durationSec: number;
	overallStatus: RunStatus;
	opsFailureRate: number;
	totalRuns: number;
	regressions: ProcessedRun[];
	stable: ProcessedRun[];
}
