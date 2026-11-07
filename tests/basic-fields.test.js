import test from "node:test";
import assert from "node:assert/strict";
import { displayBasics } from "../src/basic-fields.js";
import { emptyResume, validateDocument } from "../src/model.js";
test("old personal details display as separate fields without destroying the source", () => {
  const source = { details: "男 生日: 1999/11 籍贯: 北京" };
  const shown = displayBasics(source);
  assert.equal(shown.gender, "男");
  assert.equal(shown.birthday, "1999/11");
  assert.equal(shown.hometown, "北京");
  assert.equal(shown.details, "");
  assert.ok(source.details.includes("生日"));
});
test("old six-module resumes acquire certificates and hidden fields retain values", () => {
  const doc = emptyResume();
  delete doc.sections.certificates;
  doc.order = doc.order.filter((k) => k !== "certificates");
  doc.basics.email = "hello@example.com";
  doc.basicsVisibility = { email: false };
  validateDocument(doc);
  assert.ok(doc.sections.certificates);
  assert.equal(doc.basics.email, "hello@example.com");
  assert.equal(doc.basicsVisibility.email, false);
});
