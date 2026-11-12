import test from "node:test";
import assert from "node:assert/strict";
import { getEmissionSiblings, getEmissionStudyPublishTime } from "./emise.js";

test("new stamps without study do not promote an emission, enabling study with a new date does", () => {
  const study = { publishedAt: "2025-01-01T00:00:00Z" };
  const withoutStudy = { bezStudie: true, publishedAt: "2026-01-01T00:00:00Z" };
  assert.equal(getEmissionStudyPublishTime([study, withoutStudy]), Date.parse(study.publishedAt));
  assert.equal(getEmissionStudyPublishTime([withoutStudy]), 0);
  assert.equal(getEmissionStudyPublishTime([{ ...withoutStudy, bezStudie: false, bezRozliseni: true }]), Date.parse(withoutStudy.publishedAt));
  const enabledStudy = { ...withoutStudy, bezStudie: false, publishedAt: "2026-11-12T12:00:00Z" };
  assert.equal(getEmissionStudyPublishTime([study, enabledStudy]), Date.parse(enabledStudy.publishedAt));
  assert.equal(getEmissionStudyPublishTime([{ ...study, updatedAt: "2027-01-01T00:00:00Z" }]), Date.parse(study.publishedAt));
});

test("study publication sorting supports legacy ObjectIds and ignores invalid timestamps", () => {
  assert.equal(getEmissionStudyPublishTime([{ _id: "600000000000000000000000" }]), 0x60000000 * 1000);
  assert.equal(getEmissionStudyPublishTime([{ publishedAt: "invalid" }, {}]), 0);
  assert.equal(getEmissionStudyPublishTime([]), 0);
});

test("emission siblings share emission and year, sort by catalogue and retain stamps without study", () => {
  const item = { idZnamky: "current", emise: "Umění", rok: 1985, katalogCislo: "PL 2724" };
  const missingStudy = { idZnamky: "missing", emise: "Umění", rok: "1985", katalogCislo: "PL 2725", bezStudie: true };
  const study = { idZnamky: "study", emise: "Umění", rok: 1985, katalogCislo: "PL 2726" };
  const internal = { ...study, idZnamky: "internal", stav: "interni" };
  const stamps = [study, item, { ...study, rok: 1988 }, { ...study, emise: "Jiná" }, internal, missingStudy];
  assert.deepEqual(getEmissionSiblings(item, stamps), [missingStudy, study]);
  assert.equal(getEmissionSiblings(item, stamps, true).length, 3);
  assert.deepEqual(getEmissionSiblings({ ...item, emise: "" }, stamps), []);
});