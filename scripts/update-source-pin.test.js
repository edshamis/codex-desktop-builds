#!/usr/bin/env node
"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const test = require("node:test");

const { sourcePin, updateSourcePin } = require("./update-source-pin.js");

const oldSha = "1".repeat(40);
const newSha = "a".repeat(40);

function flakeWithPin(sha = oldSha) {
  return `{
  inputs.codex-desktop-linux.url = "github:edshamis/codex-desktop-linux/${sha}";
}\n`;
}

test("reads the one immutable source pin", () => {
  assert.equal(sourcePin(flakeWithPin()), oldSha);
});

test("updates only the immutable source commit", () => {
  const result = updateSourcePin(flakeWithPin(), newSha);
  assert.equal(result.previousSha, oldSha);
  assert.equal(result.changed, true);
  assert.equal(sourcePin(result.source), newSha);
});

test("reports an unchanged source pin", () => {
  const source = flakeWithPin();
  const result = updateSourcePin(source, oldSha);
  assert.equal(result.changed, false);
  assert.equal(result.source, source);
});

test("rejects mutable or malformed source references", () => {
  assert.throws(() => sourcePin(flakeWithPin("main")), /exactly one/u);
  assert.throws(
    () => sourcePin(`${flakeWithPin()}${flakeWithPin()}`),
    /found 2/u,
  );
  assert.throws(() => updateSourcePin(flakeWithPin(), "abc"), /invalid/u);
});

test("CLI reads and updates a selected flake", () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "source-pin-"));
  const flakePath = path.join(tempDir, "flake.nix");
  const scriptPath = path.join(__dirname, "update-source-pin.js");
  try {
    fs.writeFileSync(flakePath, flakeWithPin());
    const update = spawnSync(
      process.execPath,
      [scriptPath, "--flake", flakePath, newSha],
      { encoding: "utf8" },
    );
    assert.equal(update.status, 0, update.stderr);
    assert.equal(update.stdout, `${oldSha}\n`);
    assert.equal(sourcePin(fs.readFileSync(flakePath, "utf8")), newSha);

    const read = spawnSync(
      process.execPath,
      [scriptPath, "--flake", flakePath, "--read"],
      { encoding: "utf8" },
    );
    assert.equal(read.status, 0, read.stderr);
    assert.equal(read.stdout, `${newSha}\n`);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});
