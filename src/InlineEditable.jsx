import { t } from "./i18n.js";
import React, { useLayoutEffect, useRef } from "react";
// 在本地 DOM 保留输入光标；点击外部失焦时，将一次编辑提交到共享文档。
export default function InlineEditable({
  as: Tag = "div",
  value = "",
  rich = false,
  html,
  meta,
  className = "",
  placeholder = "",
  enabled,
  onActivate,
  onCommit,
  onDeactivate,
  onDraft,
}) {
  const ref = useRef(null),
    last = useRef(value);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (document.activeElement !== el) {
      if (rich) el.innerHTML = html(value);
      else el.textContent = value;
      last.current = value;
    }
  }, [value, rich]);
  function flush() {
    const el = ref.current;
    if (!el?.isConnected) return;
    const next = rich ? html(el.innerHTML) : el.textContent.trim();
    if (next !== last.current) {
      last.current = next;
      onCommit?.(meta, next);
    }
  }
  if (!enabled)
    return rich ? (
      <Tag
        className={className}
        dangerouslySetInnerHTML={{ __html: html(value) }}
      />
    ) : (
      <Tag className={className}>{value || placeholder}</Tag>
    );
  return (
    <Tag
      ref={ref}
      className={className + " inline-editable"}
      contentEditable
      suppressContentEditableWarning
      role="textbox"
      aria-label={
        t("纸面编辑 ") + (meta.field === "body" ? t("正文") : meta.field)
      }
      data-inline-field={meta.field}
      data-placeholder={placeholder}
      spellCheck={false}
      onFocus={(event) =>
        onActivate?.({ element: ref.current, flush, meta }, event)
      }
      onClick={(e) => e.stopPropagation()}
      onMouseUp={(event) => {
        event.stopPropagation();
        onActivate?.({ element: ref.current, flush, meta }, event);
      }}
      onInput={() =>
        onDraft?.(
          meta,
          rich ? html(ref.current.innerHTML) : ref.current.textContent,
        )
      }
      onBlur={() => {
        flush();
        onDeactivate?.(ref.current);
      }}
      onPaste={(event) => {
        event.preventDefault();
        document.execCommand(
          "insertText",
          false,
          event.clipboardData.getData("text/plain"),
        );
      }}
      onKeyDown={(event) => {
        if (event.nativeEvent.isComposing || event.keyCode === 229) return;
        if (event.key === "Escape") {
          onDraft?.(meta, value);
          if (rich) ref.current.innerHTML = html(value);
          else ref.current.textContent = value;
          ref.current.blur();
        } else if (
          event.key === "Enter" &&
          (!rich || event.metaKey || event.ctrlKey)
        ) {
          event.preventDefault();
          ref.current.blur();
        }
      }}
    />
  );
}
