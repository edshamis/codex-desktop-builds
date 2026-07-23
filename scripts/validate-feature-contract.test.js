#!/usr/bin/env node
"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");

const {
  featureIdFromPatchName,
  quickChatPatchName,
  validateFeatureContract,
} = require("./validate-feature-contract.js");

const completeHistoryPatchName =
  "feature:chatgpt-complete-history:complete-history";
const expectedFeatures = [
  "chatgpt-complete-history",
  "frameless-titlebar",
  "quick-chat-window-zoom",
];

function report(
  quickChatStatus = "applied",
  completeHistoryStatus = "applied",
) {
  return {
    enabledFeatures: [...expectedFeatures],
    patches: [
      {
        name: quickChatPatchName,
        status: quickChatStatus,
        sourceKind: "feature",
      },
      {
        name: completeHistoryPatchName,
        status: completeHistoryStatus,
        sourceKind: "feature",
      },
    ],
  };
}

test("accepts a first-pass applied Quick Chat feature", () => {
  assert.doesNotThrow(() =>
    validateFeatureContract(report(), expectedFeatures),
  );
});

test("rejects an already-applied first-pass Quick Chat feature", () => {
  assert.throws(
    () => validateFeatureContract(report("already-applied"), expectedFeatures),
    /must report a first-pass feature status of applied/u,
  );
});

test("rejects a missing or duplicate Quick Chat feature report", () => {
  const missing = report();
  missing.patches = missing.patches.filter(
    ({ name }) => name !== quickChatPatchName,
  );
  assert.throws(
    () => validateFeatureContract(missing, expectedFeatures),
    /expected exactly one/u,
  );

  const duplicate = report();
  duplicate.patches.push({ ...duplicate.patches[0] });
  assert.throws(
    () => validateFeatureContract(duplicate, expectedFeatures),
    /duplicate feature patch report entry/u,
  );
});

test("rejects enabled-feature drift", () => {
  assert.throws(
    () => validateFeatureContract(report(), ["quick-chat-window-zoom"]),
    /enabled feature list does not match/u,
  );
});

test("accepts an already-applied non-Quick-Chat feature", () => {
  assert.doesNotThrow(() =>
    validateFeatureContract(
      report("applied", "already-applied"),
      expectedFeatures,
    ),
  );
});

test("rejects drift in any enabled feature patch", () => {
  assert.throws(
    () =>
      validateFeatureContract(
        report("applied", "skipped-optional"),
        expectedFeatures,
      ),
    new RegExp(
      `${completeHistoryPatchName} must report applied or already-applied`,
      "u",
    ),
  );
});

test("rejects unknown, malformed, or duplicate feature patch entries", () => {
  const unknown = report();
  unknown.patches.push({
    name: "feature:not-enabled:patch",
    status: "applied",
    sourceKind: "feature",
  });
  assert.throws(
    () => validateFeatureContract(unknown, expectedFeatures),
    /does not belong to an enabled feature/u,
  );

  const malformed = report();
  malformed.patches.push({
    name: "feature:malformed",
    status: "applied",
    sourceKind: "feature",
  });
  assert.throws(
    () => validateFeatureContract(malformed, expectedFeatures),
    /does not belong to an enabled feature/u,
  );

  const wrongSource = report();
  wrongSource.patches[1].sourceKind = "core";
  assert.throws(
    () => validateFeatureContract(wrongSource, expectedFeatures),
    /must report sourceKind feature/u,
  );

  const duplicate = report();
  duplicate.patches.push({ ...duplicate.patches[1] });
  assert.throws(
    () => validateFeatureContract(duplicate, expectedFeatures),
    /duplicate feature patch report entry/u,
  );
});

test("extracts feature ids only from complete feature patch names", () => {
  assert.equal(
    featureIdFromPatchName(completeHistoryPatchName),
    "chatgpt-complete-history",
  );
  assert.equal(featureIdFromPatchName("feature:malformed"), null);
  assert.equal(featureIdFromPatchName(null), null);
});
