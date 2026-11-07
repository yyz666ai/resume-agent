import { t } from "./i18n.js";
import React, { useEffect, useRef, useState } from "react";
import { X, Check, Move, Crop } from "lucide-react";
import {
  initialCrop,
  moveCrop,
  resizeCrop,
  loadPhoto,
  RATIOS,
} from "./photo.js";
export default function PhotoCropper({ source, photo, onSave, onClose }) {
  const [image, setImage] = useState(null),
    [ratio, setRatio] = useState(photo?.ratio || "3:4"),
    [crop, setCrop] = useState(null),
    [error, setError] = useState(""),
    [stageWidth, setStageWidth] = useState(420);
  const stage = useRef(),
    drag = useRef(null);
  const height = 380;
  useEffect(() => {
    let cancelled = false;
    loadPhoto(source)
      .then((img) => {
        if (cancelled) return;
        setImage(img);
        const saved = photo?.source === source && photo?.crop;
        setCrop(
          saved || initialCrop(img.naturalWidth, img.naturalHeight, ratio),
        );
      })
      .catch((e) => setError(e.message));
    return () => {
      cancelled = true;
    };
  }, [source]);
  useEffect(() => {
    const ob = new ResizeObserver(([entry]) =>
      setStageWidth(entry.contentRect.width),
    );
    if (stage.current) ob.observe(stage.current);
    return () => ob.disconnect();
  }, []);
  const scale = image
    ? Math.min(stageWidth / image.naturalWidth, height / image.naturalHeight)
    : 1;
  const left = image ? (stageWidth - image.naturalWidth * scale) / 2 : 0,
    top = image ? (height - image.naturalHeight * scale) / 2 : 0;
  function start(e, type) {
    e.preventDefault();
    e.stopPropagation();
    drag.current = {
      type,
      x: e.clientX,
      y: e.clientY,
      crop: {
        ...crop,
      },
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function changeRatio(value) {
    setRatio(value);
    setCrop(initialCrop(image.naturalWidth, image.naturalHeight, value));
  }
  function save() {
    const canvas = document.createElement("canvas");
    canvas.width = 360;
    canvas.height = Math.round(360 / RATIOS[ratio]);
    const context = canvas.getContext("2d");
    context.fillStyle = "white";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(
      image,
      crop.x,
      crop.y,
      crop.width,
      crop.height,
      0,
      0,
      canvas.width,
      canvas.height,
    );
    onSave({
      source,
      dataUrl: canvas.toDataURL("image/jpeg", 0.92),
      visible: true,
      width: photo?.width || 28,
      ratio,
      crop,
      imageWidth: image.naturalWidth,
      imageHeight: image.naturalHeight,
    });
  }
  return (
    <div className="modal-backdrop photo-crop-layer">
      <section
        className="photo-crop-modal"
        role="dialog"
        aria-label={t("裁剪简历照片")}
      >
        <header>
          <div>
            <span className="eyebrow">YOUR PORTRAIT</span>
            <h2>{t("裁剪简历照片")}</h2>
          </div>
          <button
            className="icon-button"
            aria-label={t("关闭照片裁剪")}
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </header>
        <p>
          {t(
            "拖动选框调整位置，拖动右下角调整大小。照片按选框裁剪，保留原始画面。",
          )}
        </p>
        <div
          className="crop-stage"
          ref={stage}
          style={{
            height,
          }}
          onPointerMove={(e) => {
            if (!drag.current || !image) return;
            const dx = (e.clientX - drag.current.x) / scale,
              dy = (e.clientY - drag.current.y) / scale;
            setCrop(
              drag.current.type === "move"
                ? moveCrop(
                    drag.current.crop,
                    dx,
                    dy,
                    image.naturalWidth,
                    image.naturalHeight,
                  )
                : resizeCrop(
                    drag.current.crop,
                    drag.current.crop.width + dx,
                    image.naturalWidth,
                    image.naturalHeight,
                    ratio,
                  ),
            );
          }}
          onPointerUp={() => (drag.current = null)}
          onPointerCancel={() => (drag.current = null)}
        >
          {image && crop && (
            <>
              <img
                src={source}
                alt="待裁剪的照片"
                draggable={false}
                style={{
                  left,
                  top,
                  width: image.naturalWidth * scale,
                  height: image.naturalHeight * scale,
                }}
              />
              <div
                className="crop-frame"
                aria-label={t("照片裁剪选框")}
                style={{
                  left: left + crop.x * scale,
                  top: top + crop.y * scale,
                  width: crop.width * scale,
                  height: crop.height * scale,
                }}
                onPointerDown={(e) => start(e, "move")}
              >
                <span>
                  <Move size={17} />
                </span>
                <button
                  className="crop-resize"
                  aria-label={t("调整裁剪框大小")}
                  onPointerDown={(e) => start(e, "resize")}
                >
                  <Crop size={14} />
                </button>
              </div>
            </>
          )}
        </div>
        {error && <p role="alert">{error}</p>}
        <div className="crop-controls">
          <label>
            {t("照片比例")}
            <select
              aria-label={t("照片裁剪比例")}
              value={ratio}
              disabled={!image}
              onChange={(e) => changeRatio(e.target.value)}
            >
              <option value="3:4">{t("3:4 · 证件照")}</option>
              <option value="1:1">{t("1:1 · 方形")}</option>
              <option value="4:5">{t("4:5 · 人像")}</option>
            </select>
          </label>
          {crop && image && (
            <label>
              {t("裁剪范围")}
              <input
                aria-label={t("照片裁剪范围")}
                type="range"
                min="25"
                max="100"
                value={Math.round(
                  (crop.width /
                    Math.min(
                      image.naturalWidth,
                      image.naturalHeight * RATIOS[ratio],
                    )) *
                    100,
                )}
                onChange={(e) => {
                  const w =
                      (Math.min(
                        image.naturalWidth,
                        image.naturalHeight * RATIOS[ratio],
                      ) *
                        Number(e.target.value)) /
                      100,
                    h = w / RATIOS[ratio],
                    centerX = crop.x + crop.width / 2,
                    centerY = crop.y + crop.height / 2;
                  setCrop({
                    x: Math.max(
                      0,
                      Math.min(image.naturalWidth - w, centerX - w / 2),
                    ),
                    y: Math.max(
                      0,
                      Math.min(image.naturalHeight - h, centerY - h / 2),
                    ),
                    width: w,
                    height: h,
                  });
                }}
              />
            </label>
          )}
        </div>
        <footer>
          <button className="secondary" onClick={onClose}>
            {t("取消")}
          </button>
          <button className="primary" disabled={!image || !crop} onClick={save}>
            <Check size={14} />
            {t("确认裁剪并使用")}
          </button>
        </footer>
      </section>
    </div>
  );
}
