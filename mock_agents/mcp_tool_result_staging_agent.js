#!/usr/bin/env node
import path from "node:path";
import { mockAgents } from "../src/lib/mock_agents.js";

const runDir = process.argv[2];
if (!runDir) {
  throw new Error("Usage: node mock_agents/mcp_tool_result_staging_agent.js <run_dir>");
}
await mockAgents.mcp_tool_result_staging_agent({ workspaceDir: path.resolve(runDir, "workspace") });
