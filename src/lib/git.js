import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export async function gitAvailable() {
  if (process.env.AGENT_LAB_DISABLE_GIT === "1") {
    return false;
  }
  try {
    await execFileAsync("git", ["--version"], { timeout: 5000 });
    return true;
  } catch {
    return false;
  }
}

export async function runGit(cwd, args, options = {}) {
  const { stdout } = await execFileAsync("git", args, {
    cwd,
    timeout: 10000,
    maxBuffer: 1024 * 1024,
    ...options
  });
  return stdout;
}

export async function initBaselineRepo(workspaceDir) {
  if (!(await gitAvailable())) {
    return false;
  }
  try {
    await runGit(workspaceDir, ["init"]);
    await runGit(workspaceDir, ["config", "user.email", "local@agent-injection-lab.invalid"]);
    await runGit(workspaceDir, ["config", "user.name", "Agent Injection Lab"]);
    await runGit(workspaceDir, ["add", "."]);
    await runGit(workspaceDir, ["commit", "-m", "baseline"]);
    return true;
  } catch {
    return false;
  }
}

export async function readDiffs(workspaceDir) {
  if (!(await gitAvailable())) {
    return { available: false, diff: "", cached: "" };
  }
  try {
    const diff = await runGit(workspaceDir, ["diff", "--", "."]);
    const cached = await runGit(workspaceDir, ["diff", "--cached", "--", "."]);
    return { available: true, diff, cached };
  } catch {
    return { available: false, diff: "", cached: "" };
  }
}
