import { MAX_IMAGES, MAX_IMAGE_BYTES } from "../src/capabilities.js";
export function imageBlocks(images = []) {
  if (!Array.isArray(images) || images.length > MAX_IMAGES)
    throw Error("最多上传 2 张图片");
  return images.map((image) => {
    if (
      !image ||
      !["image/png", "image/jpeg", "image/webp"].includes(image.mimeType) ||
      typeof image.data !== "string" ||
      image.data.length > MAX_IMAGE_BYTES * 1.34
    )
      throw Error("图片格式或大小有误，请使用 3 MB 以内的 PNG、JPEG 或 WebP");
    const data = Buffer.from(image.data, "base64");
    if (
      !data.length ||
      data.length > MAX_IMAGE_BYTES ||
      data.toString("base64") !== image.data
    )
      throw Error("图片内容无效或超过 3 MB");
    const type = image.mimeType;
    const valid =
      type === "image/png"
        ? data
            .subarray(0, 8)
            .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
        : type === "image/jpeg"
          ? data[0] === 255 && data[1] === 216 && data[2] === 255
          : data.toString("ascii", 0, 4) === "RIFF" &&
            data.toString("ascii", 8, 12) === "WEBP";
    if (!valid) throw Error("图片内容与文件类型不符");
    return { type: "image", data: image.data, mimeType: type };
  });
}
