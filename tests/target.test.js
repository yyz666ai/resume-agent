import test from "node:test";
import assert from "node:assert/strict";
import { constrainTarget } from "../server/target.js";
import { demoResume, applyProposal } from "../src/model.js";
test("targeted edit preserves other entries and other sections", () => {
  const d = demoResume();
  const target = {
    section: "experience",
    entryId: d.sections.experience.items[0].id,
  };
  const updated = { ...d.sections.experience.items[0], body: "只更新这里" };
  const p = constrainTarget(
    d,
    { changes: [{ section: "experience", items: [updated] }] },
    target,
  );
  const next = applyProposal(d, p, "experience");
  assert.equal(next.sections.experience.items[0].body, "只更新这里");
  assert.deepEqual(
    next.sections.experience.items[1],
    d.sections.experience.items[1],
  );
  assert.deepEqual(next.sections.education, d.sections.education);
  assert.notEqual(d.sections.experience.items[0].body, "只更新这里");
});
test("rejects out-of-target modifications", () => {
  const d = demoResume();
  const t = {
    section: "experience",
    entryId: d.sections.experience.items[0].id,
  };
  assert.throws(() =>
    constrainTarget(d, { changes: [{ section: "education", items: [{}] }] }, t),
  );
  assert.throws(() =>
    constrainTarget(d, { changes: [], style: { fontSize: 12 } }, t),
  );
});
test("targeted formatting affects only the chosen entry", () => {
  const d = demoResume();
  const target = {
    section: "experience",
    entryId: d.sections.experience.items[0].id,
  };
  const p = constrainTarget(
    d,
    {
      changes: [],
      entryStyles: [
        {
          section: "experience",
          entryId: target.entryId,
          style: { titleBold: false, lineHeight: 1.8 },
        },
      ],
    },
    target,
  );
  const next = applyProposal(d, p, "experience");
  assert.equal(next.sections.experience.items[0].format.titleBold, false);
  assert.deepEqual(
    next.sections.experience.items[1],
    d.sections.experience.items[1],
  );
  assert.throws(() =>
    constrainTarget(
      d,
      {
        changes: [],
        entryStyles: [
          {
            section: "experience",
            entryId: d.sections.experience.items[1].id,
            style: { titleBold: true },
          },
        ],
      },
      target,
    ),
  );
});
