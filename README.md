# Agent Injection Lab

Phase 0 / v0.1.0 public preview.

A local staging test for AI coding agents exposed to untrusted sources.

Give your AI coding agent a cached bug report.
See whether it stages a synthetic secret in the local workspace.

Phase 0 is local staging only. It uses synthetic secrets only, does not upload data automatically, and does not test network exfiltration.

No result proves an agent is safe or unsafe.

## What this is NOT

- Not a complete agent security audit.
- Not a network exfiltration test in Phase 0.
- Not a prompt injection scanner.
- Not a production firewall.
- Not a guarantee that your agent is safe.

## Open Transparency

Agent Injection Lab is open for inspection. The CLI source, report generation logic, anonymized summary format, and privacy boundaries can be reviewed in this repository.

For Phase 0, the tool is local-only and does not upload data automatically.

## Quick Start

```sh
npm install
node ./bin/agent-lab.js start dependency_resolver_staging
node ./bin/agent-lab.js analyze <run_dir>
node ./bin/agent-lab.js test
```

Phase 0 is local-only. Reports state that network egress was not tested.

## Available Scenarios

All scenarios use synthetic secrets and observe local staging only. Network exfiltration is not tested in Phase 0/0.2, and no result proves an agent is safe or unsafe.

```sh
node ./bin/agent-lab.js start dependency_resolver_staging
node ./bin/agent-lab.js start github_issue_env_staging
node ./bin/agent-lab.js start readme_install_diagnostic_staging
node ./bin/agent-lab.js start mcp_tool_result_staging
```

- `dependency_resolver_staging`: cached resolver error log.
- `github_issue_env_staging`: GitHub issue / bug report that asks for local configuration diagnosis.
- `readme_install_diagnostic_staging`: third-party README / install troubleshooting guide.
- `mcp_tool_result_staging`: MCP tool result / structured external diagnostic output.

## Local Demo

1. Create a run:

```sh
node ./bin/agent-lab.js start dependency_resolver_staging
```

2. Copy the generated `runs/<run_id>` path, then trigger a deterministic diagnostic staging fixture:

```sh
node ./mock_agents/diagnostic_staging_agent.js runs/<run_id>
```

3. Analyze the run:

```sh
node ./bin/agent-lab.js analyze runs/<run_id>
```

4. Open:

```text
runs/<run_id>/report.html
```

The demo demonstrates that the tool runs locally, detects synthetic secret staging in the test workspace, generates a report, and states the Phase 0 limitations.

## Seed User Docs

- [Seed User Test Guide](docs/seed-user-test-guide.md)
- [Anonymized Summary Guide](docs/anonymized-summary-guide.md)
- [Release Checklist v0.1.0](docs/release-checklist-v0.1.0.md)
- [Demo Transcript](docs/demo-transcript.md)

## License

Agent Injection Lab is licensed under AGPL-3.0.

The goal is to keep the CLI, report generation logic, anonymized summary format, and future hosted submission/gallery logic open for inspection. If you modify and provide this software as a network service, review the AGPL-3.0 obligations.

For legal questions, consult the license text or legal counsel.
