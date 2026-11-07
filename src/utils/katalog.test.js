import test from "node:test";
import assert from "node:assert/strict";
import { formatGroupedCatalogText, getCatalogBaseKey, isCatalogABPair, katalogSort, renderCatalogDisplay } from "./katalog.js";

test("catalogue A/B numbers group when only one suffix has an intervening space", () => {
  const versionA = { idZnamky: "cz-1975-01", katalogCislo: "A 2175 A" };
  const versionB = { idZnamky: "cz-1975-02", katalogCislo: "A 2175B" };

  assert.equal(getCatalogBaseKey(versionA), "A|2175");
  assert.equal(getCatalogBaseKey(versionB), "A|2175");
  assert.equal(formatGroupedCatalogText([versionA, versionB]), "A 2175A/B");
  assert.equal(renderCatalogDisplay(formatGroupedCatalogText([versionA, versionB])), `A 2175${"\u202f"}A/B`);
});

test("catalogue suffix parser accepts a space before either A or B", () => {
  const versionA = { idZnamky: "cz-1975-01", katalogCislo: "A 2175 A" };
  const versionB = { idZnamky: "cz-1975-02", katalogCislo: "A 2175 B" };

  assert.equal(getCatalogBaseKey(versionA), getCatalogBaseKey(versionB));
  assert.equal(formatGroupedCatalogText([versionA, versionB]), "A 2175A/B");
});

test("catalogue sorting orders A before B with spaced or unspaced suffixes", () => {
  const versionA = { katalogCislo: "A 2175 A" };
  const versionB = { katalogCislo: "A 2175B" };

  assert.deepEqual([versionB, versionA].sort(katalogSort), [versionA, versionB]);
  assert.deepEqual(
    [{ katalogCislo: "A 2175B" }, { katalogCislo: "A 2175A" }].sort(katalogSort).map(item => item.katalogCislo),
    ["A 2175A", "A 2175B"],
  );
});

test("only an exact A/B suffix pair is split into separate catalogue cards", () => {
  const versionA = { katalogCislo: "A 2597 A" };
  const versionB = { katalogCislo: "A 2597B" };
  const otherNumber = { katalogCislo: "PL 2596" };
  const duplicateA = { katalogCislo: "A 2597A" };

  assert.equal(isCatalogABPair([versionA, versionB]), true);
  assert.equal(isCatalogABPair([versionA, otherNumber]), false);
  assert.equal(isCatalogABPair([versionA, duplicateA]), false);
  assert.equal(isCatalogABPair([versionA]), false);
});