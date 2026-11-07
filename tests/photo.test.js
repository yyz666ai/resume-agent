import test from "node:test";
import assert from "node:assert/strict";
import {
  initialCrop,
  moveCrop,
  resizeCrop,
  validatePhoto,
} from "../src/photo.js";
test("crop retains ratio and stays inside portrait bounds when moved or resized", () => {
  const c = initialCrop(1400, 1800);
  assert.ok(Math.abs(c.width / c.height - 0.75) < 0.001);
  const moved = moveCrop(c, 9000, -9000, 1400, 1800);
  assert.equal(moved.y, 0);
  assert.ok(moved.x + moved.width <= 1400);
  const resized = resizeCrop(moved, 9000, 1400, 1800, "3:4");
  assert.ok(resized.width + resized.x <= 1400);
  assert.ok(resized.height + resized.y <= 1800);
});
test("rejects remote or executable photo payloads", () => {
  assert.throws(() =>
    validatePhoto({
      visible: true,
      width: 28,
      ratio: "3:4",
      source: "https://example.com/x.png",
      dataUrl: "data:image/svg+xml;base64,abcd",
    }),
  );
});
