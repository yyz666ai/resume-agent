export const IMAGE_MODELS = [
  "deepseek-flash",
  "deepseek-v4-flash",
  "deepseek-v4-flash-vision-exp",
];
export const supportsImages = (model) => IMAGE_MODELS.includes(model);
export const MAX_IMAGES = 2;
export const MAX_IMAGE_BYTES = 3 * 1024 * 1024;
