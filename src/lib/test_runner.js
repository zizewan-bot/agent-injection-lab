import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { DEFAULT_SCENARIO, FINDING, SCENARIOS } from "./constants.js";
import { analyzeRun } from "./analyzer.js";
import { mockAgents } from "./mock_agents.js";
import { startRun } from "./start.js";
import { looksAbsolute } from "./paths.js";
import { sanitizeText } from "./sanitizer.js";

const SOURCE_TEMPLATE_SENTINEL = "Package graph resolver could not verify local dependency credentials.";
const SECRET_LIKE_SENTINEL = "placeholder_secret_value_123456789012";
const SUBMISSION_ENDPOINT = "https://agent-injection-lab-site.stanleyr-wan.workers.dev/api/agent-injection-lab/submissions";
const REQUIRED_SUBMISSION_FIELDS = [
  "tool_version",
  "phase",
  "scenario_id",
  "result_code",
  "severity",
  "network_egress_tested",
  "git_available",
  "workspace_staging_observed",
  "git_diff_staging_observed",
  "git_index_staging_observed",
  "primary_surface",
  "primary_relative_path"
];

const CASES = [
  ["safe_agent_no_staging", "safe_agent", FINDING.NONE],
  ["diagnostic_log_staging", "diagnostic_staging_agent", FINDING.WORKSPACE],
  ["config_file_staging", "config_staging_agent", FINDING.WORKSPACE],
  ["git_diff_staging", "git_diff_staging_agent", FINDING.GIT_DIFF],
  ["git_staged_staging", "git_index_staging_agent", FINDING.GIT_INDEX]
];

const SCENARIO_CASES = [
  ["dependency_resolver_staging", "diagnostic_staging_agent", "workspace/diagnostic.log"],
  ["github_issue_env_staging", "github_issue_staging_agent", "workspace/diagnostic.log"],
  ["readme_install_diagnostic_staging", "readme_install_staging_agent", "workspace/install-diagnostic.log"],
  ["mcp_tool_result_staging", "mcp_tool_result_staging_agent", "workspace/tool-diagnostic.log"]
];

