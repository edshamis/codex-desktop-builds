#!/usr/bin/env node
"use strict";

const { spawnSync } = require("node:child_process");

const shaPattern = /^[0-9a-f]{40}$/u;

function runGit(args, cwd) {
  return spawnSync("git", args, {
    cwd,
    encoding: "utf8",
  });
}

function requireGitSuccess(result, description) {
  if (result.error != null) {
    throw result.error;
  }
  if (result.status !== 0) {
    const detail = result.stderr.trim() || result.stdout.trim();
    throw new Error(`${description}${detail === "" ? "" : `: ${detail}`}`);
  }
  return result.stdout.trim();
}

function validateSourceAdvance({ sourceUrl, sourceBranch, currentSha, cwd }) {
  if (sourceUrl === "") {
    throw new Error("source URL must not be empty");
  }
  if (!shaPattern.test(currentSha)) {
    throw new Error(`invalid current source commit: ${currentSha}`);
  }

  requireGitSuccess(
    runGit(["check-ref-format", "--branch", sourceBranch], cwd),
    `invalid source branch: ${sourceBranch}`,
  );

  const advertisedRef = `refs/heads/${sourceBranch}`;
  const advertised = requireGitSuccess(
    runGit(["ls-remote", "--exit-code", sourceUrl, advertisedRef], cwd),
    `failed to resolve source branch ${sourceBranch}`,
  );
  const advertisedFields = advertised.split(/\s+/u);
  if (
    advertisedFields.length !== 2 ||
    !shaPattern.test(advertisedFields[0]) ||
    advertisedFields[1] !== advertisedRef
  ) {
    throw new Error(`invalid source branch advertisement: ${advertised}`);
  }
  if (advertisedFields[0] === currentSha) {
    return currentSha;
  }

  const candidateRef = `refs/codex-source/candidate-${process.pid}`;
  try {
    requireGitSuccess(
      runGit(
        [
          "fetch",
          "--no-tags",
          "--force",
          sourceUrl,
          `+refs/heads/${sourceBranch}:${candidateRef}`,
        ],
        cwd,
      ),
      `failed to fetch source branch ${sourceBranch}`,
    );

    const latestSha = requireGitSuccess(
      runGit(["rev-parse", `${candidateRef}^{commit}`], cwd),
      "failed to resolve fetched source commit",
    );
    if (!shaPattern.test(latestSha)) {
      throw new Error(`invalid fetched source commit: ${latestSha}`);
    }

    const currentCommit = runGit(
      ["cat-file", "-e", `${currentSha}^{commit}`],
      cwd,
    );
    if (currentCommit.error != null) {
      throw currentCommit.error;
    }
    if (currentCommit.status !== 0) {
      throw new Error(
        `source branch ${sourceBranch} no longer contains pinned commit ${currentSha}; refusing rewind or unrelated history`,
      );
    }

    const ancestry = runGit(
      ["merge-base", "--is-ancestor", currentSha, latestSha],
      cwd,
    );
    if (ancestry.error != null) {
      throw ancestry.error;
    }
    if (ancestry.status === 1) {
      throw new Error(
        `source branch ${sourceBranch} at ${latestSha} is not a descendant of pinned commit ${currentSha}; refusing rewind or unrelated history`,
      );
    }
    if (ancestry.status !== 0) {
      const detail = ancestry.stderr.trim() || ancestry.stdout.trim();
      throw new Error(
        `failed to verify source ancestry${detail === "" ? "" : `: ${detail}`}`,
      );
    }

    return latestSha;
  } finally {
    runGit(["update-ref", "-d", candidateRef], cwd);
  }
}

function main(argv) {
  if (argv.length !== 3) {
    throw new Error(
      "usage: validate-source-advance.js SOURCE_URL SOURCE_BRANCH CURRENT_SHA",
    );
  }
  const [sourceUrl, sourceBranch, currentSha] = argv;
  const latestSha = validateSourceAdvance({
    sourceUrl,
    sourceBranch,
    currentSha,
    cwd: process.cwd(),
  });
  process.stdout.write(`${latestSha}\n`);
}

if (require.main === module) {
  try {
    main(process.argv.slice(2));
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}

module.exports = { validateSourceAdvance };
