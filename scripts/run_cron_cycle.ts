/**
 * Production-grade Single-Cycle Runner for GitHub Actions / CI/CD Cron
 * Executes one complete monitoring cycle, persists proofs, respects rate limits,
 * and writes rich diagnostic reports to GitHub Step Summary if available.
 */

import fs from "fs";
import path from "path";

// Native environment variable loader with CRLF handling
function loadEnvFile(filePath: string) {
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, "utf-8");
    const lines = content.split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const idx = trimmed.indexOf("=");
      if (idx !== -1) {
        const key = trimmed.slice(0, idx).trim();
        let val = trimmed.slice(idx + 1).trim();
        if (
          (val.startsWith('"') && val.endsWith('"')) ||
          (val.startsWith("'") && val.endsWith("'"))
        ) {
          val = val.slice(1, -1);
        }
        val = val.replace(/\r$/, "").trim();
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  }
}

loadEnvFile(path.resolve(process.cwd(), ".env.local"));
loadEnvFile(path.resolve(process.cwd(), ".env"));

import {
  runMentionMonitoringCycle,
  CycleSummary,
} from "../src/lib/mention-monitor";
import { getWatcherCredentials } from "../src/lib/x-watcher";
import { getAgentCredentials } from "../src/lib/x-agent";
import { isSupabaseConfigured } from "../src/lib/supabase/server";
import { isGroqConfigured } from "../src/lib/groq";

async function main() {
  const startTime = Date.now();
  console.log(
    "==================================================================",
  );
  console.log(
    "  agentK: Scheduled Mention Watcher & Auto-Reply Dispatcher     ",
  );
  console.log(
    "==================================================================",
  );
  console.log(`[Time]   ${new Date().toISOString()}`);

  const watcherCreds = getWatcherCredentials();
  const agentCreds = getAgentCredentials();
  const targetHandle = process.env.TARGET_MENTION_HANDLE || "haxexbc";

  console.log(
    `[Config] Supabase:         ${isSupabaseConfigured() ? "CONNECTED" : "NOT CONFIGURED"}`,
  );
  console.log(
    `[Config] Watcher Account:  ${watcherCreds.authToken ? "CONFIGURED" : "MISSING"}`,
  );
  console.log(
    `[Config] Agent Account:    ${agentCreds.authToken ? "CONFIGURED" : "MISSING"}`,
  );
  console.log(
    `[Config] Groq LLM:         ${isGroqConfigured() ? "ACTIVE (qwen/qwen3.8-27b)" : "MISSING"}`,
  );
  console.log(`[Target] Monitoring:       @${targetHandle}`);
  console.log(
    "------------------------------------------------------------------\n",
  );

  if (!isSupabaseConfigured()) {
    console.error(
      "[Fatal] Supabase credentials (NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY) are missing!",
    );
    process.exit(1);
  }

  if (!watcherCreds.authToken || !watcherCreds.ct0) {
    console.error(
      "[Fatal] Watcher Twitter credentials (WATCHER_TWITTER_AUTH_TOKEN and WATCHER_TWITTER_CT0) are missing!",
    );
    process.exit(1);
  }

  let summary: CycleSummary;
  try {
    console.log(`[Execution] Starting 300s cycle for @${targetHandle}...`);
    summary = await runMentionMonitoringCycle(targetHandle);
  } catch (cycleErr: any) {
    console.error(
      "[Fatal] Uncaught exception during cycle execution:",
      cycleErr.message || cycleErr,
    );
    process.exit(1);
  }

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log(
    "\n==================================================================",
  );
  console.log(
    "  Cycle Execution Summary                                         ",
  );
  console.log(
    "==================================================================",
  );
  console.log(`- Registered Users Checked: ${summary.registeredUsersChecked}`);
  console.log(`- Total Mentions Discovered: ${summary.totalMatchesFound}`);
  console.log(`- New Contributions Stored:  ${summary.newMatchesRecorded}`);
  console.log(`- Confirmed by Groq LLM:     ${summary.confirmedByLlm}`);
  console.log(`- Rejected by Groq LLM:      ${summary.rejectedByLlm}`);
  console.log(`- Replies Sent (Recorded):   ${summary.repliesRecordedSent}`);
  console.log(`- Replies Sent (Rejected):   ${summary.repliesRejectedSent}`);
  console.log(`- Queued for Next Cycle:     ${summary.queuedForNextCycle}`);
  console.log(`- Cycle Duration:            ${durationSec}s`);

  if (summary.errors && summary.errors.length > 0) {
    console.warn("\n[Warnings & Circuit Breakers]:");
    for (const err of summary.errors) {
      console.warn(`  ! ${err}`);
    }
  }

  // Write GitHub Actions Step Summary if running in GitHub Actions
  const stepSummaryFile = process.env.GITHUB_STEP_SUMMARY;
  if (stepSummaryFile && fs.existsSync(path.dirname(stepSummaryFile))) {
    const hasRateLimit = summary.errors.some(
      (e) => e.includes("226") || e.includes("rate limit"),
    );
    const statusBadge = hasRateLimit
      ? "⚠️ Rate Limited (Queued)"
      : "✅ Success";

    const markdownSummary = `## 🤖 agentK Mention Watcher Report

**Status**: ${statusBadge} | **Duration**: ${durationSec}s | **Target**: \`@${targetHandle}\`

| Metric | Count |
| :--- | :--- |
| **Registered Users Checked** | \`${summary.registeredUsersChecked}\` |
| **Total Mentions Found** | \`${summary.totalMatchesFound}\` |
| **New Matches Recorded** | \`${summary.newMatchesRecorded}\` |
| **LLM Confirmed** | \`${summary.confirmedByLlm}\` |
| **LLM Rejected** | \`${summary.rejectedByLlm}\` |
| **Recorded Replies Sent** | \`${summary.repliesRecordedSent}\` |
| **Rejected Replies Sent** | \`${summary.repliesRejectedSent}\` |
| **Queued Backlog** | \`${summary.queuedForNextCycle}\` |

${
  summary.errors.length > 0
    ? `### ⚠️ Notice / Warnings\n${summary.errors.map((e) => `- ${e}`).join("\n")}`
    : ""
}
`;
    try {
      fs.appendFileSync(stepSummaryFile, markdownSummary, "utf-8");
    } catch (e) {
      console.warn("[Summary] Could not write GitHub Step Summary:", e);
    }
  }

  console.log("\n[agentK] Cycle completed cleanly.");
  process.exit(0);
}

main().catch((err) => {
  console.error("[Fatal Error]:", err);
  process.exit(1);
});
