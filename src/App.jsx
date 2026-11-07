import { t, useLanguage } from "./i18n.js";
import React, { useEffect, useRef, useState } from "react";
import {
  FileText,
  Upload,
  Download,
  Undo2,
  Redo2,
  Check,
  ChevronDown,
  Minus,
  Plus,
  LayoutTemplate,
  SlidersHorizontal,
  PenLine,
  X,
  ArrowLeft,
  PanelRightClose,
  PanelRightOpen,
  FileJson,
  Loader2,
  Star,
  FolderOpen,
} from "lucide-react";
import {
  demoResume,
  emptyResume,
  validateDocument,
  applyProposal,
} from "./model.js";
import Resume, { splitBlocks, joinRichBlocks, safeHtml } from "./Resume.jsx";
import Editor, { Templates, Layout } from "./Editor.jsx";
import PhotoCropper from "./PhotoCropper.jsx";
import { preparePhoto } from "./photo.js";
import Agent from "./Agent.jsx";
import Portal from "./Portal.jsx";
import {
  loadProfile,
  loadPreferences,
  PROFILE_KEY,
  PREFERENCES_KEY,
  agentProfile,
} from "./profile.js";
import PreviewEditor from "./PreviewEditor.jsx";
import {
  loadLibrary,
  saveActive,
  addResume,
  removeResume,
  duplicateResume,
  activeDocument,
  LIBRARY_KEY,
} from "./library.js";
const STORAGE = "zhijian.resume.v1";
function saveFile(blob, name) {
  const u = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = u;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(u), 5000);
}
export default function App() {
  useLanguage();
  const [library, setLibrary] = useState(() => loadLibrary(localStorage));
  const libraryRef = useRef(library);
  const [path, setPath] = useState(location.pathname);
  const [profile, setProfileState] = useState(() => loadProfile(localStorage));
  const [preferences, setPreferencesState] = useState(() =>
    loadPreferences(localStorage),
  );
  const [initialPrompt, setInitialPrompt] = useState("");
  function setProfile(next) {
    try {
      localStorage.setItem(PROFILE_KEY, JSON.stringify(next));
      setProfileState(next);
      return true;
    } catch {
      notify("档案保存失败，请先备份并释放浏览器空间");
      return false;
    }
  }
  function setPreferences(next) {
    try {
      localStorage.setItem(PREFERENCES_KEY, JSON.stringify(next));
      setPreferencesState(next);
    } catch {
      notify("偏好保存失败");
    }
  }
  function navigate(url) {
    if (path === "/editor")
      persistLibrary(saveActive(libraryRef.current, current.current));
    window.history.pushState({}, "", url);
    setPath(location.pathname);
    setPopover(null);
    setFocusContext(null);
    setQuoteContext(null);
  }
  useEffect(() => {
    const route = () => {
      if (location.pathname === "/editor" && !libraryRef.current.activeId)
        window.history.replaceState({}, "", "/resumes");
      setPath(location.pathname);
      const id = new URLSearchParams(location.search).get("id");
      if (
        location.pathname === "/editor" &&
        libraryRef.current.entries.some((e) => e.id === id)
      )
        switchResume(id);
    };
    route();
    window.addEventListener("popstate", route);
    return () => window.removeEventListener("popstate", route);
  }, []);
  const [renaming, setRenaming] = useState(false),
    [titleDraft, setTitleDraft] = useState("");
  const [focusContext, setFocusContext] = useState(null),
    [quoteContext, setQuoteContext] = useState(null),
    [popover, setPopover] = useState(null),
    [editTarget, setEditTarget] = useState(null);
  useEffect(() => {
    if (!popover) return;
    function dismiss(event) {
      if (!event.target.closest(".preview-popover")) setPopover(null);
    }
    document.addEventListener("pointerdown", dismiss, true);
    return () => document.removeEventListener("pointerdown", dismiss, true);
  }, [popover]);
  const [doc, setDoc] = useState(() => activeDocument(library)),
    [tab, setTab] = useState("content"),
    [selected, setSelected] = useState("basics"),
    [pages, setPages] = useState(1),
    [zoom, setZoom] = useState(0.7),
    [toast, setToast] = useState(""),
    [busy, setBusy] = useState(""),
    [imported, setImported] = useState(null),
    [showAgent, setShowAgent] = useState(true),
    [saved, setSaved] = useState(true),
    [menu, setMenu] = useState(false),
    [print, setPrint] = useState(null),
    [sourceUrl, setSourceUrl] = useState(""),
    [compare, setCompare] = useState(false);
  const [editorWidth, setEditorWidth] = useState(() => {
    try {
      const saved = Number(localStorage.getItem("ai-resume.editor.width"));
      if (Number.isFinite(saved) && saved >= 260)
        return Math.min(
          600,
          Math.max(260, Math.max(window.innerWidth, 1040) - 650),
          saved,
        );
    } catch {}
    return window.innerWidth >= 1700 ? 340 : 320;
  });
  const [agentWidth, setAgentWidth] = useState(() => {
    try {
      return Math.max(
        280,
        Math.min(
          680,
          Math.max(window.innerWidth, 1040) - editorWidth - 312,
          Number(localStorage.getItem("zhijian.agent.width")) || 340,
        ),
      );
    } catch {
      return 340;
    }
  });
  const [cropTask, setCropTask] = useState(null);
  const photoInput = useRef();
  const drag = useRef(null),
    editorDrag = useRef(null);
  useEffect(
    () => () => {
      editorDrag.current = null;
      drag.current = null;
      document.body.classList.remove("resizing-panels");
    },
    [path],
  );
  const inlineDraft = useRef(null);
  function changeAgentWidth(value) {
    const workspaceWidth =
      preview.current?.parentElement?.clientWidth || window.innerWidth;
    const editorWidth =
      preview.current?.parentElement
        ?.querySelector(".editor-panel")
        ?.getBoundingClientRect().width || 370;
    const max = Math.max(
      280,
      Math.min(680, workspaceWidth - editorWidth - 312),
    );
    const width = Math.round(Math.max(280, Math.min(max, value)));
    setAgentWidth(width);
    try {
      localStorage.setItem("zhijian.agent.width", String(width));
    } catch {}
  }
  function changeEditorWidth(value) {
    const available =
      preview.current?.parentElement?.clientWidth || window.innerWidth;
    const max = Math.max(
      260,
      Math.min(600, available - (showAgent ? agentWidth + 5 : 0) - 305),
    );
    const width = Math.round(Math.max(260, Math.min(max, value)));
    setEditorWidth(width);
    try {
      localStorage.setItem("ai-resume.editor.width", String(width));
    } catch {}
  }
  const input = useRef(),
    importLock = useRef(false),
    history = useRef([]),
    future = useRef([]),
    current = useRef(doc),
    toastTimer = useRef(),
    preview = useRef();
  current.current = doc;
  useEffect(() => {
    if (path === "/editor") changeEditorWidth(editorWidth);
  }, [showAgent, path]);
  async function uploadPhoto(file) {
    try {
      setCropTask({
        source: await preparePhoto(file),
        photo: null,
      });
    } catch (e) {
      notify(e.message);
    }
  }
  function notify(message) {
    setToast(message);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 5500);
  }
  function commit(next) {
    history.current.push(structuredClone(current.current));
    if (history.current.length > 80) history.current.shift();
    future.current = [];
    setDoc(next);
  }
  function update(fn) {
    const d = structuredClone(current.current);
    fn(d);
    commit(d);
  }
  function undo() {
    if (!history.current.length) return;
    future.current.push(current.current);
    setDoc(history.current.pop());
  }
  function redo() {
    if (!future.current.length) return;
    history.current.push(current.current);
    setDoc(future.current.pop());
  }
  function persistLibrary(next) {
    libraryRef.current = next;
    setLibrary(next);
    try {
      localStorage.setItem(LIBRARY_KEY, JSON.stringify(next));
    } catch {
      notify("存储空间不足，请先导出 PDF 留存");
    }
  }
  function resetDocumentUI() {
    inlineDraft.current = null;
    history.current = [];
    future.current = [];
    setFocusContext(null);
    setQuoteContext(null);
    setPopover(null);
    setEditTarget(null);
    setSelected("basics");
    setCompare(false);
    setSourceUrl("");
  }
  function switchResume(id) {
    if (id === libraryRef.current.activeId) return;
    const next = {
      ...saveActive(libraryRef.current, current.current),
      activeId: id,
    };
    persistLibrary(next);
    resetDocumentUI();
    setDoc(activeDocument(next));
  }
  function newResume(document = emptyResume(), title = "") {
    const next = addResume(
      saveActive(libraryRef.current, current.current),
      document,
      title,
    );
    persistLibrary(next);
    resetDocumentUI();
    setDoc(activeDocument(next));
    window.history.pushState({}, "", "/editor?id=" + next.activeId);
    setPath("/editor");
  }
  function deleteResume(id) {
    const isActive = id === libraryRef.current.activeId;
    const next = removeResume(
      saveActive(libraryRef.current, current.current),
      id,
    );
    persistLibrary(next);
    if (isActive) {
      resetDocumentUI();
      setDoc(activeDocument(next));
    }
  }
  function quoteSelection(context) {
    setQuoteContext({
      ...context,
      nonce: Date.now(),
    });
    setShowAgent(true);
    setPopover(null);
    notify(
      context.autoPolish
        ? "正在润色选中内容…"
        : "已带入对话，请补充修改要求后发送",
    );
  }
  function selectPreview(section, entryId, event, options) {
    const text = window.getSelection()?.toString().trim() || "";
    if (!options?.inline && !text) return;
    const row = doc.sections[section]?.items.find((e) => e.id === entryId);
    const context = {
      section,
      entryId,
      text: text.slice(0, 5000),
      label: section === "basics" ? "基本信息" : doc.sections[section]?.label,
      title: row?.title || "",
      nonce: Date.now(),
    };
    setSelected(section);
    setTab("content");
    setFocusContext(context);
    if (options?.inline) {
      setPopover(null);
      return;
    }
    setPopover({
      context,
      x: Math.min(window.innerWidth - 300, Math.max(15, event.clientX - 120)),
      y: Math.min(window.innerHeight - 85, Math.max(90, event.clientY - 58)),
    });
  }
  function editedDocument(source, meta, value) {
    const d = structuredClone(source);
    if (meta.section === "basics") {
      d.basics[meta.field] = value;
      return d;
    }
    const row = d.sections[meta.section]?.items.find(
      (e) => e.id === meta.entryId,
    );
    if (!row) return d;
    if (meta.field === "body" && meta.tagIndex !== undefined) {
      const tags = splitBlocks(row.body)
        .map((block) => {
          const element = document.createElement("div");
          element.innerHTML = block;
          return element.textContent;
        })
        .flatMap((text) => text.split(/\n|[；;]/))
        .map((text) => text.trim())
        .filter(Boolean);
      tags.splice(meta.tagIndex, 1, value);
      row.body = tags
        .map(
          (text) =>
            "<p>" +
            text
              .replaceAll("&", "&amp;")
              .replaceAll("<", "&lt;")
              .replaceAll(">", "&gt;") +
            "</p>",
        )
        .join("");
    } else if (meta.field === "body" && meta.blockStart !== undefined) {
      const blocks = splitBlocks(row.body);
      blocks.splice(meta.blockStart, meta.blockCount, ...splitBlocks(value));
      row.body = joinRichBlocks(blocks);
    } else if (meta.field === "body" && meta.blockIndex !== undefined) {
      const paragraphs = splitBlocks(row.body);
      paragraphs.splice(meta.blockIndex, 1, value);
      row.body = paragraphs.join("");
    } else row[meta.field] = value;
    return d;
  }
  function saveInlineDraft(meta, value) {
    inlineDraft.current = {
      meta,
      value,
    };
    try {
      const draft = editedDocument(current.current, meta, value);
      const next = saveActive(libraryRef.current, draft);
      localStorage.setItem(LIBRARY_KEY, JSON.stringify(next));
      localStorage.setItem(STORAGE, JSON.stringify(draft));
    } catch {
      notify("无法暂存编辑，请点击空白处保存并备份");
    }
  }
  useEffect(() => {
    setSaved(false);
    const t = setTimeout(() => {
      try {
        const pending = inlineDraft.current;
        const latest = pending
          ? editedDocument(doc, pending.meta, pending.value)
          : doc;
        const next = saveActive(libraryRef.current, latest);
        persistLibrary(next);
        if (next.activeId) localStorage.setItem(STORAGE, JSON.stringify(latest));
        setSaved(true);
      } catch {
        notify("浏览器存储空间不足，请先导出 PDF 留存。");
      }
    }, 400);
    return () => clearTimeout(t);
  }, [doc]);
  useEffect(() => {
    const f = (e) => {
      if (
        (e.metaKey || e.ctrlKey) &&
        e.key === "z" &&
        !["INPUT", "TEXTAREA"].includes(e.target.tagName) &&
        !e.target.isContentEditable
      ) {
        e.preventDefault();
        e.shiftKey ? redo() : undo();
      }
    };
    window.addEventListener("keydown", f);
    return () => window.removeEventListener("keydown", f);
  }, []);
  useEffect(() => {
    if (location.pathname === "/print") {
      try {
        const data = sessionStorage.getItem("resume-print");
        if (data) setPrint(validateDocument(JSON.parse(data)));
      } catch {}
    }
  }, []);
  useEffect(() => {
    if (!preview.current) return;
    const ob = new ResizeObserver(([entry]) =>
      setZoom(
        Math.min(0.92, Math.max(0.3, (entry.contentRect.width - 90) / 794)),
      ),
    );
    ob.observe(preview.current);
    return () => ob.disconnect();
  }, [showAgent, path]);
  async function importFile(file) {
    if (!file || importLock.current || busy || imported) return;
    if (!/\.(pdf|json)$/i.test(file.name)) {
      notify(t("请选择 PDF 或 JSON 文件。"));
      if (input.current) input.current.value = "";
      return;
    }
    importLock.current = true;
    setBusy("import");
    try {
      if (file.name.toLowerCase().endsWith(".json")) {
        const d = validateDocument(JSON.parse(await file.text()));
        setImported({
          document: d,
          name: file.name,
          text: "JSON 备份包含完整的模块内容与排版设置。",
        });
      } else {
        const form = new FormData();
        form.append("file", file);
        const r = await fetch("/api/import?mode=ai", {
          method: "POST",
          body: form,
        });
        const data = await r.json();
        if (!r.ok) throw Error(data.error);
        setImported({
          ...data,
          name: file.name,
          source: URL.createObjectURL(file),
        });
      }
    } catch (e) {
      notify(e.message);
    } finally {
      setBusy("");
      importLock.current = false;
      if (input.current) input.current.value = "";
    }
  }
  async function exportPdf() {
    setBusy("export");
    setMenu(false);
    try {
      const r = await fetch("/api/export", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          document: doc,
        }),
      });
      if (!r.ok) {
        const data = await r.json();
        throw Error(data.error);
      }
      saveFile(await r.blob(), (doc.basics.name || "我的") + "简历.pdf");
      notify("PDF 已导出");
    } catch (e) {
      notify(e.message);
    } finally {
      setBusy("");
    }
  }
  if (location.pathname === "/print")
    return print ? (
      <Resume doc={print} print />
    ) : (
      <div>{t("正在准备排版…")}</div>
    );
  return (
    <div className={path === "/editor" ? "app-shell" : "portal-app"}>
      {path !== "/editor" ? (
        <Portal
          view={
            path === "/profile"
              ? "profile"
              : path === "/settings"
                ? "settings"
                : path === "/resumes"
                  ? "home"
                  : "agent"
          }
          navigate={navigate}
          library={library}
          profile={profile}
          setProfile={setProfile}
          preferences={preferences}
          setPreferences={setPreferences}
          notify={notify}
          onEdit={(id) => {
            switchResume(id);
            window.history.pushState({}, "", "/editor?id=" + id);
            setInitialPrompt("");
            setPath("/editor");
          }}
          onNew={(d, title) => {
            setInitialPrompt("");
            newResume(d, title);
          }}
          onImport={() => input.current.click()}
          onImportFile={importFile}
          importing={busy === "import"}
          onCopy={(id) => {
            const next = duplicateResume(
              saveActive(libraryRef.current, current.current),
              id,
            );
            persistLibrary(next);
            resetDocumentUI();
            setDoc(activeDocument(next));
            notify("已复制，可改名后针对岗位编辑");
          }}
          onRename={(id, title) =>
            persistLibrary({
              ...libraryRef.current,
              entries: libraryRef.current.entries.map((e) =>
                e.id === id
                  ? {
                      ...e,
                      title,
                    }
                  : e,
              ),
            })
          }
          onDelete={deleteResume}
          onAgentSave={(document, title, resultId) => {
            const base = libraryRef.current;
            let next;
            if (resultId && base.entries.some((e) => e.id === resultId)) {
              next = {
                ...base,
                activeId: resultId,
                entries: base.entries.map((e) =>
                  e.id === resultId
                    ? {
                        ...e,
                        document: structuredClone(document),
                        title,
                        updatedAt: Date.now(),
                      }
                    : e,
                ),
              };
            } else next = addResume(base, document, title);
            try {
              localStorage.setItem(LIBRARY_KEY, JSON.stringify(next));
            } catch {
              throw Error(
                "保存失败，浏览器空间不足。请先备份并释放空间再重试。",
              );
            }
            libraryRef.current = next;
            setLibrary(next);
            resetDocumentUI();
            setDoc(activeDocument(next));
            return next.activeId;
          }}
        />
      ) : (
        <>
          <header className="topbar">
            <a
              className="brand"
              href="/resumes"
              aria-label={t("简历Agent")}
              onClick={(e) => {
                e.preventDefault();
                navigate("/resumes");
              }}
            >
              <span className="brand-mark">
                <FileText size={21} />
              </span>
              <b>{t("简历Agent")}</b>
            </a>
            <button
              className="icon-button editor-back"
              aria-label={t("返回我的简历")}
              onClick={() => navigate("/resumes")}
            >
              <ArrowLeft size={20} />
            </button>
            <div className="document-name">
              <span className="top-divider" />
              {renaming ? (
                <input
                  className="resume-title-input"
                  aria-label={t("简历名称")}
                  autoFocus
                  value={titleDraft}
                  onChange={(e) => setTitleDraft(e.target.value)}
                  onBlur={() => {
                    if (titleDraft.trim())
                      persistLibrary({
                        ...libraryRef.current,
                        entries: libraryRef.current.entries.map((entry) =>
                          entry.id === libraryRef.current.activeId
                            ? {
                                ...entry,
                                title: titleDraft.trim().slice(0, 80),
                              }
                            : entry,
                        ),
                      });
                    setRenaming(false);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.nativeEvent.isComposing)
                      e.currentTarget.blur();
                    if (e.key === "Escape") setRenaming(false);
                  }}
                />
              ) : (
                <button
                  className="resume-title-button"
                  aria-label={t("修改简历名称")}
                  onClick={() => {
                    setTitleDraft(
                      library.entries.find((e) => e.id === library.activeId)
                        ?.title ||
                        (doc.basics.name
                          ? doc.basics.name + "的简历"
                          : t("我的简历")),
                    );
                    setRenaming(true);
                  }}
                >
                  {library.entries.find((e) => e.id === library.activeId)
                    ?.title ||
                    (doc.basics.name
                      ? doc.basics.name + "的简历"
                      : t("我的简历"))}
                  <PenLine size={13} />
                </button>
              )}
              <span className="draft-pill">{t("草稿")}</span>
              <span className="save-indicator">
                <Check size={13} />
                {saved ? t("已自动保存") : t("保存中…")}
              </span>
            </div>
            <div className="top-actions">
              <button
                className="icon-button"
                title={t("撤销")}
                disabled={!history.current.length}
                onClick={undo}
              >
                <Undo2 size={17} />
              </button>
              <button
                className="icon-button"
                title={t("重做")}
                disabled={!future.current.length}
                onClick={redo}
              >
                <Redo2 size={17} />
              </button>
              <span className="top-divider" />
              <button
                className="primary export-pdf-only"
                disabled={!!busy}
                onClick={exportPdf}
              >
                {busy === "export" ? (
                  <Loader2 size={15} className="spin" />
                ) : (
                  <Download size={15} />
                )}
                {t("导出 PDF")}
              </button>
            </div>
          </header>
          <div className="workspace-with-library">
            <div
              className={"workspace " + (!showAgent ? "agent-closed" : "")}
              style={{
                "--agent-width": agentWidth + "px",
                "--editor-width": editorWidth + "px",
              }}
            >
              <aside className="editor-panel">
                <nav className="editor-tabs">
                  {[
                    ["content", PenLine, "内容编辑"],
                    ["templates", LayoutTemplate, "简历模板"],
                    ["layout", SlidersHorizontal, "排版设置"],
                  ].map(([key, Icon, label]) => (
                    <button
                      key={key}
                      className={tab === key ? "active" : ""}
                      onClick={() => setTab(key)}
                    >
                      <Icon size={15} />
                      {t(label)}
                    </button>
                  ))}
                </nav>
                <div className="editor-scroll">
                  {tab === "content" ? (
                    <Editor
                      doc={doc}
                      update={update}
                      onUploadPhoto={uploadPhoto}
                      onCropPhoto={(source, photo) =>
                        setCropTask({
                          source,
                          photo,
                        })
                      }
                      selected={selected}
                      setSelected={(key) => {
                        setSelected(key);
                        setFocusContext(null);
                        setQuoteContext(null);
                        setPopover(null);
                      }}
                    />
                  ) : tab === "templates" ? (
                    <Templates doc={doc} update={update} />
                  ) : (
                    <Layout
                      doc={doc}
                      update={update}
                      onUploadPhoto={uploadPhoto}
                      onCropPhoto={(source, photo) =>
                        setCropTask({
                          source,
                          photo,
                        })
                      }
                    />
                  )}
                </div>
              </aside>
              <div
                className="editor-resizer"
                role="separator"
                aria-label={t("调整编辑栏宽度")}
                aria-orientation="vertical"
                aria-valuemin={260}
                aria-valuemax={600}
                aria-valuenow={editorWidth}
                tabIndex={0}
                onPointerDown={(e) => {
                  e.preventDefault();
                  editorDrag.current = { x: e.clientX, width: editorWidth };
                  e.currentTarget.setPointerCapture(e.pointerId);
                  document.body.classList.add("resizing-panels");
                }}
                onPointerMove={(e) => {
                  if (editorDrag.current)
                    changeEditorWidth(
                      editorDrag.current.width +
                        e.clientX -
                        editorDrag.current.x,
                    );
                }}
                onPointerUp={() => {
                  editorDrag.current = null;
                  document.body.classList.remove("resizing-panels");
                }}
                onPointerCancel={() => {
                  editorDrag.current = null;
                  document.body.classList.remove("resizing-panels");
                }}
                onLostPointerCapture={() => {
                  editorDrag.current = null;
                  document.body.classList.remove("resizing-panels");
                }}
                onKeyDown={(e) => {
                  if (["ArrowLeft", "ArrowRight"].includes(e.key)) {
                    e.preventDefault();
                    changeEditorWidth(
                      editorWidth + (e.key === "ArrowRight" ? 20 : -20),
                    );
                  }
                }}
              >
                <span />
              </div>
              <main className="preview-panel" ref={preview}>
                <div className="preview-toolbar">
                  <div>
                    <span className="tiny-dot" />
                    {t("实时预览")}
                    <span className="preview-badge">A4</span>
                    <span className="muted">
                      {t("共")}
                      {pages}
                      {t("页")}
                    </span>
                  </div>
                  <div>
                    {sourceUrl && (
                      <button
                        className={compare ? "selected" : ""}
                        onClick={() => setCompare(!compare)}
                      >
                        {compare ? t("返回编辑预览") : t("原 PDF 对照")}
                      </button>
                    )}
                    <button
                      className="icon-button"
                      title={t(showAgent ? t("收起助手") : t("展开助手"))}
                      onClick={() => setShowAgent(!showAgent)}
                    >
                      {showAgent ? (
                        <PanelRightClose size={17} />
                      ) : (
                        <PanelRightOpen size={17} />
                      )}
                    </button>
                  </div>
                </div>
                <div className="preview-scroll">
                  {compare ? (
                    <iframe
                      className="original-pdf"
                      src={sourceUrl}
                      title={t("导入的原始 PDF")}
                    />
                  ) : (
                    <div
                      className="paper-stage"
                      style={{
                        width: 794 * zoom,
                        height: pages * 1123 * zoom + (pages - 1) * 24 * zoom,
                      }}
                    >
                      <div
                        className="scaled-paper"
                        style={{
                          transform: `scale(${zoom})`,
                        }}
                      >
                        <Resume
                          doc={doc}
                          onPages={setPages}
                          focusEntry={focusContext?.entryId}
                          onSelect={selectPreview}
                          onEditPhoto={() => {
                            if (doc.photo)
                              setCropTask({
                                source: doc.photo.source,
                                photo: doc.photo,
                              });
                            else photoInput.current.click();
                          }}
                          onHideBasic={(key) => {
                            const pending = inlineDraft.current;
                            const next = pending
                              ? editedDocument(
                                  current.current,
                                  pending.meta,
                                  pending.value,
                                )
                              : structuredClone(current.current);
                            next.basicsVisibility = {
                              ...next.basicsVisibility,
                              [key]: false,
                            };
                            inlineDraft.current = null;
                            commit(next);
                          }}
                          onFinishEditing={(event) => {
                            if (!event?.target.closest(".agent-panel"))
                              setFocusContext(null);
                            setPopover(null);
                          }}
                          onDraft={saveInlineDraft}
                          onEdit={(meta, value) => {
                            inlineDraft.current = null;
                            commit(
                              editedDocument(current.current, meta, value),
                            );
                          }}
                          onInlineAI={(meta, text, mode) => {
                            const row = current.current.sections[
                              meta.section
                            ]?.items.find((e) => e.id === meta.entryId);
                            quoteSelection({
                              section: meta.section,
                              entryId: meta.entryId,
                              text,
                              label:
                                meta.section === "basics"
                                  ? t("基本信息")
                                  : current.current.sections[meta.section]
                                      .label,
                              title: row?.title || "",
                              autoPolish: mode === "polish",
                              instruction:
                                mode === "generate"
                                  ? t(
                                      "请根据选中条目的已有事实组织和补充表达，不编造经历或数据。",
                                    )
                                  : t(
                                      "请润色选中的文字，保持事实不变，表达简洁专业。",
                                    ),
                            });
                          }}
                        />
                      </div>
                    </div>
                  )}
                  <div className="preview-note">
                    {t("你的下一段旅程，从这一页开始。")}
                  </div>
                </div>
                <div className="zoom-controls">
                  <button
                    aria-label={t("缩小")}
                    onClick={() => setZoom(Math.max(0.3, zoom - 0.1))}
                  >
                    <Minus size={14} />
                  </button>
                  <span>{Math.round(zoom * 100)}%</span>
                  <button
                    aria-label={t("放大")}
                    onClick={() => setZoom(Math.min(1.5, zoom + 0.1))}
                  >
                    <Plus size={14} />
                  </button>
                  <i />
                  <span>A4 · 210 × 297 mm</span>
                </div>
              </main>
              {showAgent && (
                <div
                  className="agent-resizer"
                  role="separator"
                  aria-label={t("调整助手宽度")}
                  aria-orientation="vertical"
                  aria-valuemin={280}
                  aria-valuemax={680}
                  aria-valuenow={agentWidth}
                  tabIndex={0}
                  onPointerDown={(e) => {
                    drag.current = {
                      x: e.clientX,
                      width: agentWidth,
                    };
                    e.currentTarget.setPointerCapture(e.pointerId);
                    document.body.classList.add("resizing-panels");
                  }}
                  onPointerMove={(e) => {
                    if (drag.current)
                      changeAgentWidth(
                        drag.current.width + drag.current.x - e.clientX,
                      );
                  }}
                  onPointerUp={() => {
                    drag.current = null;
                    document.body.classList.remove("resizing-panels");
                  }}
                  onPointerCancel={() => {
                    drag.current = null;
                    document.body.classList.remove("resizing-panels");
                  }}
                  onKeyDown={(e) => {
                    if (["ArrowLeft", "ArrowRight"].includes(e.key)) {
                      e.preventDefault();
                      changeAgentWidth(
                        agentWidth + (e.key === "ArrowLeft" ? 20 : -20),
                      );
                    }
                  }}
                >
                  <span />
                </div>
              )}
              {showAgent && (
                <Agent
                  key={library.activeId}
                  reference={agentProfile(profile, preferences)}
                  initialPrompt={initialPrompt}
                  focusContext={focusContext}
                  quoteContext={quoteContext}
                  onQuote={quoteSelection}
                  onClearContext={() => {
                    setQuoteContext(null);
                    setFocusContext(null);
                  }}
                  doc={doc}
                  selected={selected}
                  onApply={(proposal, scope, snapshot, context, source, replay) => {
                    const base = current.current;
                    if (inlineDraft.current || JSON.stringify(base) !== snapshot)
                      throw Error(t("简历已发生变化，请重新生成建议以免覆盖你的修改。"));
                    const next = applyProposal(source, proposal, scope);
                    setCompare(false);
                    setPopover(null);
                    setQuoteContext(null);
                    if (context?.entryId && next.sections[context.section]?.items.some((entry) => entry.id === context.entryId))
                      setFocusContext({ ...context, text: "" });
                    else setFocusContext(null);
                    if (replay) {
                      future.current = [];
                      setDoc(next);
                    } else commit(next);
                    return next;
                  }}
                  onUndoChange={(next) => {
                    if (inlineDraft.current || current.current !== next) return;
                    undo();
                  }}
                  notify={notify}
                />
              )}
            </div>
          </div>
        </>
      )}
      <input
        hidden
        type="file"
        ref={input}
        accept=".pdf,.json"
        onChange={(e) => importFile(e.target.files[0])}
      />
      <input
        hidden
        ref={photoInput}
        type="file"
        aria-label={t("从预览选择简历照片")}
        accept="image/jpeg,image/png,image/webp"
        onChange={(e) => {
          if (e.target.files[0]) uploadPhoto(e.target.files[0]);
          e.target.value = "";
        }}
      />
      {cropTask && (
        <PhotoCropper
          source={cropTask.source}
          photo={cropTask.photo}
          onClose={() => setCropTask(null)}
          onSave={(photo) => {
            if (cropTask.imported)
              setImported((current) => ({
                ...current,
                document: {
                  ...current.document,
                  photo,
                },
              }));
            else
              update((d) => {
                d.photo = photo;
              });
            setCropTask(null);
            notify("照片已裁剪并保存");
          }}
        />
      )}
      {popover && (
        <div
          className="preview-popover"
          style={{
            left: popover.x,
            top: popover.y,
          }}
          role="toolbar"
          aria-label={t("选中内容操作")}
        >
          <span>{popover.context.label}</span>
          <button
            onClick={() => {
              if (
                popover.context.entryId &&
                !doc.sections[popover.context.section]?.items.some(
                  (e) => e.id === popover.context.entryId,
                )
              ) {
                setPopover(null);
                notify("条目已删除，请重新选择");
                return;
              }
              setEditTarget(popover.context);
              setPopover(null);
            }}
          >
            <PenLine size={13} />
            {t("直接编辑")}
          </button>
          <button onClick={() => quoteSelection(popover.context)}>
            <Star size={14} />
            {t("带入对话")}
          </button>
          <button
            aria-label={t("关闭选中操作")}
            onClick={() => setPopover(null)}
          >
            <X size={13} />
          </button>
        </div>
      )}
      {editTarget && (
        <PreviewEditor
          doc={doc}
          target={editTarget}
          onClose={() => setEditTarget(null)}
          onQuote={quoteSelection}
          onSave={(draft) => {
            update((d) => {
              if (editTarget.section === "basics") d.basics = draft;
              else {
                const i = d.sections[editTarget.section].items.findIndex(
                  (e) => e.id === editTarget.entryId,
                );
                if (i >= 0) d.sections[editTarget.section].items[i] = draft;
              }
            });
            notify("已保存预览中的修改");
          }}
        />
      )}
      <footer className="app-footer">
        <span>{t("简历Agent · 清晰表达每一段经历。")}</span>
        <span>
          {t("开源免费")}
          <i />
          {t("无需登录")}
          <i />
          {t("为你的下一步而设计")}
        </span>
      </footer>
      {toast && (
        <div className="toast" role="status">
          {t(toast)}
          <button onClick={() => setToast("")}>
            <X size={14} />
          </button>
        </div>
      )}
      {imported && (
        <div className="modal-backdrop">
          <section className="import-modal">
            <header>
              <div>
                <span className="eyebrow">IMPORT & REVIEW</span>
                <h2>{t(imported.pages ? "AI 已整理栏目，请核对后导入。" : "内容已提取，确认后开始编辑。")}</h2>
              </div>
              <button className="icon-button" onClick={() => setImported(null)}>
                <X size={19} />
              </button>
            </header>
            <p>
              {imported.name} {imported.pages && `· ${imported.pages} 页`}
              {t(
                "。PDF 已转换为可编辑模块；内嵌图片列在下方，可选择照片并重新裁剪。",
              )}
            </p>
            <div className="import-review">
              <div>
                <h3>{t("模块识别结果")}</h3>
                <p>
                  {t("姓名：")}
                  {imported.document.basics.name || "未识别，请补充"}
                </p>
                {imported.document.photo && (
                  <div className="import-selected-photo">
                    <img
                      src={imported.document.photo.dataUrl}
                      alt="导入的简历照片"
                    />
                    <span>{t("已选择照片")}</span>
                    <button
                      onClick={() =>
                        setCropTask({
                          source: imported.document.photo.source,
                          photo: imported.document.photo,
                          imported: true,
                        })
                      }
                    >
                      {t("裁剪")}
                    </button>
                    <button
                      onClick={() =>
                        setImported((current) => {
                          const document = {
                            ...current.document,
                          };
                          delete document.photo;
                          return {
                            ...current,
                            document,
                          };
                        })
                      }
                    >
                      {t("不使用")}
                    </button>
                  </div>
                )}
                {imported.images?.length > 0 && (
                  <div className="import-photo-candidates">
                    {imported.images.map((image) => (
                      <button
                        key={image.id}
                        onClick={() =>
                          setCropTask({
                            source: image.dataUrl,
                            imported: true,
                          })
                        }
                      >
                        <img src={image.dataUrl} alt={"PDF 图片 " + image.id} />
                        <span>
                          {t("第")}
                          {image.page}
                          {t("页")}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
                {imported.imageWarnings?.length > 0 && (
                  <div className="inline-note">
                    {imported.imageWarnings.join("；")}
                  </div>
                )}
                {Object.entries(imported.document.sections).map(([key, s]) => (
                  <div key={key}>
                    {s.items.length ? (
                      <details className="import-section-preview">
                        <summary className="import-section">
                          <b>{s.label}</b>
                          <span>{s.items.length}</span>
                        </summary>
                        {s.items.map((row) => (
                          <article key={row.id}>
                            <strong>{[row.title, row.subtitle, row.date].filter(Boolean).join(" · ")}</strong>
                            <div dangerouslySetInnerHTML={{ __html: safeHtml(row.body) }} />
                          </article>
                        ))}
                      </details>
                    ) : (
                      <div className="import-section">
                        <b>{s.label}</b>
                        <span>{t("暂无内容")}</span>
                      </div>
                    )}
                  </div>
                ))}
                <div className="inline-note">
                  {t(
                    "请对照提取原文，核对是否有遗漏，以及条目标题、日期和内容归属。",
                  )}
                </div>
              </div>
              <div>
                <h3>{t("提取原文 · 可滚动检查")}</h3>
                <pre>{imported.text}</pre>
              </div>
            </div>
            <footer>
              <button className="secondary" onClick={() => setImported(null)}>
                {t("取消")}
              </button>
              <button
                className="primary"
                onClick={() => {
                  newResume(
                    imported.document,
                    imported.name.replace(/\.(pdf|json)$/i, ""),
                  );
                  setSourceUrl(imported.source || "");
                  setImported(null);
                  setSelected("basics");
                  setTab("content");
                  notify("导入成功，请检查各模块内容");
                }}
              >
                {t("确认导入，开始编辑")}
              </button>
            </footer>
          </section>
        </div>
      )}
    </div>
  );
}
