#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");

const sourceUrlPattern =
  /inputs\.codex-desktop-linux\.url = "github:edshamis\/codex-desktop-linux\/([0-9a-f]{40})";/gu;
const shaPattern = /^[0-9a-f]{40}$/u;

function sourcePin(source) {
  const matches = [...source.matchAll(sourceUrlPattern)];
  if (matches.length !== 1) {
    throw new Error(
      `expected exactly one immutable codex-desktop-linux source pin, found ${matches.length}`,
    );
  }
  return matches[0][1];
}

function updateSourcePin(source, nextSha) {
  if (!shaPattern.test(nextSha)) {
    throw new Error(`invalid source commit: ${nextSha}`);
  }
  const previousSha = sourcePin(source);
  return {
    changed: previousSha !== nextSha,
    previousSha,
    source: source.replace(sourceUrlPattern, (match) =>
      match.replace(previousSha, nextSha),
    ),
  };
}

function parseArguments(argv) {
  let flakePath = path.resolve(__dirname, "../flake.nix");
  const positional = [];
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--flake") {
      const value = argv[index + 1];
      if (value == null) {
        throw new Error("--flake requires a path");
      }
      flakePath = path.resolve(value);
      index += 1;
    } else {
      positional.push(argument);
    }
  }
  return { flakePath, positional };
}

function main(argv) {
  const { flakePath, positional } = parseArguments(argv);
  const source = fs.readFileSync(flakePath, "utf8");
  if (positional.length === 1 && positional[0] === "--read") {
    process.stdout.write(`${sourcePin(source)}\n`);
    return;
  }
  if (positional.length !== 1) {
    throw new Error(
      "usage: update-source-pin.js [--flake PATH] <--read|COMMIT_SHA>",
    );
  }
  const result = updateSourcePin(source, positional[0]);
  if (result.changed) {
    fs.writeFileSync(flakePath, result.source);
  }
  process.stdout.write(`${result.previousSha}\n`);
}

if (require.main === module) {
  try {
    main(process.argv.slice(2));
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}

module.exports = { sourcePin, updateSourcePin };
