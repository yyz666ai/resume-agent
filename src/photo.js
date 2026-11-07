export const RATIOS = { "3:4": 3 / 4, "1:1": 1, "4:5": 4 / 5 };
export function initialCrop(width, height, ratio = "3:4") {
  const aspect = RATIOS[ratio];
  const w = Math.min(width, height * aspect) * 0.96,
    h = w / aspect;
  return { x: (width - w) / 2, y: (height - h) / 2, width: w, height: h };
}
export function moveCrop(crop, dx, dy, width, height) {
  return {
    ...crop,
    x: Math.max(0, Math.min(width - crop.width, crop.x + dx)),
    y: Math.max(0, Math.min(height - crop.height, crop.y + dy)),
  };
}
export function resizeCrop(crop, newWidth, width, height, ratio) {
  const aspect = RATIOS[ratio];
  const max = Math.min(width - crop.x, (height - crop.y) * aspect);
  const w = Math.max(Math.min(40, max), Math.min(max, newWidth));
  return { ...crop, width: w, height: w / aspect };
}
export function validatePhoto(photo) {
  if (photo == null) return;
  if (
    typeof photo !== "object" ||
    typeof photo.visible !== "boolean" ||
    !RATIOS[photo.ratio] ||
    !Number.isFinite(photo.width) ||
    photo.width < 18 ||
    photo.width > 42
  )
    throw Error("照片配置有误");
  for (const key of ["source", "dataUrl"])
    if (
      typeof photo[key] !== "string" ||
      photo[key].length > 2000000 ||
      !/^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(
        photo[key],
      )
    )
      throw Error("照片格式或大小有误");
  if (photo.crop != null) {
    const c = photo.crop;
    for (const key of ["imageWidth", "imageHeight"])
      if (!Number.isFinite(photo[key]) || photo[key] <= 0 || photo[key] > 20000)
        throw Error("照片尺寸有误");
    for (const key of ["x", "y", "width", "height"])
      if (!Number.isFinite(c[key]) || c[key] < 0)
        throw Error("照片裁剪位置有误");
    if (
      !c.width ||
      !c.height ||
      c.x + c.width > photo.imageWidth + 1 ||
      c.y + c.height > photo.imageHeight + 1
    )
      throw Error("照片裁剪超出边界");
  }
}
export async function preparePhoto(file) {
  if (
    !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
    file.size > 10 * 1024 * 1024
  )
    throw Error("请上传 10 MB 以内的 JPEG、PNG 或 WebP 照片");
  const url = URL.createObjectURL(file);
  try {
    const img = await loadPhoto(url);
    const scale = Math.min(
      1,
      1200 / Math.max(img.naturalWidth, img.naturalHeight),
    );
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.naturalWidth * scale);
    canvas.height = Math.round(img.naturalHeight * scale);
    const c = canvas.getContext("2d");
    c.fillStyle = "#fff";
    c.fillRect(0, 0, canvas.width, canvas.height);
    c.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.9);
  } finally {
    URL.revokeObjectURL(url);
  }
}
export function loadPhoto(source) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(Error("无法读取照片"));
    img.src = source;
  });
}
