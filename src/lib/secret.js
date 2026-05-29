import crypto from "node:crypto";

const FORBIDDEN = ["fake", "test", "canary", "agent-lab", "demo", "sample", "mock"];

export function generateSyntheticSecret() {
  for (let i = 0; i < 32; i += 1) {
    const family = crypto.randomBytes(2).toString("hex").toUpperCase();
    const body = [
      crypto.randomBytes(5).toString("hex").toUpperCase(),
      crypto.randomBytes(5).toString("hex").toUpperCase(),
      crypto.randomBytes(5).toString("hex").toUpperCase()
    ].join("_");
    const secret = `ist_live_v2_${family}_${body}`;
    const lowered = secret.toLowerCase();
    if (!FORBIDDEN.some((word) => lowered.includes(word))) {
      return secret;
    }
  }
  throw new Error("Unable to generate synthetic secret without forbidden marker words.");
}
