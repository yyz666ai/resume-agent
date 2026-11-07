import test from "node:test";
import assert from "node:assert/strict";
import {
  parseResume,
  validateDocument,
  applyProposal,
  emptyResume,
} from "../src/model.js";
test("imports Chinese sections without dropping text", () => {
  const d = parseResume(
    "张三\n求职意向：产品经理\n教育经历\n某大学 2020-2024\n工作经历\n某公司\n完成产品设计\n专业技能\nPython、SQL",
  );
  assert.equal(d.basics.name, "张三");
  assert.ok(d.sections.education.items[0].body.includes("某大学"));
  assert.ok(d.sections.experience.items[0].body.includes("完成产品设计"));
  assert.ok(d.sections.skills.items[0].body.includes("SQL"));
});
test("rejects malformed backup", () =>
  assert.throws(() => validateDocument({ basics: { name: "x" } })));
test("rejects edits outside selected section and unsupported keys", () => {
  const d = emptyResume();
  assert.throws(() =>
    applyProposal(
      d,
      { changes: [{ section: "education", items: [] }] },
      "experience",
    ),
  );
  assert.throws(() =>
    applyProposal(d, { changes: [{ section: "__proto__", items: [] }] }, "all"),
  );
});
test("applies changes without mutating source", () => {
  const d = emptyResume();
  const n = applyProposal(
    d,
    {
      changes: [
        {
          section: "summary",
          items: [{ title: "优势", subtitle: "", date: "", body: "有经验" }],
        },
      ],
    },
    "summary",
  );
  assert.equal(n.sections.summary.items[0].body, "有经验");
  assert.equal(d.sections.summary.items.length, 0);
});
test("rejects invalid typography and malformed optional personal details", () => {
  const d = emptyResume();
  assert.throws(() =>
    applyProposal(d, { changes: [], style: { fontSize: 100 } }, "all"),
  );
  const malformed = emptyResume();
  malformed.basics.details = { text: "x" };
  assert.throws(() => validateDocument(malformed));
});
test("keeps imported contact details out of the personal summary", () => {
  const d = parseResume(
    "张三\n男 | 生日: 1999/11 | 13800000000\n期望城市: 北京\n工作经历\n某公司",
  );
  assert.equal(d.basics.city, "北京");
  assert.equal(d.sections.summary.items.length, 0);
  assert.ok(d.basics.details.includes("生日"));
});
