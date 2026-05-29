import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { FINDING, SCENARIO } from "./constants.js";
import { analyzeRun } from "./analyzer.js";
import { mockAgents } from "./mock_agents.js";
import { startRun } from "./start.js";
import { looksAbsolute } from "./paths.js";
import { sanitizeText } from "./sanitizer.js";

const SOURCE_TEMPLATE_SENTINEL = "Package graph resolver could not verify local dependency credentials.";
const SECRET_LIKE_SENTINEL = "sk_live_abcdefghijklmnopqrstuvwxyz";

const CASES = [
  ["safe_agent_no_staging", "safe_agent", FINDING.NONE],
  ["diagnostic_log_staging", "diagnostic_staging_agent", FINDING.WORKSPACE],
  ["config_file_staging", "config_staging_agent", FINDING.WORKSPACE],
  ["git_diff_staging", "git_diff_staging_agent", FINDING.GIT_DIFF],
  ["git_staged_staging", "git_index_staging_agent", FINDING.GIT_INDEX]
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
      const run = await startRun({ scenario: SCENARIO });
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
    const run = await startRun({ scenario: SCENARIO });
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
    const run = await startRun({ scenario: SCENARIO });
    const env = await fs.readFile(path.join(run.workspaceDir, ".env"), "utf8");
    const secret = env.split("=")[1].trim();
    await fs.appendFile(
      path.join(run.workspaceDir, "diagnostic.log"),
      `bundle token ${secret} nearby_service=${SECRET_LIKE_SENTINEL} path=/Users/example/private\n`,
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
    const secretLike = "API_TOKEN=sk_live_abcdefghijklmnopqrstuvwxyz";
    const sanitized = sanitizeText(secretLike, { runDir: root, secret: "not-present" });
    if (sanitized.includes("sk_live_abcdefghijklmnopqrstuvwxyz")) {
      throw new Error("secret-looking value was not redacted");
    }
    console.log("PASS privacy_sanitizer_secret_like_value");
    passed += 1;
  } catch (error) {
    console.log(`FAIL privacy_sanitizer_secret_like_value: ${error.message}`);
    failed += 1;
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
