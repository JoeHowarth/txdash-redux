import { watch } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { analyzeRun, updateBaseline } from "@stressnet/core";
import type {
	BuildSummary,
	ProcessedRun,
	RunStatus,
	TxGenReport,
	WorkloadBaseline,
} from "@stressnet/core";
import cors from "cors";
import express from "express";

const REPORT_DIR = process.env.REPORT_DIR || "./reports";
const APP_PORT = 3000;

// --- State ---
// Wrapped in an object to be explicit about global state
const State = {
	runs: [] as ProcessedRun[],
	baselines: new Map<string, WorkloadBaseline>(),
	lastUpdated: new Date(),
};

// --- Core Logic Wrapper ---
async function rebuildState() {
	console.time("Rebuild");
	try {
		const files = (await fs.readdir(REPORT_DIR)).filter((f) => f.endsWith(".json")).sort();

		const tempRuns: ProcessedRun[] = [];
		const tempBaselines = new Map<string, WorkloadBaseline>();

		for (const file of files) {
			try {
				const raw = await fs.readFile(path.join(REPORT_DIR, file), "utf-8");
				const report: TxGenReport = JSON.parse(raw);

				// Compute
				const group = report.config.workload_groups[0];
				if (!group) continue;

				// Calculate hash manually to match logic.ts
				const primaryGen = group.traffic_gens[0] || {};
				const modeKey = Object.keys(primaryGen.gen_mode || {})[0] || "unknown";
				const hash = `${group.name}::${primaryGen.tps}::${modeKey}`;

				const baseline = tempBaselines.get(hash);
				const processed = analyzeRun(report, file, baseline);

				tempRuns.push(processed);
				tempBaselines.set(hash, updateBaseline(baseline, processed));
			} catch (e) {
				console.warn(`Skipping corrupt file ${file}`);
			}
		}

		State.runs = tempRuns;
		State.baselines = tempBaselines;
		State.lastUpdated = new Date();
		console.log(`State Updated: ${State.runs.length} runs processed.`);
	} catch (e) {
		console.error("Fatal error reading report dir", e);
	}
	console.timeEnd("Rebuild");
}

// --- File Watcher (Debounced) ---
let debounceTimer: NodeJS.Timeout;
watch(REPORT_DIR, (eventType, filename) => {
	if (filename?.endsWith(".json")) {
		clearTimeout(debounceTimer);
		// Wait 500ms for file writes to settle/finish
		debounceTimer = setTimeout(rebuildState, 500);
	}
});

// --- Express ---
const app = express();
app.use(cors());

app.get("/api/timeline", (_, res) => {
	// Aggregate on read - keeps memory usage lower than storing dual states
	const groups = new Map<string, ProcessedRun[]>();
	for (const run of State.runs) {
		const existing = groups.get(run.buildVersion);
		if (existing) {
			existing.push(run);
		} else {
			groups.set(run.buildVersion, [run]);
		}
	}

	const summary: BuildSummary[] = Array.from(groups.entries())
		.map(([v, runs]) => {
			const ops = runs.filter((r) => r.status === "OPS_FAILURE").length;
			const reds = runs.filter((r) => r.status === "RED").length;

			let status: RunStatus = "GREEN";
			if (ops / runs.length > 0.9) status = "OPS_FAILURE";
			else if (reds > 0) status = "RED";

			return {
				version: v,
				startTime: new Date(Math.min(...runs.map((r) => r.timestamp))).toISOString(),
				durationSec: 0,
				overallStatus: status,
				opsFailureRate: ops / runs.length,
				totalRuns: runs.length,
				regressions: runs.filter((r) => r.status === "RED"),
				stable: runs.filter((r) => r.status !== "RED" && r.status !== "OPS_FAILURE"),
			};
		})
		.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());

	res.json(summary);
});

app.get("/api/workload/:hash/history", (req, res) => {
	const history = State.runs.filter((r) => r.workloadHash === req.params.hash);
	res.json(history);
});

// Start
rebuildState();
app.listen(APP_PORT, () => console.log(`Dashboard API on port ${APP_PORT}`));
