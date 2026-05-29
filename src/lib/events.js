import fs from "node:fs/promises";

export async function appendEvent(runDir, event) {
  const line = JSON.stringify({ timestamp: new Date().toISOString(), ...event }) + "\n";
  await fs.appendFile(`${runDir}/events.jsonl`, line, "utf8");
}
