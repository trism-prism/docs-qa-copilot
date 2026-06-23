import { test } from "node:test";
import assert from "node:assert/strict";
import { parseArgs } from "./eval.ts";

test("dev is the default and needs no --final", () => {
  const a = parseArgs([]);
  assert.equal(a.split, "dev");
  assert.equal(a.final, false);
  assert.equal(parseArgs(["--split", "dev", "--retrieval-only", "--label", "x"]).out.replaceAll("\\", "/"), "eval/results/x.json");
});

for (const split of ["heldout", "all"]) {
  test(`${split} is refused without --final, retrieval-only included`, () => {
    assert.throws(() => parseArgs(["--split", split]), /refused without --final/);
    assert.throws(() => parseArgs(["--split", split, "--retrieval-only"]), /refused without --final/);
  });
}

for (const [argv, key, want] of [
  [["--split", "heldout", "--final"], "split", "heldout"],
  [["--split", "all", "--final", "--out", "a.json"], "out", "a.json"],
] as const) {
  test(`${argv.join(" ")} is allowed`, () => {
    assert.equal(parseArgs([...argv])[key], want);
  });
}

test("an unknown split is rejected", () => {
  assert.throws(() => parseArgs(["--split", "test"]), /--split must be/);
});
