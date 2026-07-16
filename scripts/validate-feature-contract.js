#!/usr/bin/env node
"use strict";

const fs = require("node:fs");

const quickChatPatchName =
  "feature:quick-chat-window-zoom:quick-chat-window-zoom";

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

  const quickChatEntries = (report.patches ?? []).filter(
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

module.exports = { quickChatPatchName, validateFeatureContract };
