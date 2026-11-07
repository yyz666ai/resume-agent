import { t } from "./i18n.js";
import React, { useRef } from "react";
import { Camera, Upload, Crop, Trash2 } from "lucide-react";
export default function PhotoSettings({ doc, update, onUpload, onCrop }) {
  const input = useRef();
  return (
    <div className="photo-settings">
      <div className="photo-setting-main">
        <button
          className="photo-upload-preview"
          onClick={() => input.current.click()}
          aria-label={t("上传简历照片")}
        >
          {doc.photo?.dataUrl ? (
            <img src={doc.photo.dataUrl} alt="简历照片" />
          ) : (
            <>
              <Camera size={24} />
              <span>{t("添加照片")}</span>
            </>
          )}
        </button>
        <div>
          <strong>{t("简历照片")}</strong>
          <p>{t("上传后可框选裁剪，照片随简历保存。")}</p>
          <div className="photo-buttons">
            <button onClick={() => input.current.click()}>
              <Upload size={12} />
              {doc.photo ? t("更换") : t("上传照片")}
            </button>
            {doc.photo && (
              <button onClick={() => onCrop(doc.photo.source, doc.photo)}>
                <Crop size={12} />
                {t("重新裁剪")}
              </button>
            )}
          </div>
          {doc.photo && (
            <div className="photo-buttons">
              <label>
                <input
                  type="checkbox"
                  checked={doc.photo.visible}
                  onChange={(e) =>
                    update((d) => {
                      d.photo.visible = e.target.checked;
                    })
                  }
                />
                {t("显示照片")}
              </label>
              <button
                title={t("删除照片")}
                onClick={() =>
                  update((d) => {
                    delete d.photo;
                  })
                }
              >
                <Trash2 size={12} />
                {t("删除")}
              </button>
            </div>
          )}
        </div>
      </div>
      <input
        ref={input}
        hidden
        type="file"
        accept="image/jpeg,image/png,image/webp"
        aria-label={t("选择简历照片")}
        onChange={(e) => {
          if (e.target.files[0]) onUpload(e.target.files[0]);
          e.target.value = "";
        }}
      />
      {doc.photo && (
        <label className="photo-size">
          {t("照片宽度")}
          <span>{doc.photo.width} mm</span>
          <input
            aria-label={t("简历照片宽度")}
            type="range"
            min="18"
            max="42"
            value={doc.photo.width}
            onChange={(e) =>
              update((d) => {
                d.photo.width = Number(e.target.value);
              })
            }
          />
        </label>
      )}
      {doc.photoCandidates?.length > 0 && (
        <details className="pdf-photo-options">
          <summary>
            {t("PDF 中提取的图片（")}
            {doc.photoCandidates.length}）
          </summary>
          <div>
            {doc.photoCandidates.map((candidate) => (
              <button
                key={candidate.id}
                title={t("使用第 " + candidate.page + " 页图片")}
                onClick={() => onCrop(candidate.dataUrl)}
              >
                <img src={candidate.dataUrl} alt={"PDF 图片 " + candidate.id} />
              </button>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
