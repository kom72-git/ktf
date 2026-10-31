import test from "node:test";
import assert from "node:assert/strict";
import {
  getSchemaTFEntries,
  normalizeSchemaTFForStorage,
  resolveSchemaTFImages,
} from "./obrazekCesta.js";

test("schema TF accepts legacy strings and preserves editable empty rows", () => {
  assert.deepEqual(getSchemaTFEntries("1945/123-TF"), ["1945/123-TF"]);
  assert.deepEqual(getSchemaTFEntries(undefined), [""]);
  assert.deepEqual(getSchemaTFEntries([]), [""]);
  assert.deepEqual(getSchemaTFEntries(["first", ""]), ["first", ""]);
});

test("schema TF storage keeps a single string or an ordered list without empty rows", () => {
  assert.equal(normalizeSchemaTFForStorage(" 123-TF ", 1945), "123-TF");
  assert.equal(normalizeSchemaTFForStorage(["", " 123-TF ", " "], 1945), "123-TF");
  assert.equal(normalizeSchemaTFForStorage(["", " "], 1945), "");
  assert.deepEqual(
    normalizeSchemaTFForStorage([" 123-TF ", "", "123-TF2 (n/a)"], 1945),
    ["123-TF", "123-TF2 (n/a)"]
  );
});

test("schema TF resolves every path, URL and unavailable image independently", () => {
  assert.deepEqual(
    resolveSchemaTFImages(["123-TF", "1946/456-TF.png", "https://example.test/tf.jpg", "123-TF2 (n/a)"], "", 1945),
    ["/img/1945/123-TF.jpg", "/img/1946/456-TF.png", "https://example.test/tf.jpg", "/img/no-img.png"]
  );
});

test("schema TF inherits the entire set only when no own image exists", () => {
  const inherited = ["123-TF", "123-TF2"];
  const expected = ["/img/1945/123-TF.jpg", "/img/1945/123-TF2.jpg"];
  for (const empty of [undefined, "", [], ["", " "]]) {
    assert.deepEqual(resolveSchemaTFImages(empty, inherited, 1945), expected);
  }
  assert.deepEqual(resolveSchemaTFImages("own", inherited, 1945), ["/img/1945/own.jpg"]);
  assert.deepEqual(resolveSchemaTFImages(["own", "own2"], inherited, 1945), [
    "/img/1945/own.jpg", "/img/1945/own2.jpg",
  ]);
});

test("NE hides both own and inherited schema TF images", () => {
  assert.deepEqual(resolveSchemaTFImages(" ne ", ["123-TF", "123-TF2"], 1945), []);
  assert.deepEqual(resolveSchemaTFImages(["NE"], "123-TF", 1945), []);
  assert.deepEqual(resolveSchemaTFImages("", "NE", 1945), []);
  assert.deepEqual(resolveSchemaTFImages("", "", 1945), []);
});
