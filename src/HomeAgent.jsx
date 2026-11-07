import { getLanguage, t } from "./i18n.js";
import React, { useEffect, useRef, useState } from "react";
import {
  ArrowUp,
  Plus,
  FileText,
  X,
  Sparkles,
  Loader2,
  ArrowUpRight,
  Check,
  RotateCcw,
  Settings2,
} from "lucide-react";
import { applyProposal, emptyResume } from "./model.js";
import { agentProfile, profileReferenceChoice } from "./profile.js";
import { initialAgentDocument, automaticResumeTitle } from "./home-agent.js";
function Reply({ text }) {
  const blocks = [];
  for (const line of text.split("\n")) {
    const bullet = line.match(/^\s*[-*•]\s+(.+)/);
    const numbered = line.match(/^\s*(\d+)[.)]\s+(.+)/);
    const list = bullet || numbered;
    const kind = bullet ? "ul" : numbered ? "ol" : "p";
    if (list && blocks.at(-1)?.kind === kind) {
      blocks.at(-1).lines.push(list.at(-1));
    } else if (line.trim()) {
      blocks.push({ kind, start: numbered?.[1], lines: [list ? list.at(-1) : line] });
    }
  }
  const emphasis = (line) =>
    line.split(/(\*\*[^*]+\*\*)/).map((part, index) =>
      index % 2 ? <strong key={index}>{part.slice(2, -2)}</strong> : part,
    );
  return blocks.map(({ kind: Tag, start, lines }, index) =>
    Tag === "p" ? (
      <p key={index}>{emphasis(lines[0])}</p>
    ) : (
      <Tag key={index} start={start}>
        {lines.map((line, i) => <li key={i}>{emphasis(line)}</li>)}
      </Tag>
    ),
  );
}
export default function HomeAgent({
  library,
  profile,
  preferences,
  onSave,
  onUpdateProfile,
  onEdit,
  navigate,
}) {
  const [prompt, setPrompt] = useState(""),
    [file, setFile] = useState(null),
    [source, setSource] = useState(""),
    [draft, setDraft] = useState(null),
    [messages, setMessages] = useState([]),
    [stage, setStage] = useState(""),
    [error, setError] = useState(""),
    [dragging, setDragging] = useState(false);
  const [useProfile, setUseProfile] = useState(preferences.useProfile),
    [profileSuggestion, setProfileSuggestion] = useState(null);
  useEffect(
    () => setUseProfile(preferences.useProfile),
    [preferences.useProfile],
  );
  const input = useRef(),
    controller = useRef(),
    busy = useRef(false),
    mounted = useRef(true),
    thread = useRef();
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      controller.current?.abort();
    };
  }, []);
  useEffect(() => {
    if (thread.current) thread.current.scrollTop = thread.current.scrollHeight;
  }, [messages, stage, draft, error, profileSuggestion]);
  function reset() {
    setProfileSuggestion(null);
    setDraft(null);
    setMessages([]);
    setError("");
    setFile(null);
    setSource("");
    setPrompt("");
  }
  function choose(file) {
    if (!file) return;
    if (!/\.pdf$/i.test(file.name)) {
      setError("请上传 PDF 简历，其他备份可使用下方的导入功能。");
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      setError("PDF 不能超过 15 MB，请压缩后重试。");
      return;
    }
    setProfileSuggestion(null);
    setFile(file);
    setSource("");
    setDraft(null);
    setMessages([]);
    setError("");
  }
  async function send() {
    if (busy.current) return;
    const text =
      prompt.trim() ||
      (file ? "请整理这份简历，保持事实不变，让表达更清晰简洁。" : "");
    if (!text) return;
    const referenceEnabled = profileReferenceChoice(text, useProfile);
    setUseProfile(referenceEnabled);
    busy.current = true;
    setError("");
    setProfileSuggestion(null);
    setPrompt("");
    const abort = new AbortController();
    controller.current = abort;
    const signal = abort.signal;
    const call = async (url, options = {}) => {
      const response = await fetch(url, {
        ...options,
        signal,
      });
      const result = await response.json();
      if (!response.ok) throw Error(result.error || "操作失败，请重试");
      return result;
    };
    const post = (url, value) =>
      call(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(value),
      });
    setMessages((old) => [
      ...old,
      {
        role: "user",
        text,
        ...(file && !draft
          ? {
              filename: file.name,
            }
          : {}),
      },
    ]);
    try {
      let working = draft;
      if (!working) {
        let document;
        let warnings = [];
        if (file) {
          setStage("正在提取 PDF 原文，由 AI 整理到对应栏目…");
          const form = new FormData();
          form.append("file", file);
          const result = await call("/api/import?mode=ai", {
            method: "POST",
            body: form,
          });
          document = result.document;
          warnings = result.imageWarnings || [];
          if (mounted.current)
            setMessages((old) => [
              ...old,
              {
                role: "status",
                text: `已用 AI 整理 ${result.pages || ""} 页 PDF，使用经典留白。${document.photo ? "已提取照片。" : ""}`,
              },
            ]);
        } else {
          const original =
            source === "profile"
              ? profile.document
              : source
                ? library.entries.find((e) => e.id === source)?.document
                : referenceEnabled
                  ? profile.document
                  : emptyResume();
          if (!original) throw Error("所选简历已不存在，请重新选择");
          document = initialAgentDocument(original);
        }
        if (signal.aborted) return;
        const title = automaticResumeTitle(document, file?.name || "");
        const hasContent =
          document.basics.name ||
          Object.values(document.sections).some((s) =>
            s.items.some((row) => row.title || row.body),
          );
        const id =
          file || source || hasContent ? onSave(document, title) : undefined;
        working = {
          document,
          title,
          id,
          warnings,
        };
        setDraft(working);
      }
      setStage("正在连接简历Agent…");
      const status = await call("/api/harness/status");
      if (!status.apiVerified) {
        if (!status.configuration?.hasKey && !status.connected)
          throw Error(
            "简历已整理并保存。请先到 Agent 设置配置 API，再回来继续发送；也可以直接进入编辑器。",
          );
        await post("/api/harness/connect", {});
      }
      setStage("正在按你的要求修改简历…");
      const result = await post("/api/agent", {
        document: working.document,
        prompt: text,
        scope: "all",
        language: getLanguage(),
        workflow: "home",
        reference: agentProfile(profile, {
          ...preferences,
          useProfile: referenceEnabled,
        }),
        conversation: messages
          .filter((m) => ["user", "assistant"].includes(m.role))
          .slice(-12)
          .map(({ role, text }) => ({
            role,
            text: text.slice(0, 6000),
          })),
      });
      if (signal.aborted) return;
      const document = applyProposal(working.document, result.proposal, "all");
      const title = automaticResumeTitle(
        document,
        file?.name || "",
        result.proposal.resumeTitle,
      );
      const hasContent =
        document.basics.name ||
        Object.values(document.sections).some((s) =>
          s.items.some((row) => row.title || row.body),
        );
      const id =
        working.id || hasContent
          ? onSave(document, title, working.id)
          : undefined;
      setProfileSuggestion(result.proposal.profileSuggestion || null);
      setDraft({
        ...working,
        document,
        title,
        id,
      });
      setMessages((old) => [
        ...old,
        {
          role: "assistant",
          text:
            result.proposal.message ||
            "已完成修改，可以继续提要求，或进入编辑器查看。",
        },
      ]);
    } catch (e) {
      if (e.name !== "AbortError" && mounted.current) {
        setError(e.message);
        setPrompt((p) => p || text);
      }
    } finally {
      busy.current = false;
      if (mounted.current) setStage("");
    }
  }
  return (
    <section className="home-agent" aria-label={t("简历Agent")}>
      <div className="home-agent-thread" ref={thread}>
        {!messages.length && (
          <div className="home-agent-intro">
            <div className="home-agent-symbol">
              <Sparkles size={24} />
            </div>
            <h1>{t("简历Agent")}</h1>
            <p>{t("上传简历或直接聊聊你的经历，我来帮你整理。")}</p>
          </div>
        )}
        <div aria-live="polite">
          {messages.map((message, i) => (
            <div key={i} className={"home-agent-message " + message.role}>
              <div>
                {message.filename && (
                  <small>
                    <FileText size={12} />
                    {message.filename}
                  </small>
                )}
                {message.role === "assistant" ? (
                  <Reply text={message.text} />
                ) : (
                  <p>{message.role === "status" ? t(message.text) : message.text}</p>
                )}
              </div>
            </div>
          ))}
        </div>
        {stage && (
          <div className="home-agent-progress" role="status">
            <Loader2 size={13} className="spin" />
            {t(stage)}
          </div>
        )}
        {error && (
          <div className="home-agent-error" role="alert">
            {t(error)}
            <button onClick={() => navigate("/settings?tab=api")}>
              {t("Agent 设置")}
              <ArrowUpRight size={12} />
            </button>
          </div>
        )}
        {draft?.id && !stage && (
          <div className="home-agent-result">
            <div className="home-agent-result-icon">
              <Check size={20} />
            </div>
            <div>
              <strong>{draft.title}</strong>
              <p>
                {error
                  ? t("解析内容已保存，可以直接编辑。")
                  : t("已保存到我的简历，可继续对话修改。")}
              </p>
              {draft.warnings?.length > 0 && (
                <details>
                  <summary>{t("查看 PDF 解析提示")}</summary>
                  {draft.warnings.map((warning, i) => (
                    <p key={i}>{warning}</p>
                  ))}
                </details>
              )}
            </div>
            <button className="primary" onClick={() => onEdit(draft.id)}>
              {t("进入编辑器")}
              <ArrowUpRight size={15} />
            </button>
          </div>
        )}
        {profileSuggestion && (
          <div className="profile-suggestion">
            <strong>{t("将这段真实经历补充到个人档案？")}</strong>
            <p>{profileSuggestion.notes}</p>
            <small>
              {t("依据你的原话：")}
              {profileSuggestion.quote}
            </small>
            <div>
              <button
                className="primary"
                onClick={() => {
                  const notes = profile.notes.includes(profileSuggestion.notes)
                    ? profile.notes
                    : [profile.notes, profileSuggestion.notes]
                        .filter(Boolean)
                        .join("\n\n");
                  if (notes.length > 20000) {
                    setError("档案内容已满，请先在个人档案中整理后再添加。");
                    return;
                  }
                  if (onUpdateProfile({ ...profile, notes }) === false) {
                    setError("档案保存失败，请先释放浏览器空间再试。");
                    return;
                  }
                  setProfileSuggestion(null);
                  setMessages((old) => [
                    ...old,
                    {
                      role: "status",
                      text: "已补充到个人档案",
                    },
                  ]);
                }}
              >
                {t("保存到个人档案")}
              </button>
              <button onClick={() => setProfileSuggestion(null)}>
                {t("暂不添加")}
              </button>
            </div>
          </div>
        )}
      </div>
      <div
        className={"home-agent-input " + (dragging ? "dragging" : "")}
        onDragOver={(e) => {
          e.preventDefault();
          if (!busy.current) setDragging(true);
        }}
        onDragLeave={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget)) setDragging(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (!busy.current) choose(e.dataTransfer.files[0]);
        }}
      >
        {file && (
          <div className="home-agent-attachment">
            <FileText size={17} />
            <span>
              {file.name}
              <small>
                {draft ? t("已解析 · 原始文件保留") : t("PDF 简历")}
              </small>
            </span>
            <button
              disabled={!!stage}
              aria-label={t("移除上传的简历")}
              onClick={() => {
                setFile(null);
                setDraft(null);
                setMessages([]);
                setError("");
              }}
            >
              <X size={14} />
            </button>
          </div>
        )}
        <textarea
          aria-label={t("给简历Agent发送要求")}
          placeholder={t(
            "上传 PDF，然后说：帮我改成适合 AI 产品经理岗位的简历，精简到两页…",
          )}
          maxLength={9000}
          value={prompt}
          disabled={!!stage}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => {
            if (
              e.key === "Enter" &&
              !e.shiftKey &&
              !e.nativeEvent.isComposing &&
              e.keyCode !== 229
            ) {
              e.preventDefault();
              send();
            }
          }}
        />
        <div className="home-agent-controls">
          <input
            ref={input}
            hidden
            type="file"
            accept=".pdf,application/pdf"
            aria-label={t("上传简历Agent PDF")}
            onChange={(e) => {
              choose(e.target.files[0]);
              e.target.value = "";
            }}
          />
          <button
            className="home-agent-add"
            title={t("上传 PDF 简历")}
            aria-label={t("上传 PDF 给简历Agent")}
            disabled={!!stage}
            onClick={() => input.current.click()}
          >
            <Plus size={21} />
          </button>
          {!file && !draft && (
            <select
              aria-label={t("简历Agent参考来源")}
              value={source}
              disabled={!!stage}
              onChange={(e) => {
                setSource(e.target.value);
                setError("");
                setMessages([]);
              }}
            >
              <option value="">{t("或选择一份简历")}</option>
              <option value="profile">{t("使用个人档案")}</option>
              {library.entries.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.title || entry.document.basics.name + "的简历"}
                </option>
              ))}
            </select>
          )}
          <span className="home-agent-layout-hint">
            {t("基础排版 · 自动命名")}
          </span>
          {draft && (
            <button
              className="home-agent-reset"
              disabled={!!stage}
              title={t("开始新任务（已保存的简历保留）")}
              aria-label={t("开始新的简历任务")}
              onClick={reset}
            >
              <RotateCcw size={15} />
            </button>
          )}
          <button
            className="home-agent-send"
            aria-label={t("发送给简历Agent")}
            disabled={!!stage || (!prompt.trim() && !file)}
            onClick={send}
          >
            {stage ? (
              <Loader2 size={19} className="spin" />
            ) : (
              <ArrowUp size={21} />
            )}
          </button>
        </div>
      </div>
      <div className="home-agent-footnote">
        <label className="home-profile-choice">
          <input
            type="checkbox"
            checked={useProfile}
            disabled={!!stage}
            onChange={(e) => setUseProfile(e.target.checked)}
          />
          {t("参考个人档案")}
        </label>
        <span>{t("Enter 发送 · Shift + Enter 换行")}</span>
        <button onClick={() => navigate("/settings?tab=api")}>
          <Settings2 size={12} />
          {t("模型设置")}
        </button>
      </div>
    </section>
  );
}
