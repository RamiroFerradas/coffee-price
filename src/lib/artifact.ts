import { mkdirSync, writeFileSync, appendFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export interface WriteArtifactOptions {
  /** When true, append to the file instead of overwriting it. */
  append?: boolean;
}

/**
 * Write a generated artifact, creating any missing parent directories first.
 *
 * `path` may be a `string` (absolute, or relative to `process.cwd()`) or a
 * `file://` URL (e.g. `new URL("../../../.vitest/…", import.meta.url)`),
 * which is converted with `fileURLToPath`.
 */
export function writeArtifact(
  path: string | URL,
  contents: string,
  options: WriteArtifactOptions = {},
): void {
  const target = resolve(
    process.cwd(),
    typeof path === "string" ? path : fileURLToPath(path),
  );
  mkdirSync(dirname(target), { recursive: true });
  if (options.append) {
    appendFileSync(target, contents);
  } else {
    writeFileSync(target, contents);
  }
}
