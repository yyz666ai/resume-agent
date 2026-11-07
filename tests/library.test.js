import test from "node:test";
import assert from "node:assert/strict";
import {
  LIBRARY_KEY,
  loadLibrary,
  saveActive,
  addResume,
  removeResume,
  activeDocument,
} from "../src/library.js";
import { emptyResume } from "../src/model.js";
const storage = (values = {}) => ({
  getItem: (k) => values[k] || null,
  setItem: (k, v) => (values[k] = v),
});
test("migrates existing resume and preserves each edited version", () => {
  const original = emptyResume();
  original.basics.name = "甲";
  const lib = loadLibrary(
    storage({ "zhijian.resume.v1": JSON.stringify(original) }),
  );
  assert.equal(activeDocument(lib).basics.name, "甲");
  const added = addResume(lib, emptyResume(), "第二份");
  const edited = emptyResume();
  edited.basics.name = "乙";
  const saved = saveActive(added, edited);
  assert.equal(activeDocument(saved).basics.name, "乙");
  assert.equal(saved.entries[0].document.basics.name, "甲");
  assert.equal(added.entries[1].document.basics.name, "");
});
test("deleting active resume selects remaining one and last delete stays empty after reload", () => {
  const lib = loadLibrary(storage());
  const added = addResume(lib, emptyResume());
  const removed = removeResume(added, added.activeId);
  assert.equal(removed.entries.length, 1);
  assert.equal(removed.activeId, lib.activeId);
  const last = removeResume(removed, removed.activeId);
  assert.equal(last.entries.length, 0);
  assert.equal(last.activeId, null);
  assert.deepEqual(loadLibrary(storage({
    [LIBRARY_KEY]: JSON.stringify(last),
    "zhijian.resume.v1": JSON.stringify(activeDocument(lib)),
  })), last);
  assert.equal(addResume(last).entries.length, 1);
});
