import test from "node:test";
import assert from "node:assert/strict";
import {
  emptyResume,
  applyProposal,
  validateDocument,
  addSection,
  removeSection,
} from "../src/model.js";
test("custom modules roundtrip and delete without changing built-in modules", () => {
  const d = emptyResume();
  const key = addSection(d, "志愿经历");
  assert.equal(d.sections[key].label, "志愿经历");
  validateDocument(JSON.parse(JSON.stringify(d)));
  removeSection(d, key);
  validateDocument(d);
  assert.equal(d.order.length, 7);
  assert.throws(() => addSection(d, "恶意", "__proto__"));
});
test("agent can add a module, set global spacing and specific heading formatting", () => {
  const d = emptyResume();
  const n = applyProposal(
    d,
    {
      changes: [],
      sections: [
        {
          action: "add",
          id: "custom_research",
          label: "科研经历",
          items: [{ title: "论文", subtitle: "", date: "", body: "研究工作" }],
        },
      ],
      style: { lineHeight: 1.8 },
      sectionStyles: [
        {
          section: "custom_research",
          style: { titleBold: true, entryTitleBold: false, lineHeight: 1.7 },
        },
      ],
    },
    "all",
  );
  assert.equal(n.sections.custom_research.items[0].title, "论文");
  assert.equal(n.style.lineHeight, 1.8);
  assert.equal(n.sections.custom_research.format.entryTitleBold, false);
  assert.equal(d.order.length, 7);
});
test("module operations and formatting cannot bypass scope", () => {
  assert.throws(() =>
    applyProposal(
      emptyResume(),
      {
        changes: [],
        sections: [{ action: "add", id: "custom_x", label: "其他" }],
      },
      "experience",
    ),
  );
  assert.throws(() =>
    applyProposal(
      emptyResume(),
      {
        changes: [],
        sectionStyles: [{ section: "education", style: { titleBold: true } }],
      },
      "experience",
    ),
  );
  assert.throws(() =>
    applyProposal(
      emptyResume(),
      {
        changes: [],
        sectionStyles: [{ section: "experience", style: { color: "red" } }],
      },
      "all",
    ),
  );
});
test("empty added module receives an editable blank entry", () => {
  const d = applyProposal(
    emptyResume(),
    {
      changes: [],
      sections: [
        { action: "add", id: "custom_blank", label: "其他", items: [] },
      ],
    },
    "all",
  );
  assert.equal(d.sections.custom_blank.items.length, 1);
});
