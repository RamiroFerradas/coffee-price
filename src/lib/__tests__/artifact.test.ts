import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { writeArtifact } from "@/lib/artifact";

describe("writeArtifact", () => {
  let workDir: string;
  let originalCwd: string;

  beforeEach(() => {
    originalCwd = process.cwd();
    workDir = mkdtempSync(join(tmpdir(), "artifact-test-"));
    process.chdir(workDir);
  });

  afterEach(() => {
    process.chdir(originalCwd);
    rmSync(workDir, { recursive: true, force: true });
  });

  it("creates every missing parent directory and the file", () => {
    writeArtifact(".vitest/live-summary.txt", "line\n", { append: true });

    expect(readFileSync(join(workDir, ".vitest/live-summary.txt"), "utf8")).toBe(
      "line\n",
    );
  });

  it("appends on subsequent calls with append: true", () => {
    writeArtifact(".vitest/live-summary.txt", "line\n", { append: true });
    writeArtifact(".vitest/live-summary.txt", "line\n", { append: true });

    expect(readFileSync(join(workDir, ".vitest/live-summary.txt"), "utf8")).toBe(
      "line\nline\n",
    );
  });

  it("overwrites previous content without append", () => {
    writeArtifact(".vitest/live-summary.txt", "first\n", { append: true });
    writeArtifact(".vitest/live-summary.txt", "second\n");

    expect(readFileSync(join(workDir, ".vitest/live-summary.txt"), "utf8")).toBe(
      "second\n",
    );
  });

  it("accepts a file:// URL for the target path", () => {
    const url = pathToFileURL(join(workDir, "nested/dir/url-target.txt"));

    writeArtifact(url, "from url\n");

    expect(readFileSync(join(workDir, "nested/dir/url-target.txt"), "utf8")).toBe(
      "from url\n",
    );
  });
});
