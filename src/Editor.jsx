import { t } from "./i18n.js";
import React, { useEffect, useRef, useMemo, useState } from "react";
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  GripVertical,
  Eye,
  EyeOff,
  ArrowUp,
  ArrowDown,
  Link,
} from "lucide-react";
import {
  MODULES,
  item,
  demoResume,
  addSection,
  removeSection,
  isCustomSection,
} from "./model.js";
import TagsEditor from "./TagsEditor.jsx";
import BasicInfo from "./BasicInfo.jsx";
import PhotoSettings from "./PhotoSettings.jsx";
import Resume, { safeHtml } from "./Resume.jsx";
import { TEMPLATES, templateStyle } from "./templates.js";
export function RichEditor({ value, onChange }) {
  const ref = useRef(null);
  useEffect(() => {
    if (
      document.activeElement !== ref.current &&
      ref.current.innerHTML !== safeHtml(value)
    )
      ref.current.innerHTML = safeHtml(value);
  }, [value]);
  const command = (cmd, arg) => {
    ref.current.focus();
    document.execCommand(cmd, false, arg);
    onChange(safeHtml(ref.current.innerHTML));
  };
  return (
    <div className="rich-editor">
      <div className="rich-tools">
        {[
          [Bold, "bold", "加粗"],
          [Italic, "italic", "斜体"],
          [List, "insertUnorderedList", "项目符号"],
          [ListOrdered, "insertOrderedList", "编号列表"],
        ].map(([Icon, c, toolLabel]) => (
          <button
            key={c}
            title={t(toolLabel)}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => command(c)}
          >
            <Icon size={14} />
          </button>
        ))}
        <span />
        <button
          title={t("添加链接")}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            const url = prompt("输入完整链接（https://）");
            if (url && /^https?:\/\//i.test(url)) command("createLink", url);
          }}
        >
          <Link size={14} />
        </button>
      </div>
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-label={t("详细描述")}
        className="rich-input"
        onInput={() => onChange(safeHtml(ref.current.innerHTML))}
        onPaste={(e) => {
          e.preventDefault();
          command("insertText", e.clipboardData.getData("text/plain"));
        }}
      />
    </div>
  );
}
function Field({ label, value, onChange, wide = false, placeholder = "" }) {
  return (
    <label className={"field " + (wide ? "wide" : "")}>
      <span>{t(label)}</span>
      <input
        value={value}
        placeholder={t(placeholder)}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}
export default function Editor({
  doc,
  update,
  selected,
  setSelected,
  onUploadPhoto,
  onCropPhoto,
}) {
  const [adding, setAdding] = useState(false),
    [newLabel, setNewLabel] = useState(""),
    [addError, setAddError] = useState("");
  function createModule() {
    try {
      let key;
      update((d) => {
        key = addSection(d, newLabel);
      });
      setSelected(key);
      setAdding(false);
      setNewLabel("");
      setAddError("");
      setTimeout(
        () =>
          document.getElementById("editor-" + key)?.scrollIntoView({
            block: "start",
            behavior: "smooth",
          }),
        50,
      );
    } catch (e) {
      setAddError(e.message);
    }
  }
  const changeBasic = (key, val) =>
    update((d) => {
      d.basics[key] = val;
    });
  const changeItem = (key, index, field, val) =>
    update((d) => {
      d.sections[key].items[index][field] = val;
    });
  return (
    <>
      <div className="editor-intro" hidden>
        <span className="eyebrow">MAKE IT YOURS</span>
        <h2>{t("每一段经历，都值得被看见。")}</h2>
        <p>{t("专注内容，轻松排版。")}</p>
      </div>
      <div className="module-list">
        <section
          className={"module " + (selected === "basics" ? "is-open" : "")}
        >
          <button
            className="module-heading"
            onClick={() => setSelected(selected === "basics" ? "" : "basics")}
          >
            <span className="module-number">01</span>
            <strong>{t("基本信息")}</strong>
            <span className="module-status">{t("必填")}</span>
            {selected === "basics" ? (
              <ChevronUp size={16} />
            ) : (
              <ChevronDown size={16} />
            )}
          </button>
          {selected === "basics" && (
            <div className="module-body">
              <BasicInfo
                doc={doc}
                update={update}
                onUpload={onUploadPhoto}
                onCrop={onCropPhoto}
              />
            </div>
          )}
        </section>
        {doc.order.map((key, pos) => {
          const s = doc.sections[key],
            open = selected === key;
          return (
            <section
              id={"editor-" + key}
              className={
                "module " +
                (open ? "is-open" : "") +
                (!s.visible ? " is-hidden" : "")
              }
              key={key}
            >
              <div className="module-heading">
                <button
                  className="module-title-button"
                  onClick={() => setSelected(open ? "" : key)}
                >
                  <span className="module-number">
                    {String(pos + 2).padStart(2, "0")}
                  </span>
                  <strong>{t(s.label)}</strong>
                  <span className="item-count">{s.items.length}</span>
                </button>
                <button
                  className="icon-button"
                  title={t(s.visible ? t("隐藏模块") : t("显示模块"))}
                  onClick={() =>
                    update((d) => {
                      d.sections[key].visible = !s.visible;
                    })
                  }
                >
                  {s.visible ? <Eye size={14} /> : <EyeOff size={14} />}
                </button>
                <button
                  className="icon-button"
                  title={t("向上移动模块")}
                  disabled={pos === 0}
                  onClick={() =>
                    update((d) => {
                      [d.order[pos - 1], d.order[pos]] = [
                        d.order[pos],
                        d.order[pos - 1],
                      ];
                    })
                  }
                >
                  <ArrowUp size={14} />
                </button>
                <button
                  className="icon-button"
                  title={t("向下移动模块")}
                  disabled={pos === doc.order.length - 1}
                  onClick={() =>
                    update((d) => {
                      [d.order[pos + 1], d.order[pos]] = [
                        d.order[pos],
                        d.order[pos + 1],
                      ];
                    })
                  }
                >
                  <ArrowDown size={14} />
                </button>
                <button
                  className="icon-button"
                  title={t(open ? t("收起") : t("展开"))}
                  onClick={() => setSelected(open ? "" : key)}
                >
                  {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
              </div>
              {open && (
                <div className="module-body">
                  <p className="module-hint">
                    {MODULES.find((x) => x[0] === key)?.[2] ||
                      "添加该模块的标题、时间与详细内容"}
                  </p>
                  <details className="module-format-controls">
                    <summary>{t("模块格式")}</summary>
                    <div>
                      {[
                        ["titleBold", "模块标题加粗", true],
                        ["entryTitleBold", "条目标题加粗", true],
                        ["subtitleBold", "职位 / 专业加粗", false],
                      ].map(([field, label, fallback]) => (
                        <label key={field}>
                          <input
                            type="checkbox"
                            checked={s.format?.[field] ?? fallback}
                            onChange={(event) =>
                              update((d) => {
                                d.sections[key].format = {
                                  ...d.sections[key].format,
                                  [field]: event.target.checked,
                                };
                              })
                            }
                          />
                          {t(label)}
                        </label>
                      ))}
                      <label className="module-line-height">
                        {t("本模块行距")}{" "}
                        <b>
                          {Math.round(
                            (s.format?.lineHeight || doc.style.lineHeight) *
                              100,
                          ) / 100}
                        </b>
                        <input
                          aria-label={t(s.label + "行距")}
                          type="range"
                          min="1.2"
                          max="2.2"
                          step="0.05"
                          value={s.format?.lineHeight || doc.style.lineHeight}
                          onChange={(event) =>
                            update((d) => {
                              d.sections[key].format = {
                                ...d.sections[key].format,
                                lineHeight: Number(event.target.value),
                              };
                            })
                          }
                        />
                      </label>
                      <button
                        onClick={() =>
                          update((d) => {
                            delete d.sections[key].format;
                          })
                        }
                      >
                        {t("恢复模板格式")}
                      </button>
                      {isCustomSection(key) && (
                        <button
                          onClick={() => {
                            const label = prompt("模块名称", s.label);
                            if (label?.trim())
                              update((d) => {
                                d.sections[key].label = label
                                  .trim()
                                  .slice(0, 30);
                              });
                          }}
                        >
                          {t("重命名模块")}
                        </button>
                      )}
                    </div>
                  </details>
                  {!s.visible && (
                    <div className="inline-note">
                      {t("该模块已隐藏，点击眼睛图标可重新显示。")}
                    </div>
                  )}
                  {["awards", "certificates"].includes(key) ||
                  /荣誉|证书/.test(s.label) ? (
                    <TagsEditor section={s} sectionKey={key} update={update} />
                  ) : (
                    s.items.map((e, index) => (
                      <div className="entry-editor" key={e.id}>
                        <div className="entry-editor-top">
                          <span>
                            <GripVertical size={13} /> {t(s.label)} {index + 1}
                          </span>
                          <div>
                            <button
                              className="icon-button"
                              title={t("上移条目")}
                              disabled={index === 0}
                              onClick={() =>
                                update((d) => {
                                  const a = d.sections[key].items;
                                  [a[index - 1], a[index]] = [
                                    a[index],
                                    a[index - 1],
                                  ];
                                })
                              }
                            >
                              <ArrowUp size={13} />
                            </button>
                            <button
                              className="icon-button danger"
                              title={t("删除条目")}
                              onClick={() =>
                                update((d) => {
                                  d.sections[key].items.splice(index, 1);
                                })
                              }
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                        <div className="fields">
                          <Field
                            wide
                            label={
                              key === "education"
                                ? t("学校")
                                : key === "experience"
                                  ? t("公司 / 单位")
                                  : key === "projects"
                                    ? t("项目名称")
                                    : t("标题（可选）")
                            }
                            value={e.title}
                            onChange={(v) => changeItem(key, index, "title", v)}
                          />
                          {!["summary", "skills"].includes(key) && (
                            <>
                              <Field
                                label={
                                  key === "education"
                                    ? t("专业 / 学历")
                                    : t("职位 / 角色")
                                }
                                value={e.subtitle}
                                onChange={(v) =>
                                  changeItem(key, index, "subtitle", v)
                                }
                              />
                              <Field
                                label="起止时间"
                                value={e.date}
                                placeholder={t("2023.06 — 至今")}
                                onChange={(v) =>
                                  changeItem(key, index, "date", v)
                                }
                              />
                            </>
                          )}
                        </div>
                        <label className="field">
                          <span>{t("详细描述")}</span>
                        </label>
                        <RichEditor
                          value={e.body}
                          onChange={(v) => changeItem(key, index, "body", v)}
                        />
                      </div>
                    ))
                  )}
                  {!(key === "skills" && s.items.length) && !(
                    ["awards", "certificates"].includes(key) ||
                    /荣誉|证书/.test(s.label)
                  ) && (
                    <button
                      className="add-entry"
                      onClick={() =>
                        update((d) => {
                          d.sections[key].items.push(item());
                          d.sections[key].visible = true;
                        })
                      }
                    >
                      <Plus size={15} />
                      {t("添加")}
                      {t(s.label)}
                    </button>
                  )}
                  {isCustomSection(key) && (
                    <button
                      className="text-danger"
                      onClick={() => {
                        if (
                          confirm(
                            "删除这个自定义模块及其中内容？可通过撤销恢复。",
                          )
                        ) {
                          update((d) => removeSection(d, key));
                          setSelected("basics");
                        }
                      }}
                    >
                      {t("删除此自定义模块")}
                    </button>
                  )}
                  {s.items.length > 0 && (
                    <button
                      className="text-danger"
                      onClick={() => {
                        if (confirm("删除这个模块的全部条目？可通过撤销恢复。"))
                          update((d) => {
                            d.sections[key].items = [];
                            d.sections[key].visible = false;
                          });
                      }}
                    >
                      {t("清空此模块")}
                    </button>
                  )}
                </div>
              )}
            </section>
          );
        })}
      </div>
      <div className="add-module-panel">
        {adding ? (
          <div className="add-module-form">
            <strong>{t("添加简历模块")}</strong>
            <input
              aria-label={t("新模块名称")}
              maxLength={30}
              placeholder={t("例如：科研经历、志愿服务")}
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.nativeEvent.isComposing)
                  createModule();
              }}
            />
            <div className="module-presets">
              {["科研经历", "志愿服务", "培训经历", "作品与出版"].map(
                (name) => (
                  <button key={name} onClick={() => setNewLabel(name)}>
                    {name}
                  </button>
                ),
              )}
            </div>
            {addError && <p role="alert">{addError}</p>}
            <div>
              <button
                className="secondary small-button"
                onClick={() => setAdding(false)}
              >
                {t("取消")}
              </button>
              <button
                className="primary small-button"
                disabled={!newLabel.trim()}
                onClick={createModule}
              >
                {t("确认添加模块")}
              </button>
            </div>
          </div>
        ) : (
          <button className="add-module-button" onClick={() => setAdding(true)}>
            <Plus size={16} />
            {t("添加模块")}
          </button>
        )}
      </div>
      <div className="editor-foot">
        <span className="tiny-dot" />
        {t("内容自动保存在当前浏览器")}
      </div>
    </>
  );
}
function TemplateThumb({ template }) {
  const sample = useMemo(() => {
    const d = demoResume();
    d.style = {
      ...d.style,
      ...templateStyle(template.id),
    };
    return d;
  }, [template.id]);
  return (
    <div className="real-template-thumb" aria-hidden="true">
      <div>
        <Resume doc={sample} print />
      </div>
    </div>
  );
}
export function Templates({ doc, update }) {
  const [category, setCategory] = useState("全部");
  return (
    <div className="settings-panel template-settings">
      <span className="eyebrow">FIND YOUR FORM</span>
      <h2>{t("让排版，衬托你的经历。")}</h2>
      <p>{t("下方为真实简历预览")}</p>
      <div className="template-filters">
        {["全部", "单栏", "双栏", "紧凑"].map((label) => (
          <button
            key={t(label)}
            className={category === label ? "active" : ""}
            onClick={() => setCategory(label)}
          >
            {t(label)}
          </button>
        ))}
      </div>
      <div className="template-gallery">
        {TEMPLATES.filter(
          (t) => category === "全部" || t.category === category,
        ).map((template) => (
          <button
            key={template.id}
            className={
              "template-card " +
              (doc.style.template === template.id ? "active" : "")
            }
            onClick={() =>
              update((d) => {
                Object.assign(d.style, templateStyle(template.id));
              })
            }
          >
            <TemplateThumb template={template} />
            <div>
              <strong>{t(template.name)}</strong>
              <p>{t(template.description)}</p>
              <span>
                {doc.style.template === template.id
                  ? t("✓ 正在使用")
                  : t(template.category) + " · " + t("选择模板")}
              </span>
            </div>
          </button>
        ))}
      </div>
      <div className="reference-note">
        {t("参考方向：")}
        <a
          href="https://flowcv.com/resume-templates"
          target="_blank"
          rel="noreferrer"
        >
          FlowCV
        </a>{" "}
        ·{" "}
        <a
          href="https://www.overleaf.com/gallery/tagged/cv"
          target="_blank"
          rel="noreferrer"
        >
          Overleaf
        </a>{" "}
        ·{" "}
        <a
          href="https://word.cloud.microsoft/create/en/resume-templates/"
          target="_blank"
          rel="noreferrer"
        >
          Word
        </a>{" "}
        ·{" "}
        <a
          href="https://www.canva.com/resumes/templates/"
          target="_blank"
          rel="noreferrer"
        >
          Canva
        </a>
        <br />
        {t("布局独立实现，切换模板会应用配套字体和间距，内容保持不变。")}
      </div>
    </div>
  );
}
export function Layout({ doc, update, onUploadPhoto, onCropPhoto }) {
  return (
    <div className="settings-panel">
      <span className="eyebrow">THE FINISHING TOUCHES</span>
      <h2>{t("刚刚好的阅读节奏。")}</h2>
      <p>{t("细微调整，让每一页都恰到好处。")}</p>
      {[
        ["fontSize", "正文字号", 10, 18, 0.5, "px"],
        ["lineHeight", "行间距", 1.2, 2.2, 0.05, "倍"],
        ["margin", "页面边距", 10, 26, 1, "mm"],
        ["gap", "模块间距", 8, 30, 1, "px"],
      ].map(([key, label, min, max, step, unit]) => (
        <label className="range-field" key={key}>
          <span>
            {t(label)}
            <b>
              {Math.round(doc.style[key] * 100) / 100} {t(unit)}
            </b>
          </span>
          <input
            aria-label={t(label)}
            type="range"
            min={min}
            max={max}
            step={step}
            value={doc.style[key]}
            onChange={(e) =>
              update((d) => {
                d.style[key] = Number(e.target.value);
              })
            }
          />
        </label>
      ))}
      <label className="field">
        <span>{t("正文字体")}</span>
        <select
          value={doc.style.font}
          onChange={(e) =>
            update((d) => {
              d.style.font = e.target.value;
            })
          }
        >
          <option value="sans">{t("现代黑体")}</option>
          <option value="serif">{t("经典宋体")}</option>
        </select>
      </label>
      <label className="field">
        <span>{t("主题颜色")}</span>
        <div className="swatches">
          {[
            "#276454",
            "#263b55",
            "#252525",
            "#78614a",
            "#6a587f",
            "#9b4747",
          ].map((c) => (
            <button
              aria-label={t("颜色 " + c)}
              key={c}
              className={doc.style.color === c ? "chosen" : ""}
              style={{
                background: c,
              }}
              onClick={() =>
                update((d) => {
                  d.style.color = c;
                })
              }
            />
          ))}
          <input
            aria-label={t("自定义颜色")}
            type="color"
            value={doc.style.color}
            onChange={(e) =>
              update((d) => {
                d.style.color = e.target.value;
              })
            }
          />
        </div>
      </label>
      <PhotoSettings
        doc={doc}
        update={update}
        onUpload={onUploadPhoto}
        onCrop={onCropPhoto}
      />
      <div className="inline-note">
        {t("页面尺寸固定为 A4。预览与 PDF 导出使用同一套排版。")}
      </div>
    </div>
  );
}
