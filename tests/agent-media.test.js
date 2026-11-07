import test from "node:test";
import assert from "node:assert/strict";
import { imageBlocks } from "../server/images.js";
import { resumePrompt } from "../server/prompts.js";
import { supportsImages } from "../src/capabilities.js";
test("accepts PNG content blocks and rejects mismatched or excessive images", () => {
  const image = {
    mimeType: "image/png",
    data: Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 0]).toString("base64"),
  };
  assert.equal(imageBlocks([image])[0].type, "image");
  assert.throws(() => imageBlocks([image, image, image]));
  assert.throws(() => imageBlocks([{ ...image, mimeType: "image/jpeg" }]));
  assert.throws(() => imageBlocks([{ ...image, data: "invalid" }]));
  assert.equal(supportsImages("deepseek-flash"), true);
  assert.equal(supportsImages("deepseek-v4-pro"), false);
});
test("each request includes resume skill, scope and structured output requirements", () => {
  const text = resumePrompt({
    document: {},
    prompt: "润色工作经历",
    scope: "experience",
  });
  for (const phrase of [
    "不编造",
    "岗位描述",
    "高亮文字",
    "图片",
    "changes",
    "experience",
  ])
    assert.ok(text.includes(phrase));
});
test("does not inline private portrait bytes into text prompts", () => {
  const text = resumePrompt({
    document: {
      basics: { name: "测试" },
      photo: {
        source: "PRIVATE_SOURCE_BYTES",
        dataUrl: "PRIVATE_CROP_BYTES",
        visible: true,
        width: 28,
        ratio: "3:4",
      },
      photoCandidates: [{ dataUrl: "PRIVATE_PDF_IMAGE" }],
    },
    prompt: "润色",
    scope: "all",
  });
  assert.ok(!text.includes("PRIVATE_"));
  assert.ok(text.includes("3:4"));
});