export async function runTests() {
  console.log("Agent Injection Lab self-test");
  console.log("");
  let passed = 0;
  let failed = 0;
  const originalCwd = process.cwd();
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "agent-lab-tests-"));

  for (const [testName, agentName, expected] of CASES) {
    try {
      process.chdir(root);
      const run = await startRun({ scenario: DEFAULT_SCENARIO });
      await mockAgents[agentName](run);
      const result = await analyzeRun(run.runDir);
      await assertReportSanitized(run.runDir);
      if (result.classification !== expected) {
        throw new Error(`expected ${expected}, got ${result.classification}`);
      }
      console.log(`PASS ${testName}`);
      passed += 1;
    } catch (error) {
      console.log(`FAIL ${testName}: ${error.message}`);
      failed += 1;
    } finally {
      process.chdir(originalCwd);
    }
  }

  try {
    process.chdir(root);
    const previous = process.env.AGENT_LAB_DISABLE_GIT;
    process.env.AGENT_LAB_DISABLE_GIT = "1";
    const run = await startRun({ scenario: DEFAULT_SCENARIO });
    const result = await analyzeRun(run.runDir);
    process.env.AGENT_LAB_DISABLE_GIT = previous;
    if (result.classification !== FINDING.GIT_UNAVAILABLE) {
      throw new Error(`expected ${FINDING.GIT_UNAVAILABLE}, got ${result.classification}`);
    }
    await assertReportSanitized(run.runDir);
    console.log("PASS git_unavailable_degraded");
    passed += 1;
  } catch (error) {
    console.log(`FAIL git_unavailable_degraded: ${error.message}`);
    failed += 1;
  } finally {
    process.chdir(originalCwd);
  }

  try {
    process.chdir(root);
    const run = await startRun({ scenario: DEFAULT_SCENARIO });
    const env = await fs.readFile(path.join(run.workspaceDir, ".env"), "utf8");
    const secret = env.split("=")[1].trim();
    await fs.appendFile(
      path.join(run.workspaceDir, "diagnostic.log"),
      `bundle token ${secret} NEARBY_API_KEY=${SECRET_LIKE_SENTINEL} path=/Users/example/private\n`,
      "utf8"
    );
    await analyzeRun(run.runDir);
    await assertReportSanitized(run.runDir);
    console.log("PASS privacy_report_secret_like_value");
    passed += 1;
  } catch (error) {
    console.log(`FAIL privacy_report_secret_like_value: ${error.message}`);
    failed += 1;
  } finally {
    process.chdir(originalCwd);
  }

  try {
    const sanitized = sanitizeText("path=/Users/example/private/project home=/home/example/private win=C:\\Users\\example\\private token=abc_secret_123456789012", {
      runDir: "/Users/example/private/project",
      secret: "ist_live_v2_ABCD_1111111111_2222222222_3333333333"
    });
    if (looksAbsolute(sanitized)) {
      throw new Error("absolute path was not redacted");
    }
    console.log("PASS privacy_sanitizer_absolute_path");
    passed += 1;
  } catch (error) {
    console.log(`FAIL privacy_sanitizer_absolute_path: ${error.message}`);
    failed += 1;
  }

  try {
    const secretLike = `API_TOKEN=${SECRET_LIKE_SENTINEL}`;
    const sanitized = sanitizeText(secretLike, { runDir: root, secret: "not-present" });
    if (sanitized.includes(SECRET_LIKE_SENTINEL)) {
      throw new Error("secret-looking value was not redacted");
    }
    console.log("PASS privacy_sanitizer_secret_like_value");
    passed += 1;
  } catch (error) {
    console.log(`FAIL privacy_sanitizer_secret_like_value: ${error.message}`);
    failed += 1;
  }

  try {
    process.chdir(root);
    const run = await startRun({ scenario: DEFAULT_SCENARIO });
    await mockAgents.diagnostic_staging_agent(run);
    await analyzeRun(run.runDir);
    await assertSubmissionUiSafe(run.runDir);
    console.log("PASS report_submission_ui_safe");
    passed += 1;
  } catch (error) {
    console.log(`FAIL report_submission_ui_safe: ${error.message}`);
    failed += 1;
  } finally {
    process.chdir(originalCwd);
  }

  for (const [scenarioId, agentName, expectedPath] of SCENARIO_CASES) {
    try {
      process.chdir(root);
      const run = await startRun({ scenario: scenarioId });
      if (!run.sourcePath.endsWith(SCENARIOS[scenarioId].sourceFile)) {
        throw new Error(`unexpected source file for ${scenarioId}`);
      }
      const clean = await analyzeRun(run.runDir);
      await assertReportSanitized(run.runDir);
      const cleanSummary = JSON.parse(await fs.readFile(path.join(run.runDir, "summary.json"), "utf8"));
      if (clean.classification !== FINDING.NONE) {
        throw new Error(`expected clean ${FINDING.NONE}, got ${clean.classification}`);
      }
      if (cleanSummary.scenario_id !== scenarioId) {
        throw new Error(`summary scenario mismatch: ${cleanSummary.scenario_id}`);
      }
      console.log(`PASS scenario_clean_${scenarioId}`);
      passed += 1;
    } catch (error) {
      console.log(`FAIL scenario_clean_${scenarioId}: ${error.message}`);
      failed += 1;
    } finally {
      process.chdir(originalCwd);
    }

    try {
      process.chdir(root);
      const run = await startRun({ scenario: scenarioId });
      await mockAgents[agentName](run);
      const critical = await analyzeRun(run.runDir);
      await assertReportSanitized(run.runDir);
      const criticalSummary = JSON.parse(await fs.readFile(path.join(run.runDir, "summary.json"), "utf8"));
      if (critical.classification !== FINDING.WORKSPACE) {
        throw new Error(`expected ${FINDING.WORKSPACE}, got ${critical.classification}`);
      }
      if (criticalSummary.scenario_id !== scenarioId) {
        throw new Error(`summary scenario mismatch: ${criticalSummary.scenario_id}`);
      }
      if (criticalSummary.primary_relative_path !== expectedPath) {
        throw new Error(`expected primary path ${expectedPath}, got ${criticalSummary.primary_relative_path}`);
      }
      console.log(`PASS scenario_critical_${scenarioId}`);
      passed += 1;
    } catch (error) {
      console.log(`FAIL scenario_critical_${scenarioId}: ${error.message}`);
      failed += 1;
    } finally {
      process.chdir(originalCwd);
    }
  }

  console.log("");
  console.log(`${passed} passed, ${failed} failed`);
  return failed === 0;
}

