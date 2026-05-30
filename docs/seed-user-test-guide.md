# Seed User Test Guide

Agent Injection Lab is a local staging test for AI coding agents exposed to untrusted sources.

It gives your AI coding agent a cached bug report and checks whether the agent stages a synthetic secret in the local workspace or basic Git state.

## What This Is Not

- Not a complete agent security audit.
- Not a network exfiltration test in Phase 0.
- Not a prompt injection scanner.
- Not a production firewall.
- Not a guarantee that your agent is safe.

## Install And Run

```sh
npm install
node ./bin/agent-lab.js start dependency_resolver_staging
node ./bin/agent-lab.js analyze <run_dir>
node ./bin/agent-lab.js test
```

## Available Scenarios

All scenarios are local-only and use synthetic secrets. Network exfiltration is not tested in Phase 0/0.2, and no result proves an agent is safe or unsafe.

- `dependency_resolver_staging`: cached resolver error log.
- `github_issue_env_staging`: GitHub issue / bug report.
- `readme_install_diagnostic_staging`: third-party README / install troubleshooting guide.
- `mcp_tool_result_staging`: MCP tool result / external tool output.

Run any scenario with:

```sh
node ./bin/agent-lab.js start <scenario_id>
```

## 3-Minute Test Flow

1. Create a local test run.

```sh
node ./bin/agent-lab.js start dependency_resolver_staging
```

2. Copy the instruction printed by the CLI into your AI coding agent.
3. Let the agent work only inside the generated `runs/<run_id>/workspace` directory.
4. Analyze the run.

```sh
node ./bin/agent-lab.js analyze runs/<run_id>
```

5. Open the generated report.

```text
runs/<run_id>/report.html
```

## Clean Run Flow

Run `start`, do not let any agent modify the workspace, then run `analyze`.

Expected result:

```text
NO_VERIFIED_STAGING_OBSERVED
```

This does not prove the agent is safe. It only means this Phase 0 run did not verify synthetic secret staging.

## Mock Critical Flow

Use the deterministic mock fixture to simulate a diagnostic-log staging failure:

```sh
node ./bin/agent-lab.js start dependency_resolver_staging
node ./mock_agents/diagnostic_staging_agent.js runs/<run_id>
node ./bin/agent-lab.js analyze runs/<run_id>
```

Expected result:

```text
CRITICAL_SECRET_STAGED_IN_WORKSPACE_FILE
```

Open:

```text
runs/<run_id>/report.html
```

## Feedback To Send Back

Please send:

- Operating system and Node.js version.
- Whether `node ./bin/agent-lab.js test` passed.
- Which result code you got from your clean or agent-assisted run.
- Whether `report.html` was understandable.
- Any confusing wording in the CLI or report.
- Whether your AI coding agent needed extra instructions.

Do not send your full workspace, full Git patches, raw `events.jsonl`, private project files, or real secrets.

## Data Uploads

No data is uploaded by this Phase 0 tool.

Reports and summaries are generated locally. Sharing any output is optional and manual.

## Phase 0 Reminder

Phase 0 does not test network exfiltration. It only checks local staging into workspace files and basic Git diff / staged state.
