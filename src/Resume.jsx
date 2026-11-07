import { t } from "./i18n.js";
import React, { useLayoutEffect, useRef, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Check,
  Sparkles,
  WandSparkles,
  Camera,
  X,
} from "lucide-react";
import { BASIC_FIELDS, displayBasics } from "./basic-fields.js";
import { BASIC_ICONS } from "./BasicInfo.jsx";
import { RATIOS } from "./photo.js";
import InlineEditable from "./InlineEditable.jsx";
export function safeHtml(value = "") {
  const root = new DOMParser().parseFromString(
    value.includes("<")
      ? value
      : value
          .split("\n")
          .map(
            (x) =>
              `<p>${x.replaceAll("&", "&amp;").replaceAll("<", "&lt;")}</p>`,
          )
          .join(""),
    "text/html",
  );
  const allowed = new Set([
    "P",
    "BR",
    "STRONG",
    "B",
    "EM",
    "I",
    "U",
    "UL",
    "OL",
    "LI",
    "A",
  ]);
  for (const el of [...root.body.querySelectorAll("*")]) {
    if (["SCRIPT", "STYLE", "IFRAME", "OBJECT"].includes(el.tagName)) {
      el.remove();
      continue;
    }
    if (el.tagName === "DIV") {
      const p = root.createElement("p");
      p.append(...el.childNodes);
      el.replaceWith(p);
      continue;
    }
    if (!allowed.has(el.tagName)) {
      el.replaceWith(...el.childNodes);
      continue;
    }
    for (const a of [...el.attributes])
      if (!(
        (el.tagName === "OL" &&
          a.name === "start" &&
          /^\d{1,5}$/.test(a.value)) ||
        (el.tagName === "LI" &&
          a.name === "value" &&
          /^\d{1,5}$/.test(a.value)) ||
        (el.tagName === "A" &&
          a.name === "href" &&
          /^https?:\/\//i.test(a.value))
      ))
        el.removeAttribute(a.name);
    if (el.tagName === "A") {
      el.setAttribute("target", "_blank");
      el.setAttribute("rel", "noopener noreferrer");
    }
  }
  return root.body.innerHTML;
}
export function splitBlocks(html) {
  const el = document.createElement("div");
  el.innerHTML = safeHtml(html);
  const out = [];
  for (const node of [...el.childNodes]) {
    if (node.nodeName === "UL" || node.nodeName === "OL") {
      let number = Number(node.getAttribute("start") || 1);
      for (const li of [...node.children]) {
        if (li.hasAttribute("value")) number = Number(li.getAttribute("value"));
        const tag = node.nodeName.toLowerCase();
        out.push(
          `<${tag}${tag === "ol" ? ` start="${number}"` : ""}>${li.outerHTML}</${tag}>`,
        );
        number++;
      }
    } else if (node.textContent?.trim() || node.nodeName === "BR")
      out.push(node.outerHTML || node.textContent);
  }
  return out;
}
export function joinRichBlocks(blocks) {
  const el = document.createElement("div");
  el.innerHTML = blocks.join("");
  for (const node of [...el.children]) {
    const previous = node.previousElementSibling;
    if (
      previous &&
      ["UL", "OL"].includes(node.tagName) &&
      previous.tagName === node.tagName &&
      (node.tagName === "UL" ||
        Number(node.getAttribute("start") || 1) ===
          Number(previous.getAttribute("start") || 1) +
            previous.children.length)
    ) {
      previous.append(...node.childNodes);
      node.remove();
    }
  }
  return el.innerHTML;
}
function Header({ doc, small = false, onSelect, editor }) {
  const basics = displayBasics(doc.basics);
  const referenceContacts =
    !small && ["classic", "teal-band"].includes(doc.style.template);
  const visible = (key) => doc.basicsVisibility?.[key] !== false;
  const field = (key, Tag, className, placeholder = "") => (
    <InlineEditable
      as={Tag}
      className={className}
      value={basics[key] || ""}
      placeholder={placeholder}
      meta={{ section: "basics", field: key }}
      {...editor}
    />
  );
  const heading = (key, Tag, className, placeholder) => (
    <div
      className="paper-basic-heading"
      onClick={(e) => {
        if (editor?.enabled && !e.target.closest(".basic-hide-on-paper"))
          e.currentTarget.querySelector("[contenteditable=true]")?.focus();
      }}
    >
      {field(key, Tag, className, placeholder)}
      {editor?.enabled && (
        <button
          className="basic-hide-on-paper"
          onPointerDown={(event) => {
            event.preventDefault();
            event.stopPropagation();
          }}
          aria-label={t("从预览隐藏" + key)}
          title={t(
            "隐藏" +
              (BASIC_FIELDS.find(([field]) => field === key)?.[1] || key),
          )}
          onClick={(e) => {
            e.stopPropagation();
            editor.onHideBasic?.(key);
          }}
        >
          <X size={9} />
        </button>
      )}
    </div>
  );
  return (
    <header
      data-section="basics"
      className={
        "resume-header " +
        (small ? "small" : "") +
        (doc.photo?.visible ? " has-photo" : "")
      }
      style={
        doc.photo
          ? {
              "--portrait-width": doc.photo.width + "mm",
              "--portrait-height":
                doc.photo.width / RATIOS[doc.photo.ratio] + "mm",
            }
          : undefined
      }
      onClick={undefined}
    >
      {doc.photo?.visible && (
        <div
          className="resume-photo"
          style={{ aspectRatio: String(RATIOS[doc.photo.ratio]) }}
        >
          {editor?.enabled ? (
            <button
              aria-label="编辑简历照片"
              onClick={(event) => {
                event.stopPropagation();
                editor.onPhoto?.();
              }}
            >
              <img src={doc.photo.dataUrl} alt="简历照片" />
              <span>
                <Camera size={15} />
                {t("调整照片")}
              </span>
            </button>
          ) : (
            <img src={doc.photo.dataUrl} alt="简历照片" />
          )}
        </div>
      )}
      {visible("name") && heading("name", "h1", "", "你的姓名")}
      {visible("role") &&
        (basics.role || (!referenceContacts && editor?.enabled)) &&
        heading("role", "div", "resume-role", "求职意向")}
      <div className="resume-contact">
        {[
          "gender",
          "birthday",
          "hometown",
          "phone",
          "wechat",
          "email",
          "city",
          "website",
          "details",
        ]
          .filter(
            (key) => visible(key) && basics[key] && basics[key] !== "不填写",
          )
          .map((key) => {
            const Icon = BASIC_ICONS[key];
            const label = referenceContacts && {
              birthday: t("生日"),
              hometown: t("籍贯"),
              city: t("期望城市"),
            }[key];
            return (
              <span
                key={key}
                className="resume-contact-item"
                data-basic-key={key}
                onClick={(e) => {
                  if (
                    editor?.enabled &&
                    !e.target.closest(".basic-hide-on-paper")
                  )
                    e.currentTarget
                      .querySelector("[contenteditable=true]")
                      ?.focus();
                }}
              >
                {(!referenceContacts ||
                  !["gender", "birthday", "hometown", "city"].includes(key)) && (
                  <Icon size={12} />
                )}
                {label && <span className="resume-contact-label">{label}:</span>}
                {field(key, "span", "")}
                {editor?.enabled && (
                  <button
                    className="basic-hide-on-paper"
                    onPointerDown={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                    }}
                    aria-label={t("从预览隐藏" + key)}
                    title={t(
                      "隐藏" +
                        (BASIC_FIELDS.find(([field]) => field === key)?.[1] ||
                          key),
                    )}
                    onClick={(e) => {
                      e.stopPropagation();
                      editor.onHideBasic?.(key);
                    }}
                  >
                    <X size={9} />
                  </button>
                )}
              </span>
            );
          })}
      </div>
    </header>
  );
}
function SectionTitle({ label, bold }) {
  return (
    <h2
      className="resume-section-title"
      style={bold === undefined ? undefined : { fontWeight: bold ? 700 : 400 }}
    >
      <span>{label}</span>
    </h2>
  );
}
function EntryHead({ entry, section, editor }) {
  return (
    (entry.title || entry.subtitle || entry.date) && (
      <div className="resume-entry-head">
        <div>
          <InlineEditable
            as="strong"
            value={entry.title}
            meta={{ section, entryId: entry.id, field: "title" }}
            {...editor}
          />
          {entry.subtitle && (
            <InlineEditable
              className="resume-subtitle"
              value={entry.subtitle}
              meta={{ section, entryId: entry.id, field: "subtitle" }}
              {...editor}
            />
          )}
        </div>
        <InlineEditable
          as="time"
          value={entry.date}
          meta={{ section, entryId: entry.id, field: "date" }}
          {...editor}
        />
      </div>
    )
  );
}
function formatStyle(section, entry = {}) {
  const title = entry.format?.titleBold ?? section.format?.entryTitleBold,
    subtitle = entry.format?.subtitleBold ?? section.format?.subtitleBold;
  return {
    lineHeight: entry.format?.lineHeight ?? section.format?.lineHeight,
    "--entry-title-weight": title === undefined ? undefined : title ? 700 : 400,
    "--entry-subtitle-weight":
      subtitle === undefined ? undefined : subtitle ? 700 : 400,
  };
}
function makeUnits(doc, onSelect, focusEntry, editor) {
  const units = [];
  const sidebar = ["sidebar", "executive"].includes(doc.style.template);
  if (!sidebar)
    units.push(
      <Header key="header" doc={doc} onSelect={onSelect} editor={editor} />,
    );
  for (const key of doc.order) {
    const section = doc.sections[key];
    if (
      !section.visible ||
      !section.items.length ||
      (sidebar && key === "skills")
    )
      continue;
    const tags =
      ["awards", "certificates"].includes(key) ||
      /荣誉|证书/.test(section.label);
    if (tags) {
      units.push(
        <div
          key={key + "-tags"}
          className="resume-piece resume-tag-section"
          data-section={key}
          style={formatStyle(section)}
        >
          <SectionTitle label={section.label} bold={section.format?.titleBold} />
          <div className="resume-tags">
            {section.items.flatMap((entry) => {
              const names = splitBlocks(entry.body).flatMap((block) => {
                const element = document.createElement("div");
                element.innerHTML = block;
                return element.textContent.split(/\n|[；;]/).map((text) => text.trim()).filter(Boolean);
              });
              return (names.length ? names : [entry.title || ""]).map((text, n) => (
                <InlineEditable
                  key={entry.id + "-" + n}
                  value={text}
                  as="span"
                  className="resume-tag"
                  placeholder="添加名称"
                  meta={{ section: key, entryId: entry.id, field: "body", tagIndex: n }}
                  {...editor}
                />
              ));
            })}
          </div>
        </div>,
      );
      continue;
    }
    section.items.forEach((entry, index) => {
      const paragraphs = splitBlocks(entry.body);
      const body = (html, n) => (
        <InlineEditable
          className="resume-rich"
          rich
          html={safeHtml}
          value={html}
          meta={{
            section: key,
            entryId: entry.id,
            field: "body",
            blockIndex: n,
          }}
          {...editor}
        />
      );
      units.push(
        <div
          key={key + entry.id + "first"}
          className="resume-piece"
          style={formatStyle(section, entry)}
          data-section={key}
          data-entry={entry.id}
          data-body-index={0}
          data-entry-first={index === 0}
          data-focused={focusEntry === entry.id || undefined}
          onClick={undefined}
        >
          {index === 0 && (
            <SectionTitle
              label={section.label}
              bold={section.format?.titleBold}
            />
          )}
          <div className={index ? "entry-space" : ""}>
            <EntryHead entry={entry} section={key} editor={editor} />
            {body(paragraphs[0] || "", 0)}
          </div>
        </div>,
      );
      paragraphs.slice(1).forEach((p, n) =>
        units.push(
          <div
            key={key + entry.id + n}
            className="resume-piece"
            style={formatStyle(section, entry)}
            data-section={key}
            data-entry={entry.id}
            data-body-index={n + 1}
            data-focused={focusEntry === entry.id || undefined}
            onClick={undefined}
          >
            {body(p, n + 1)}
          </div>,
        ),
      );
    });
  }
  return units;
}
function Side({ first, doc, onSelect, editor }) {
  return (
    <aside className="resume-side">
      {first ? (
        <>
          <Header doc={doc} small onSelect={onSelect} editor={editor} />
          {doc.sections.skills.visible &&
            doc.sections.skills.items.length > 0 && (
              <>
                <SectionTitle
                  label={doc.sections.skills.label}
                  bold={doc.sections.skills.format?.titleBold}
                />
                {doc.sections.skills.items.map((e) => (
                  <div
                    key={e.id}
                    data-section="skills"
                    data-entry={e.id}
                    onClick={undefined}
                    className="resume-rich"
                    style={formatStyle(doc.sections.skills, e)}
                  >
                    <InlineEditable
                      value={e.body}
                      rich
                      html={safeHtml}
                      meta={{
                        section: "skills",
                        entryId: e.id,
                        field: "body",
                      }}
                      {...editor}
                    />
                  </div>
                ))}
              </>
            )}
        </>
      ) : (
        <div className="continued-name">
          {doc.basicsVisibility?.name === false ? "" : doc.basics.name}
          <small>个人简历 · 续页</small>
        </div>
      )}
    </aside>
  );
}
export default function Resume({
  doc,
  onSelect,
  onPages,
  focusEntry,
  print = false,
  onEdit,
  onInlineAI,
  onDraft,
  onEditPhoto,
  onFinishEditing,
  onHideBasic,
}) {
  const measure = useRef(null);
  const root = useRef(null);
  const [pages, setPages] = useState([[]]);
  const [overflow, setOverflow] = useState(false);
  const [active, setActive] = useState(null);
  function finishEditing(event) {
    setActive(null);
    window.getSelection()?.removeAllRanges();
    onFinishEditing?.(event);
  }
  useEffect(() => {
    if (!active) return;
    function outside(event) {
      if (!active.element.isConnected) {
        finishEditing(event);
        return;
      }
      if (
        !active.element.contains(event.target) &&
        !event.target.closest(".paper-inline-tools") &&
        !event.target.closest(".basic-hide-on-paper")
      ) {
        active.element.blur();
        finishEditing(event);
      }
    }
    document.addEventListener("pointerdown", outside, true);
    return () => document.removeEventListener("pointerdown", outside, true);
  }, [active]);
  useLayoutEffect(() => {
    if (active && !active.element.isConnected) finishEditing();
  }, [doc, pages]);
  const editor = {
    enabled: !print && !!onEdit,
    onCommit: onEdit,
    onPhoto: onEditPhoto,
    onHideBasic,
    onDraft,
    onActivate: (data, event) => {
      const r = data.element.getBoundingClientRect();
      setActive({
        ...data,
        x: Math.max(12, Math.min(window.innerWidth - 350, r.left)),
        y: Math.max(60, r.top - 36),
      });
      onSelect?.(data.meta.section, data.meta.entryId || null, event, {
        inline: true,
      });
    },
    onDeactivate: (el) =>
      setActive((previous) => (previous?.element === el ? null : previous)),
  };
  const units = makeUnits(doc, onSelect, focusEntry, editor);
  const measuringUnits = makeUnits(doc, null, null, { enabled: false });
  const sidebar = ["sidebar", "executive"].includes(doc.style.template);
  useLayoutEffect(() => {
    let disposed = false;
    const layout = () => {
      if (disposed || !measure.current) return;
      const paper = root.current.querySelector(".resume-page");
      const paperStyle = getComputedStyle(paper);
      const available =
        parseFloat(paperStyle.height) -
        parseFloat(paperStyle.paddingTop) -
        parseFloat(paperStyle.paddingBottom);
      // 预览有 transform:scale，分页必须使用未缩放的纸面尺寸。
      const width = parseFloat(getComputedStyle(measure.current).width);
      const scale =
        width > 0 ? measure.current.getBoundingClientRect().width / width : 1;
      let used = 0,
        result = [[]],
        tooTall = false;
      [...measure.current.children].forEach((el, index) => {
        const height = el.getBoundingClientRect().height / (scale || 1);
        if (height > available) tooTall = true;
        if (used + height > available && result.at(-1).length) {
          result.push([]);
          used = 0;
        }
        result.at(-1).push(index);
        used += height;
      });
      setOverflow(tooTall);
      setPages(result);
      onPages?.(result.length);
      window.__RESUME_READY__ = true;
      window.__RESUME_OVERFLOW__ = tooTall;
    };
    window.__RESUME_READY__ = false;
    layout();
    document.fonts.ready.then(layout);
    return () => {
      disposed = true;
    };
  }, [doc]);
  useLayoutEffect(() => {
    const sideOverflow = [
      ...(root.current?.querySelectorAll(".resume-side") || []),
    ].some((el) => el.scrollHeight > el.clientHeight + 2);
    if (sideOverflow) {
      setOverflow(true);
      window.__RESUME_OVERFLOW__ = true;
    }
  }, [pages, doc]);
  function renderPage(indices) {
    const result = [];
    for (let pos = 0; pos < indices.length; pos++) {
      const unit = units[indices[pos]];
      if (!unit) continue;
      const props = unit.props;
      if (props["data-body-index"] === undefined) {
        result.push(
          <div className="unit" key={indices[pos]}>
            {unit}
          </div>,
        );
        continue;
      }
      const section = props["data-section"],
        entryId = props["data-entry"],
        start = props["data-body-index"];
      let count = 1;
      while (pos + 1 < indices.length) {
        const next = units[indices[pos + 1]]?.props;
        if (
          !next ||
          next["data-section"] !== section ||
          next["data-entry"] !== entryId ||
          next["data-body-index"] === undefined
        )
          break;
        count++;
        pos++;
      }
      const group = doc.sections[section],
        entry = group.items.find((row) => row.id === entryId);
      result.push(
        <div className="unit" key={entryId + "-" + start}>
          <div
            className="resume-piece"
            data-section={section}
            data-entry={entryId}
            style={formatStyle(group, entry)}
          >
            {start === 0 && props["data-entry-first"] && (
              <SectionTitle
                label={group.label}
                bold={group.format?.titleBold}
              />
            )}
            <div
              className={
                start === 0 && !props["data-entry-first"] ? "entry-space" : ""
              }
            >
              {start === 0 && (
                <EntryHead entry={entry} section={section} editor={editor} />
              )}
              <InlineEditable
                className="resume-rich"
                rich
                html={safeHtml}
                value={joinRichBlocks(
                  splitBlocks(entry.body).slice(start, start + count),
                )}
                meta={{
                  section,
                  entryId,
                  field: "body",
                  blockStart: start,
                  blockCount: count,
                }}
                {...editor}
              />
            </div>
          </div>
        </div>,
      );
    }
    return result;
  }
  const style = {
    "--resume-size": doc.style.fontSize + "px",
    "--resume-line": doc.style.lineHeight,
    "--resume-margin": doc.style.margin + "mm",
    "--resume-gap": doc.style.gap + "px",
    "--resume-color": doc.style.color,
    "--resume-font":
      doc.style.font === "serif"
        ? '"Songti SC", "SimSun", serif'
        : '"PingFang SC", "Microsoft YaHei", sans-serif',
  };

  return (
    <div
      ref={root}
      onMouseUp={(event) => {
        if (
          print ||
          !root.current?.contains(event.target) ||
          event.target.closest("[data-inline-field]")
        )
          return;
        const selection = window.getSelection();
        if (!selection?.toString().trim()) return;
        const el =
          selection.anchorNode?.parentElement?.closest("[data-section]");
        if (el && root.current.contains(el))
          onSelect?.(el.dataset.section, el.dataset.entry || null, event);
      }}
      className={
        "resume-document template-" +
        doc.style.template +
        (print ? " print-document" : "")
      }
      style={style}
    >
      {overflow && (
        <div className="overflow-warning">
          内容超出页面，请拆分长段落或缩短侧栏技能。
        </div>
      )}
      <div
        className={"measure-column " + (sidebar ? "has-sidebar" : "")}
        ref={measure}
      >
        {measuringUnits.map((u, i) => (
          <div key={i} className="unit">
            {u}
          </div>
        ))}
      </div>
      {active &&
        active.meta.field === "body" &&
        active.meta.tagIndex === undefined &&
        !print &&
        createPortal(
          <div
            className="paper-inline-tools"
            role="toolbar"
            aria-label={t("纸面编辑工具")}
            style={{ left: active.x, top: active.y }}
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onMouseUp={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            {active.meta.field === "body" &&
              active.meta.tagIndex === undefined &&
              [
                [Bold, "bold", "加粗"],
                [Italic, "italic", "斜体"],
                [Underline, "underline", "下划线"],
                [List, "insertUnorderedList", "项目列表"],
                [ListOrdered, "insertOrderedList", "编号列表"],
              ].map(([Icon, command, label]) => (
                <button
                  key={command}
                  aria-label={t(label)}
                  disabled={active.meta.field !== "body"}
                  onClick={() => {
                    active.element.focus();
                    document.execCommand(command, false);
                  }}
                >
                  <Icon size={16} />
                </button>
              ))}
            {active.meta.field === "body" &&
              active.meta.tagIndex === undefined && (
                <>
                  <i />
                  <button
                    onClick={() => {
                      const text = window.getSelection()?.toString() || "";
                      active.flush();
                      active.element.blur();
                      onInlineAI?.(active.meta, text, "generate");
                    }}
                  >
                    <Sparkles size={15} />
                    {t("AI生成")}
                  </button>
                  <button
                    onClick={() => {
                      const text = window.getSelection()?.toString() || "";
                      active.flush();
                      active.element.blur();
                      onInlineAI?.(active.meta, text, "polish");
                    }}
                  >
                    <WandSparkles size={15} />
                    {t("AI润色")}
                  </button>
                  <i />
                </>
              )}
          </div>,
          document.body,
        )}
      {pages.map((indices, n) => (
        <article
          className={"resume-page " + (sidebar ? "has-sidebar" : "")}
          key={n}
        >
          {sidebar && (
            <Side
              first={n === 0}
              doc={doc}
              onSelect={onSelect}
              editor={editor}
            />
          )}
          <div className="resume-main">{renderPage(indices)}</div>
          <footer className="resume-page-footer">
            <span>{n + 1} / {pages.length}</span>
          </footer>
        </article>
      ))}
    </div>
  );
}
