import { OPS, ImageKind } from "pdfjs-dist/legacy/build/pdf.mjs";
import { createCanvas, ImageData } from "@napi-rs/canvas";
export async function pageImages(page, pageNumber) {
  const result = [],
    warnings = [],
    seen = new Set();
  const operators = await page.getOperatorList();
  for (let i = 0; i < operators.fnArray.length; i++) {
    if (
      ![
        OPS.paintImageXObject,
        OPS.paintInlineImageXObject,
        OPS.paintImageXObjectRepeat,
      ].includes(operators.fnArray[i])
    )
      continue;
    const arg = operators.argsArray[i][0];
    if (typeof arg === "string" && seen.has(arg)) continue;
    if (typeof arg === "string") seen.add(arg);
    try {
      const image =
        typeof arg === "string"
          ? page.commonObjs.has(arg)
            ? page.commonObjs.get(arg)
            : page.objs.get(arg)
          : arg;
      const { width, height, data, kind } = image;
      if (!width || !height || !data || width * height > 16000000) {
        warnings.push(`第 ${pageNumber} 页有图片过大或无法读取`);
        continue;
      }
      const rgba = new Uint8ClampedArray(width * height * 4);
      for (let pixel = 0; pixel < width * height; pixel++) {
        const out = pixel * 4;
        if (kind === ImageKind.RGB_24BPP) {
          rgba[out] = data[pixel * 3];
          rgba[out + 1] = data[pixel * 3 + 1];
          rgba[out + 2] = data[pixel * 3 + 2];
          rgba[out + 3] = 255;
        } else if (kind === ImageKind.RGBA_32BPP) {
          rgba.set(data.subarray(out, out + 4), out);
        } else if (kind === ImageKind.GRAYSCALE_1BPP) {
          const bit =
            (data[
              Math.floor(pixel / width) * Math.ceil(width / 8) +
                Math.floor((pixel % width) / 8)
            ] >>
              (7 - ((pixel % width) % 8))) &
            1;
          rgba[out] = rgba[out + 1] = rgba[out + 2] = bit ? 255 : 0;
          rgba[out + 3] = 255;
        } else throw Error("unsupported");
      }
      const original = createCanvas(width, height);
      original
        .getContext("2d")
        .putImageData(new ImageData(rgba, width, height), 0, 0);
      const scale = Math.min(1, 1000 / Math.max(width, height));
      const output = createCanvas(
        Math.round(width * scale),
        Math.round(height * scale),
      );
      const context = output.getContext("2d");
      context.fillStyle = "white";
      context.fillRect(0, 0, output.width, output.height);
      context.drawImage(original, 0, 0, output.width, output.height);
      result.push({
        id: `p${pageNumber}-img${result.length + 1}`,
        page: pageNumber,
        width: output.width,
        height: output.height,
        dataUrl: output.toDataURL("image/jpeg", 0.86),
      });
    } catch {
      warnings.push(`第 ${pageNumber} 页有图片未能提取`);
    }
  }
  return { images: result, warnings };
}
export function photoFromCandidate(image) {
  return {
    source: image.dataUrl,
    dataUrl: image.dataUrl,
    width: 28,
    ratio:
      image.width / image.height > 0.9 && image.width / image.height < 1.1
        ? "1:1"
        : "3:4",
    visible: true,
    imageWidth: image.width,
    imageHeight: image.height,
    crop: null,
  };
}
