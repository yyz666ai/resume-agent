import test from "node:test";
import assert from "node:assert/strict";
import {
  emptyResume,
  demoResume,
  parseResume,
  validateDocument,
  item,
} from "../src/model.js";
const first = ["education", "experience", "projects"];
test("new, demo and PDF-parsed documents start with education, experience, projects", () => {
  for (const d of [
    emptyResume(),
    demoResume(),
    parseResume("测试姓名\n工作经历\n测试公司\n教育经历\n测试大学"),
  ])
    assert.deepEqual(d.order.slice(0, 3), first);
});
test("old documents migrate once without losing entries or custom sections, later manual order is retained", () => {
  const d = demoResume();
  d.order = [
    "summary",
    "experience",
    "projects",
    "education",
    "skills",
    "awards",
    "certificates",
  ];
  delete d.sectionOrderVersion;
  d.sections.custom_extra = {
    label: "其他经历",
    visible: true,
    items: [item("真实事实", "原文不改")],
  };
  d.order.splice(2, 0, "custom_extra");
  const before = structuredClone(d.sections);
  validateDocument(d);
  assert.deepEqual(d.order.slice(0, 3), first);
  assert.deepEqual(d.sections, before);
  assert.ok(d.order.includes("custom_extra"));
  d.order.reverse();
  const chosen = [...d.order];
  validateDocument(d);
  assert.deepEqual(d.order, chosen);
});
