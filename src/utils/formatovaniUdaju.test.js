import test from "node:test";
import assert from "node:assert/strict";
import { formatStampApprovalDate } from "./formatovaniUdaju.js";

test("stamp approval date uses a zero-padded day and Roman month in Prague time", () => {
  assert.equal(formatStampApprovalDate("2026-11-04T12:00:00.000Z"), "04.XI.2026");
});

test("stamp approval date follows the Prague calendar date near midnight", () => {
  assert.equal(formatStampApprovalDate("2026-11-04T23:30:00.000Z"), "05.XI.2026");
});

test("missing and invalid stamp approval dates render as empty", () => {
  assert.equal(formatStampApprovalDate(null), "");
  assert.equal(formatStampApprovalDate("not-a-date"), "");
});