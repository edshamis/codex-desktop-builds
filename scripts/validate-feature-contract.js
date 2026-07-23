#!/usr/bin/env node
"use strict";

const fs = require("node:fs");

const quickChatPatchName =
  "feature:quick-chat-window-zoom:quick-chat-window-zoom";
const successfulFeatureStatuses = new Set(["applied", "already-applied"]);

function featureIdFromPatchName(name) {
  return typeof name === "string"
    ? (name.match(/^feature:([^:]+):.+$/u)?.[1] ?? null)
    : null;
}

function validateFeatureContract(report, expectedFeatures) {
  if (!Array.isArray(expectedFeatures)) {
    throw new Error("expected feature contract must be an array");
  }
  if (
    !Array.isArray(report?.enabledFeatures) ||
    JSON.stringify(report.enabledFeatures) !== JSON.stringify(expectedFeatures)
  ) {
    throw new Error("enabled feature list does not match the builder contract");
  }

  if (!Array.isArray(report.patches)) {
    throw new Error("patch report must contain a patches array");
  }

  const featurePatchNames = new Set();
  for (const entry of report.patches) {
    const hasFeatureName =
      typeof entry?.name === "string" && entry.name.startsWith("feature:");
    if (!hasFeatureName && entry?.sourceKind !== "feature") {
      continue;
    }
    const featureId = featureIdFromPatchName(entry.name);
    if (featureId == null || !expectedFeatures.includes(featureId)) {
      throw new Error(
        `${entry.name} does not belong to an enabled feature in the builder contract`,
      );
    }
    if (entry.sourceKind !== "feature") {
      throw new Error(
        `${entry.name} must report sourceKind feature; got ${entry.sourceKind ?? "unknown"}`,
      );
    }
    if (!successfulFeatureStatuses.has(entry.status)) {
      throw new Error(
        `${entry.name} must report applied or already-applied; got ${entry.status ?? "unknown"}`,
      );
    }
    if (featurePatchNames.has(entry.name)) {
      throw new Error(`duplicate feature patch report entry: ${entry.name}`);
    }
    featurePatchNames.add(entry.name);
  }

  const quickChatEntries = report.patches.filter(
    (entry) => entry.name === quickChatPatchName,
  );
  if (quickChatEntries.length !== 1) {
    throw new Error(
      `expected exactly one ${quickChatPatchName} report entry; found ${quickChatEntries.length}`,
    );
  }

  const [quickChatEntry] = quickChatEntries;
  if (
    quickChatEntry.sourceKind !== "feature" ||
    quickChatEntry.status !== "applied"
  ) {
    throw new Error(
      `${quickChatPatchName} must report a first-pass feature status of applied; got ${quickChatEntry.sourceKind ?? "unknown"}/${quickChatEntry.status ?? "unknown"}`,
    );
  }
}

function main(argv) {
  if (argv.length !== 2) {
    throw new Error(
      "usage: validate-feature-contract.js <patch-report.json> <expected-features.json>",
    );
  }
  const [reportPath, expectedFeaturesPath] = argv;
  const report = JSON.parse(fs.readFileSync(reportPath, "utf8"));
  const expectedFeatures = JSON.parse(
    fs.readFileSync(expectedFeaturesPath, "utf8"),
  );
  validateFeatureContract(report, expectedFeatures);
}

if (require.main === module) {
  try {
    main(process.argv.slice(2));
  } catch (error) {
    console.error(`validate-feature-contract: ${error.message}`);
    process.exitCode = 1;
  }
}

module.exports = {
  featureIdFromPatchName,
  quickChatPatchName,
  successfulFeatureStatuses,
  validateFeatureContract,
};
