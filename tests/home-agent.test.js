import test from "node:test";
import assert from "node:assert/strict";
import { demoResume, DEFAULT_STYLE } from "../src/model.js";
import {
  initialAgentDocument,
  automaticResumeTitle,
} from "../src/home-agent.js";
import { resumePrompt } from "../server/prompts.js";
test("home agent starts a separate document in basic layout and preserves content", () => {
  const source = demoResume();
  source.style.lineHeight = 2.1;
  source.style.template = "sidebar";
  const copy = initialAgentDocument(source);
  assert.deepEqual(copy.sections, source.sections);
  assert.deepEqual(copy.style, DEFAULT_STYLE);
  copy.basics.name = "新版本";
  assert.notEqual(source.basics.name, "新版本");
});
test("auto naming uses the actual name and target role with safe fallbacks", () => {
  const document = demoResume();
  document.basics.name = "测试";
  document.basics.role = "产品经理";
  assert.match(automaticResumeTitle(document), /测试.*产品经理/);
  assert.equal(
    automaticResumeTitle(document, "", "岗位版本\n定制"),
    "岗位版本 定制",
  );
  assert.equal(automaticResumeTitle(document, "", "x".repeat(100)).length, 80);
});
test("home workflow requests automatic naming while ordinary editor prompts do not", () => {
  const args = { document: demoResume(), prompt: "润色", scope: "all" };
  assert.ok(
    resumePrompt({ ...args, workflow: "home" }).includes("resumeTitle"),
  );
  assert.ok(!resumePrompt(args).includes("resumeTitle"));
});

test("English interface adds an English response instruction without changing the source", () => {
  const document = demoResume();
  const args = { document, prompt: "润色", scope: "experience" };
  assert.match(resumePrompt({ ...args, language: "en" }), /用英文输出/);
  assert.doesNotMatch(resumePrompt({ ...args, language: "zh" }), /用英文输出/);
  assert.equal(document.basics.name, "林知远");
});