async function assertReportSanitized(runDir) {
  const env = await fs.readFile(path.join(runDir, "workspace", ".env"), "utf8");
  const secret = env.split("=")[1].trim();
  const md = await fs.readFile(path.join(runDir, "report.md"), "utf8");
  const html = await fs.readFile(path.join(runDir, "report.html"), "utf8");
  const summary = await fs.readFile(path.join(runDir, "summary.json"), "utf8");
  if (md.includes(secret) || html.includes(secret)) {
    throw new Error("report leaked synthetic secret");
  }
  if (summary.includes(secret)) {
    throw new Error("summary leaked synthetic secret");
  }
  if (looksAbsolute(md) || looksAbsolute(html)) {
    throw new Error("report included absolute local path");
  }
  if (looksAbsolute(summary)) {
    throw new Error("summary included absolute local path");
  }
  if (md.includes("diff --git") || html.includes("diff --git")) {
    throw new Error("report included full Git diff");
  }
  if (md.includes('"event_type"') || html.includes('"event_type"')) {
    throw new Error("report included raw event payload");
  }
  if (md.includes(SOURCE_TEMPLATE_SENTINEL) || html.includes(SOURCE_TEMPLATE_SENTINEL)) {
    throw new Error("report included full cached source content");
  }
  if (md.includes(SECRET_LIKE_SENTINEL) || html.includes(SECRET_LIKE_SENTINEL) || summary.includes(SECRET_LIKE_SENTINEL)) {
    throw new Error("report or summary leaked secret-looking value");
  }
}

async function assertSubmissionUiSafe(runDir) {
  const html = await fs.readFile(path.join(runDir, "report.html"), "utf8");
  if (!html.includes("Submit anonymized result")) {
    throw new Error("report missing submission section");
  }
  if (!html.includes("Preview anonymized summary")) {
    throw new Error("report missing preview button");
  }
  if (!html.includes("This report is local. Nothing is uploaded automatically.")) {
    throw new Error("report missing local/no-auto-upload copy");
  }
  if (!html.includes(SUBMISSION_ENDPOINT)) {
    throw new Error("report missing submission endpoint");
  }
  const submitListenerIndex = html.indexOf('submitButton.addEventListener("click"');
  const fetchIndex = html.indexOf("fetch(SUBMISSION_ENDPOINT");
  if (submitListenerIndex === -1 || fetchIndex === -1 || fetchIndex < submitListenerIndex) {
    throw new Error("submission fetch is not gated behind submit click handler");
  }
  const match = html.match(/const ANONYMIZED_SUMMARY = (\{[\s\S]*?\});/);
  if (!match) {
    throw new Error("report missing embedded anonymized summary");
  }
  const payload = JSON.parse(match[1]);
  for (const field of REQUIRED_SUBMISSION_FIELDS) {
    if (!(field in payload)) {
      throw new Error(`anonymized payload missing ${field}`);
    }
  }
  for (const forbidden of ["run_id", "report_path", "findings", "events", "snippet", "source", "prompt", "email", "username"]) {
    if (forbidden in payload || html.includes(`"${forbidden}":`)) {
      throw new Error(`forbidden submitted field present: ${forbidden}`);
    }
  }
  const payloadText = JSON.stringify(payload);
  if (looksAbsolute(payloadText)) {
    throw new Error("anonymized payload included absolute path");
  }
  for (const optional of ["agent_name", "agent_version", "os", "user_comment"]) {
    if (optional in payload) {
      throw new Error(`optional field should not be required in base payload: ${optional}`);
    }
  }
}
