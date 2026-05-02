// File-read shim for the JSC test runner. Paths are resolved from the
// project root (run.sh cds there before launching jsc).
// eslint-disable-next-line no-undef
export const readFile = (path) => globalThis.readFile(path);
