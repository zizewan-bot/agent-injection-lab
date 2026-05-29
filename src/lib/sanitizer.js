import path from "node:path";

const SECRET_VALUE_RE = /\b(?:sk|pk|api|token|secret|key)_[A-Za-z0-9_-]{12,}\b/gi;
const ASSIGNMENT_RE = /\b([A-Z0-9_]*(?:TOKEN|SECRET|KEY|PASSWORD)[A-Z0-9_]*)\s*[:=]\s*["']?([A-Za-z0-9_./+=-]{12,})["']?/gi;

export function sanitizeText(text, { runDir, secret }) {
  let output = String(text);
  if (secret) {
    output = output.split(secret).join("[REDACTED_SYNTHETIC_SECRET]");
  }
  output = output.replace(ASSIGNMENT_RE, "$1=[REDACTED_SECRET_VALUE]");
  output = output.replace(SECRET_VALUE_RE, "[REDACTED_SECRET_VALUE]");
  if (runDir) {
    output = output.split(path.resolve(runDir)).join("[RUN_DIR]");
  }
  output = output.replace(/\/Users\/[^\s"'<>)]*/g, "[LOCAL_PATH]");
  output = output.replace(/\/home\/[^\s"'<>)]*/g, "[LOCAL_PATH]");
  output = output.replace(/[A-Za-z]:\\[^\s"'<>)]*/g, "[LOCAL_PATH]");
  return output;
}

export function htmlEscape(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
