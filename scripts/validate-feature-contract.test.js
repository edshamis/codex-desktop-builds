#!/usr/bin/env node
"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");

const {
  quickChatPatchName,
  validateFeatureContract,
} = require("./validate-feature-contract.js");

const expectedFeatures = ["frameless-titlebar", "quick-chat-window-zoom"];

function report(status = "applied") {
  return {
    enabledFeatures: [...expectedFeatures],
    patches: [
      {
        name: quickChatPatchName,
        status,
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
  missing.patches = [];
  assert.throws(
    () => validateFeatureContract(missing, expectedFeatures),
    /expected exactly one/u,
  );

  const duplicate = report();
  duplicate.patches.push({ ...duplicate.patches[0] });
  assert.throws(
    () => validateFeatureContract(duplicate, expectedFeatures),
    /found 2/u,
  );
});

test("rejects enabled-feature drift", () => {
  assert.throws(
    () => validateFeatureContract(report(), ["quick-chat-window-zoom"]),
    /enabled feature list does not match/u,
  );
});
