#!/usr/bin/env node
"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const test = require("node:test");

const { validateSourceAdvance } = require("./validate-source-advance.js");

function git(cwd, args) {
  const result = spawnSync("git", args, { cwd, encoding: "utf8" });
  assert.equal(
    result.status,
    0,
    `${result.error?.message ?? ""}${result.stderr}${result.stdout}`,
  );
  return result.stdout.trim();
}

function commitFile(sourceDir, contents) {
  fs.writeFileSync(path.join(sourceDir, "source.txt"), `${contents}\n`);
  git(sourceDir, ["add", "source.txt"]);
  git(sourceDir, ["commit", "-m", contents]);
  return git(sourceDir, ["rev-parse", "HEAD"]);
}

function withFixture(callback) {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "source-advance-"));
  const remoteDir = path.join(tempDir, "remote.git");
  const sourceDir = path.join(tempDir, "source");
  const builderDir = path.join(tempDir, "builder");
  try {
    fs.mkdirSync(sourceDir);
    fs.mkdirSync(builderDir);
    git(tempDir, ["init", "--bare", remoteDir]);
    git(sourceDir, ["init"]);
    git(sourceDir, ["config", "user.name", "Source Advance Test"]);
    git(sourceDir, ["config", "user.email", "source-advance@example.invalid"]);
    git(builderDir, ["init"]);

    const firstSha = commitFile(sourceDir, "first");
    git(sourceDir, ["branch", "-M", "private"]);
    git(sourceDir, ["remote", "add", "origin", remoteDir]);
    git(sourceDir, ["push", "-u", "origin", "private"]);
    callback({ builderDir, firstSha, remoteDir, sourceDir });
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

test("accepts an unchanged source branch", () => {
  withFixture(({ builderDir, firstSha, remoteDir }) => {
    assert.equal(
      validateSourceAdvance({
        sourceUrl: remoteDir,
        sourceBranch: "private",
        currentSha: firstSha,
        cwd: builderDir,
      }),
      firstSha,
    );
    const fetchedCommit = spawnSync(
      "git",
      ["cat-file", "-e", `${firstSha}^{commit}`],
      { cwd: builderDir, encoding: "utf8" },
    );
    assert.notEqual(
      fetchedCommit.status,
      0,
      "unchanged polling fetched history",
    );
  });
});

test("accepts a fast-forward source advance", () => {
  withFixture(({ builderDir, firstSha, remoteDir, sourceDir }) => {
    const secondSha = commitFile(sourceDir, "second");
    git(sourceDir, ["push", "origin", "private"]);

    assert.equal(
      validateSourceAdvance({
        sourceUrl: remoteDir,
        sourceBranch: "private",
        currentSha: firstSha,
        cwd: builderDir,
      }),
      secondSha,
    );
  });
});

test("CLI prints the validated source commit", () => {
  withFixture(({ builderDir, firstSha, remoteDir, sourceDir }) => {
    const secondSha = commitFile(sourceDir, "second");
    git(sourceDir, ["push", "origin", "private"]);

    const scriptPath = path.join(__dirname, "validate-source-advance.js");
    const result = spawnSync(
      process.execPath,
      [scriptPath, remoteDir, "private", firstSha],
      { cwd: builderDir, encoding: "utf8" },
    );
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout, `${secondSha}\n`);
  });
});

test("rejects a source branch rewind", () => {
  withFixture(({ builderDir, firstSha, remoteDir, sourceDir }) => {
    const secondSha = commitFile(sourceDir, "second");
    git(sourceDir, ["push", "origin", "private"]);
    git(sourceDir, [
      "push",
      "--force",
      "origin",
      `${firstSha}:refs/heads/private`,
    ]);

    assert.throws(
      () =>
        validateSourceAdvance({
          sourceUrl: remoteDir,
          sourceBranch: "private",
          currentSha: secondSha,
          cwd: builderDir,
        }),
      /refusing rewind or unrelated history/u,
    );
  });
});

test("rejects malformed source inputs before fetching", () => {
  assert.throws(
    () =>
      validateSourceAdvance({
        sourceUrl: "",
        sourceBranch: "private",
        currentSha: "a".repeat(40),
        cwd: process.cwd(),
      }),
    /source URL/u,
  );
  assert.throws(
    () =>
      validateSourceAdvance({
        sourceUrl: "/tmp/source.git",
        sourceBranch: "private",
        currentSha: "abc",
        cwd: process.cwd(),
      }),
    /invalid current source commit/u,
  );
});
