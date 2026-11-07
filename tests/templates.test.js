import test from "node:test";
import assert from "node:assert/strict";
import { TEMPLATES, templateStyle } from "../src/templates.js";
import { demoResume, validateDocument } from "../src/model.js";
test("all ten template presets validate and preserve resume content", () => {
  const doc = demoResume();
  assert.equal(TEMPLATES.length, 10);
  assert.equal(new Set(TEMPLATES.map((t) => t.id)).size, 10);
  for (const t of TEMPLATES) {
    const next = structuredClone(doc);
    Object.assign(next.style, templateStyle(t.id));
    validateDocument(next);
    assert.deepEqual(next.sections, doc.sections);
    assert.deepEqual(next.basics, doc.basics);
  }
});

test("old reference documents migrate to Classic without losing formatting or content", () => {
  const doc = demoResume();
  const contents = structuredClone(doc.sections);
  doc.style = { ...doc.style, template: "reference", fontSize: 14, margin: 12 };
  validateDocument(doc);
  assert.equal(doc.style.template, "classic");
  assert.equal(doc.style.fontSize, 14);
  assert.equal(doc.style.margin, 12);
  assert.deepEqual(doc.sections, contents);
});
