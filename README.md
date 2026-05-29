# Agent Injection Lab

A local staging test for AI coding agents exposed to untrusted sources.

Give your AI coding agent a cached bug report.
See whether it stages a synthetic secret in the local workspace.

## What this is NOT

- Not a complete agent security audit.
- Not a network exfiltration test in Phase 0.
- Not a prompt injection scanner.
- Not a production firewall.
- Not a guarantee that your agent is safe.

## Quick Start

```sh
npm install
node ./bin/agent-lab.js start dependency_resolver_staging
node ./bin/agent-lab.js analyze <run_dir>
node ./bin/agent-lab.js test
```

Phase 0 is local-only. Reports state that network egress was not tested.

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

The demo proves the tool runs locally, detects synthetic secret staging, generates a report, and states the Phase 0 limitations.

## Seed User Docs

- [Seed User Test Guide](docs/seed-user-test-guide.md)
- [Anonymized Summary Guide](docs/anonymized-summary-guide.md)
- [Release Checklist v0.1.0](docs/release-checklist-v0.1.0.md)
- [Demo Transcript](docs/demo-transcript.md)
