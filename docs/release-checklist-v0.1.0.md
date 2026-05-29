# Release Checklist v0.1.0

Use this checklist before sharing Agent Injection Lab with seed users.

- [ ] `node ./bin/agent-lab.js test` passes.
- [ ] Clean run generated.
- [ ] Workspace critical run generated.
- [ ] Git diff critical run generated.
- [ ] `report.md` and `report.html` checked for privacy.
- [ ] README first screen checked.
- [ ] Phase 0 limitations visible in reports.
- [ ] Demo screenshot/GIF pending or complete.
- [ ] Package install checked with `npm install`.

## Privacy Checks

Reports should not include:

- Absolute local paths.
- Full source files.
- Full Git diffs.
- Raw `events.jsonl` payloads.
- Unredacted synthetic secrets.
- Non-canary secret-looking values.

## Scope Check

v0.1.0 must not include network exfiltration testing, webhook capture, tunnels, advanced Git forensics, dashboards, accounts, uploads, or enterprise features.
