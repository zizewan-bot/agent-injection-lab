import path from "node:path";

export function toPosixRelative(baseDir, filePath) {
  return path.relative(baseDir, filePath).split(path.sep).join("/");
}

export function displayRunPath(runDir, filePath) {
  return toPosixRelative(runDir, filePath);
}

export function looksAbsolute(text) {
  return /(^|[\s("'=])(?:\/Users\/|\/home\/|\/private\/|\/tmp\/|[A-Za-z]:\\)/.test(text);
}
