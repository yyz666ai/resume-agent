import { t } from "./i18n.js";
import React, { useState } from "react";
import { X, Star, Check } from "lucide-react";
import { RichEditor } from "./Editor.jsx";
export default function PreviewEditor({
  doc,
  target,
  onClose,
  onSave,
  onQuote,
}) {
  const section = target.section;
  const entry =
    section === "basics"
      ? doc.basics
      : doc.sections[section].items.find((e) => e.id === target.entryId);
  const [draft, setDraft] = useState(() => structuredClone(entry));
  const label = section === "basics" ? "基本信息" : doc.sections[section].label;
  const field = (key, title) => (
    <label className="field" key={key}>
      <span>{t(title)}</span>
      <input
        aria-label={t("预览编辑 " + title)}
        value={draft[key] || ""}
        onChange={(e) =>
          setDraft({
            ...draft,
            [key]: e.target.value,
          })
        }
      />
    </label>
  );
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          onSave(draft);
          onClose();
        }
      }}
    >
      <section
        className="preview-edit-modal"
        role="dialog"
        aria-label={t("编辑" + label)}
      >
        <header>
          <div>
            <span className="eyebrow">EDIT IN PLACE</span>
            <h2>
              {t("编辑")}
              {t(label)}
            </h2>
          </div>
          <button
            className="icon-button"
            aria-label={t("关闭预览编辑")}
            onClick={() => {
              onSave(draft);
              onClose();
            }}
          >
            <X size={18} />
          </button>
        </header>
        {target.text && (
          <blockquote>
            {t("选中：")}
            {target.text.slice(0, 200)}
          </blockquote>
        )}
        <div className="fields">
          {section === "basics"
            ? [
                ["name", "姓名"],
                ["role", "求职意向"],
                ["phone", "手机号码"],
                ["email", "电子邮箱"],
                ["city", "期望城市"],
                ["website", "个人网站"],
                ["details", "其他信息"],
              ].map(([k, v]) => field(k, v))
            : [
                ["title", "标题"],
                ["subtitle", "职位 / 专业"],
                ["date", "起止时间"],
              ].map(([k, v]) => field(k, v))}
        </div>
        {section !== "basics" && (
          <>
            <p className="muted">
              {t("直接修改此条目的完整内容，保存后会重新排版。")}
            </p>
            <RichEditor
              value={draft.body}
              onChange={(value) =>
                setDraft((d) => ({
                  ...d,
                  body: value,
                }))
              }
            />
          </>
        )}
        <footer>
          <button
            className="secondary"
            onClick={() => {
              onSave(draft);
              onQuote(target);
              onClose();
            }}
          >
            <Star size={14} />
            {t("交给助手修改")}
          </button>
        </footer>
      </section>
    </div>
  );
}
