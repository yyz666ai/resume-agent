import Reply from "./Reply.jsx";
import { profileReferenceChoice } from "./profile.js";
import { getLanguage, t } from "./i18n.js";
import React, { useEffect, useState, useRef } from "react";
import {
  Sparkles,
  ArrowUp,
  Settings2,
  Check,
  Undo2,
  X,
  ExternalLink,
  Loader2,
  Star,
  ImagePlus,
  Wifi,
  ChevronDown,
} from "lucide-react";
import { MODEL_PROVIDERS } from "./providers.js";
import { MAX_IMAGES, MAX_IMAGE_BYTES } from "./capabilities.js";
import { MODULES, sectionChoices } from "./model.js";
export default function Agent({
  doc,
  selected,
  onApply,
  onUndoChange,
  notify,
  focusContext,
  quoteContext,
  onQuote,
  onClearContext,
  reference,
  settingsOnly = false,
  initialPrompt = "",
}) {
  const [useProfile, setUseProfile] = useState(!!reference?.profile);
  useEffect(() => setUseProfile(!!reference?.profile), [!!reference?.profile]);
  const [status, setStatus] = useState(null),
    [config, setConfig] = useState(settingsOnly),
    [prompt, setPrompt] = useState(initialPrompt),
    [scope, setScope] = useState("all"),
    [busy, setBusy] = useState(false),
    [messages, setMessages] = useState([]);
  const [route, setRoute] = useState({
    provider: "deepseek-official",
    model: "deepseek-flash",
  });
  const [provider, setProvider] = useState("deepseek");
  const [apiKey, setApiKey] = useState("");
  const [baseURL, setBaseURL] = useState("https://api.deepseek.com/anthropic");
  const [testReply, setTestReply] = useState("");
  const [configError, setConfigError] = useState("");
  const providerPreset = MODEL_PROVIDERS[provider];
  const providerConfig =
    status?.providers?.[provider] ||
    (provider === (status?.provider || "deepseek") ? status?.configuration : null);
  function chooseProvider(id) {
    const preset = MODEL_PROVIDERS[id];
    const saved = status?.providers?.[id];
    setProvider(id);
    setApiKey("");
    setRoute((current) => ({
      ...current,
      model: saved?.model ?? preset.models[0] ?? "",
    }));
    setBaseURL(saved?.baseURL ?? preset.baseURL);
    setTestReply("");
    setConfigError("");
  }
  useEffect(() => {
    if (!quoteContext) setScope(initialPrompt ? "all" : selected || "all");
  }, [selected]);
  useEffect(() => {
    if (quoteContext) setScope(quoteContext.section);
  }, [quoteContext?.nonce]);
  useEffect(() => {
    if (quoteContext) {
      setPrompt(
        (p) =>
          quoteContext.instruction ||
          p ||
          "请帮我优化选中的内容，保持事实不变。",
      );
    }
  }, [quoteContext?.nonce]);
  const [attachments, setAttachments] = useState([]);
  const imageInput = useRef(null);
  const conversationRef = useRef(null);
  useEffect(() => {
    const conversation = conversationRef.current;
    if (conversation) conversation.scrollTop = conversation.scrollHeight;
  }, [messages, busy]);
  const live = useRef(true);
  useEffect(() => {
    live.current = true;
    return () => {
      live.current = false;
    };
  }, []);
  const sentInline = useRef(null),
    sendLock = useRef(false);
  useEffect(() => {
    if (
      quoteContext?.autoPolish &&
      status &&
      !busy &&
      sentInline.current !== quoteContext.nonce
    ) {
      sentInline.current = quoteContext.nonce;
      send(quoteContext.instruction, {
        context: quoteContext,
      });
    }
  }, [quoteContext?.nonce, status, busy]);
  const canImages = !!status?.capabilities?.images;
  async function addImages(files) {
    if (busy) return;
    const list = [...files];
    if (!canImages) {
      notify("当前模型未确认支持图片，请切换到 deepseek-flash");
      return;
    }
    if (list.length + attachments.length > MAX_IMAGES) {
      notify("每次最多上传 2 张图片");
      return;
    }
    try {
      const results = [];
      for (const file of list) {
        if (
          !["image/png", "image/jpeg", "image/webp"].includes(file.type) ||
          file.size > MAX_IMAGE_BYTES
        )
          throw Error("请使用 3 MB 以内的 PNG、JPEG 或 WebP 图片");
        const dataURL = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = () => reject(Error("图片读取失败"));
          reader.readAsDataURL(file);
        });
        results.push({
          name: file.name,
          mimeType: file.type,
          data: dataURL.split(",")[1],
          preview: dataURL,
        });
      }
      setAttachments((current) =>
        [...current, ...results].slice(0, MAX_IMAGES),
      );
    } catch (e) {
      notify(e.message);
    }
  }
  async function testOnly() {
    setBusy(true);
    setConfigError("");
    setTestReply("");
    try {
      const response = await fetch("/api/harness/connect", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(route),
      });
      const result = await response.json();
      if (!response.ok) throw Error(result.error);
      setTestReply(result.reply);
      notify("API 联通正常，已收到真实回答");
    } catch (e) {
      setConfigError(e.message);
      setConfig(true);
    } finally {
      setBusy(false);
      refresh(false);
    }
  }
  async function saveAndTest() {
    setBusy(true);
    setConfigError("");
    setTestReply("");
    try {
      if (
        provider !== "deepseek" || apiKey.trim() || providerConfig?.hasKey ||
        (status?.provider && status.provider !== "deepseek")
      ) {
        const saved = await fetch("/api/harness/settings", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            apiKey,
            provider,
            model: route.model,
            baseURL,
          }),
        });
        const data = await saved.json();
        if (!saved.ok) throw Error(data.error);
        setApiKey("");
      }
      const response = await fetch("/api/harness/connect", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(route),
      });
      const result = await response.json();
      if (!response.ok) throw Error(result.error);
      setTestReply(result.reply);
      notify("收到模型真实回答，API 测试通过");
    } catch (e) {
      setConfigError(e.message);
    } finally {
      setBusy(false);
      refresh(false);
    }
  }
  const refresh = (syncForm = true) =>
    fetch("/api/harness/status")
      .then((r) => r.json())
      .then((data) => {
        setStatus(data);
        if (syncForm && data.configuration) {
          setProvider(data.provider || "deepseek");
          setRoute((r) => ({
            ...r,
            model: data.configuration.model,
          }));
          setBaseURL(data.configuration.baseURL);
        }
        if (!data.configuration?.hasKey && !data.apiVerified) setConfig(true);
      })
      .catch(() =>
        setStatus({
          installed: false,
          message: "服务连接失败",
        }),
      );
  useEffect(() => {
    refresh();
  }, []);
  async function send(text = prompt, options = {}) {
    const context = options.replay ? options.context : options.context || quoteContext || focusContext;
    const requestScope = options.scope ?? context?.section ?? scope;
    const source = options.source ?? doc;
    const requestImages = options.images ?? attachments;
    const conversation = options.conversation ?? messages
      .filter(({ role }) => role === "user" || role === "assistant")
      .slice(-12)
      .map(({ role, text }) => ({ role, text: text.slice(0, 6000) }));
    const snapshot = JSON.stringify(doc);
    const includeProfile = profileReferenceChoice(text, useProfile);
    setUseProfile(includeProfile);
    if (
      (!text.trim() && !requestImages.length) ||
      busy ||
      sendLock.current
    ) return;
    if (!text.trim())
      text = "请分析这些图片与当前简历相关的信息，先给出建议，不直接修改简历。";
    if (!status?.apiVerified && !status?.configuration?.hasKey) {
      setConfig(true);
      setConfigError(
        "请先填写 API Key，并点击“保存并测试回答”，测试通过后即可聊天。",
      );
      return;
    }
    sendLock.current = true;
    setPrompt("");
    setMessages((m) => [
      ...m,
      {
        role: "user",
        text,
        images: requestImages.map((a) => ({
          ...a,
        })),
      },
    ]);
    setBusy(true);
    try {
      if (!status?.apiVerified) {
        const check = await fetch("/api/harness/connect", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(route),
        });
        const result = await check.json();
        if (!check.ok) throw Error(result.error);
      }
      const r = await fetch("/api/agent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          document: source,
          reference: includeProfile
            ? reference
            : reference
              ? {
                  writingStyle: reference.writingStyle,
                  targetJob: reference.targetJob,
                }
              : undefined,
          conversation,
          prompt: text,
          scope: requestScope,
          language: getLanguage(),
          route,
          images: requestImages.map(({ name, mimeType, data }) => ({
            name,
            mimeType,
            data,
          })),
          target: context?.entryId ? context : undefined,
        }),
      });
      const data = await r.json();
      if (!live.current) return;
      if (!r.ok) throw Error(data.error);
      const proposal = data.proposal;
      const hasChanges = proposal.changes?.length || proposal.style ||
        proposal.sections?.length || proposal.sectionStyles?.length || proposal.entryStyles?.length;
      const next = hasChanges ? onApply(proposal, requestScope, snapshot, context, source, options.replay) : null;
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          text: proposal.message || (next ? t("已更新到简历") : t("已完成分析")),
          change: next ? {
            next,
            text,
            options: { replay: true, context, scope: requestScope, source, images: requestImages, conversation },
          } : null,
        },
      ]);
      setAttachments([]);
      refresh();
    } catch (e) {
      setMessages((m) => [
        ...m,
        {
          role: "error",
          text: e.message,
        },
      ]);
      setPrompt((previous) => previous || text);
    } finally {
      sendLock.current = false;
      setBusy(false);
    }
  }
  return (
    <aside className={"agent-panel " + (settingsOnly ? "settings-only" : "")}>
      <header className="agent-heading">
        <div>
          <Sparkles size={17} />
          <strong>{t("简历助手")}</strong>
          <span
            className={
              "agent-status-light " +
              (status?.apiVerified
                ? "online"
                : status?.configuration?.hasKey
                  ? "configured"
                  : "offline")
            }
            role="status"
            aria-label={t(
              status?.apiVerified
                ? t("API 联通正常")
                : status?.configuration?.hasKey
                  ? t("API 已配置，待测试")
                  : t("API 未配置"),
            )}
            title={t(
              status?.apiVerified
                ? t("API 已配置，联通正常")
                : status?.configuration?.hasKey
                  ? t("API 已配置，打开设置可测试")
                  : t("点击设置配置 API"),
            )}
          />
        </div>
        <button
          className="icon-button"
          aria-label={t("Harness 设置")}
          onClick={() => setConfig(!config)}
        >
          <Settings2 size={17} />
        </button>
      </header>
      {config && (
        <div className="agent-config">
          <div className="config-connection-group">
            <div className="agent-connection">
              <span
                className={
                  "tiny-dot " + (status?.apiVerified ? "online" : "offline")
                }
              />
              <span>
                {status?.configuration?.hasKey
                  ? t("API 已配置")
                  : status?.apiVerified
                    ? t("Harness 已配置")
                    : t("未配置 API")}
              </span>
              <span
                className={
                  "connection-result " + (status?.apiVerified ? "ok" : "")
                }
              >
                {status?.apiVerified
                  ? t("联通正常")
                  : status?.lastTestError
                    ? t("测试失败")
                    : t("待测试")}
              </span>
              <button
                disabled={busy || provider !== (status?.provider || "deepseek")}
                onClick={testOnly}
                aria-label={t("测试 API 联通")}
              >
                {busy ? (
                  <Loader2 size={12} className="spin" />
                ) : (
                  <Wifi size={12} />
                )}
                {t("测试联通")}
              </button>
              <button onClick={() => setConfig(!config)}>{t("设置")}</button>
            </div>
            <div className="agent-model-capability">
              {MODEL_PROVIDERS[status?.provider || "deepseek"].label} ·{" "}
              {status?.configuration?.model || t("加载模型…")} ·{" "}
              {canImages ? t("支持图片理解") : t("当前模型未确认支持图片")}
              {status?.lastTestedAt && (
                <span>
                  {t("最近测试")}{" "}
                  {new Date(status.lastTestedAt).toLocaleTimeString("zh-CN", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              )}
            </div>
          </div>
          <div className="config-title">
            <strong>{t("模型提供商")}</strong>
            <button className="icon-button" onClick={() => setConfig(false)}>
              <X size={14} />
            </button>
          </div>
          <label className="field">
            <span>{t("选择提供商")}</span>
            <span className="settings-select">
              <select
                aria-label={t("选择提供商")}
                value={provider}
                disabled={busy}
                onChange={(e) => chooseProvider(e.target.value)}
              >
                {Object.entries(MODEL_PROVIDERS).map(([id, preset]) => (
                  <option key={id} value={id}>
                    {t(preset.label)}{status?.provider === id ? " · " + t("当前使用") : ""}
                  </option>
                ))}
              </select>
              <ChevronDown size={15} aria-hidden="true" />
            </span>
          </label>
          <label className="field">
            <span>{provider === "deepseek" ? "DeepSeek API Key" : t("API Key")}</span>
            <input
              type="password"
              autoComplete="new-password"
              aria-label={provider === "deepseek" ? "DeepSeek API Key" : t("API Key")}
              value={apiKey}
              placeholder={t(
                providerConfig?.hasKey
                  ? t("已保存密钥；留空继续使用")
                  : t("输入当前提供商的 API Key"),
              )}
              onChange={(e) => setApiKey(e.target.value)}
            />
          </label>
          <p className="muted">
            {t(
              "密钥仅保存在服务端忽略提交的环境文件中，不会回显或存入浏览器。",
            )}
          </p>
          <label className="field">
            <span>{t("模型")}</span>
            <input
              aria-label={t("模型 ID")}
              value={route.model}
              onChange={(e) =>
                setRoute({
                  ...route,
                  model: e.target.value,
                })
              }
            />
          </label>
          {providerPreset.models.length > 0 && (
            <div className="model-shortcuts">
              {providerPreset.models.map((model) => (
                <button
                  key={model}
                  type="button"
                  disabled={busy}
                  aria-pressed={route.model === model}
                  onClick={() => setRoute((current) => ({ ...current, model }))}
                >
                  {model}
                </button>
              ))}
            </div>
          )}
          <label className="field">
            <span>{t(provider === "deepseek" ? "API 地址（Messages 协议）" : "API 地址（Chat Completions）")}</span>
            <input
              aria-label={t("API 地址")}
              value={baseURL}
              onChange={(e) => setBaseURL(e.target.value)}
            />
          </label>
          <button
            className="primary small-button"
            disabled={busy}
            onClick={saveAndTest}
          >
            {busy ? <Loader2 size={13} className="spin" /> : null}
            {t("保存并测试回答")}
          </button>
          {testReply && (
            <div className="api-test-success" role="status">
              <Check size={13} />
              {t("模型回复：")}
              {testReply}
            </div>
          )}
          {configError && (
            <div className="api-test-error" role="alert">
              {configError}
            </div>
          )}
          {provider === "deepseek" && (
            <details className="harness-advanced">
              <summary>
                <ChevronDown size={15} aria-hidden="true" />
                {t("使用已有 Harness 配置")}
              </summary>
              <p>
                {t(
                  "已在 Harness 配过 API 的用户可以不填写新密钥，直接测试；没有配置时无法回答。",
                )}
              </p>
              <a href="http://127.0.0.1:3080" target="_blank" rel="noreferrer">
                {t("打开 Harness 设置")}
                <ExternalLink size={12} />
              </a>
              <label className="field">
                <span>Provider ID</span>
                <input
                  value={route.provider}
                  onChange={(e) =>
                    setRoute({
                      ...route,
                      provider: e.target.value,
                    })
                  }
                />
              </label>
            </details>
          )}
        </div>
      )}
      <div className="agent-conversation" ref={conversationRef}>
        {messages.length === 0 ? (
          <div className="agent-welcome compact-welcome">
            <div className="assistant-avatar">
              <Sparkles size={26} />
            </div>
            <div>
              <strong>{t("简历助手")}</strong>
              <p>{t("你的 AI 求职助手")}</p>
            </div>
          </div>
        ) : (
          messages.map((m, i) => (
            <div key={i} className={"chat-message " + m.role}>
              {m.role === "assistant" && (
                <div className="message-author">
                  <Sparkles size={12} />
                  {t("简历助手")}
                </div>
              )}
              {m.role === "assistant" ? <div className="chat-markdown"><Reply text={m.text} /></div> : <div>{m.text}</div>}
              {m.change && m.change.next === doc && (
                <div className="chat-change">
                  <p><Check size={14} />{t("已更新到简历")}</p>
                  <div className="proposal-actions">
                    <button className="primary small-button" disabled={busy}
                      onClick={() => send(m.change.text, m.change.options)}>
                      {t("重新生成")}
                    </button>
                    <button className="secondary small-button" disabled={busy}
                      onClick={() => onUndoChange(m.change.next)}>
                      <Undo2 size={14} />{t("撤回本次修改")}
                    </button>
                  </div>
                </div>
              )}
              {m.images?.length > 0 && (
                <div className="chat-images">
                  {m.images.map((a, n) => (
                    <img
                      key={n}
                      src={a.preview}
                      alt={a.name || "已上传的参考图片"}
                    />
                  ))}
                </div>
              )}
            </div>
          ))
        )}
        {busy && (
          <div className="agent-thinking">
            <Loader2 size={15} className="spin" />
            {t("正在等待模型回复…")}
          </div>
        )}
      </div>
      <div className="agent-compose">
        {reference?.profile && useProfile && (
          <div className="agent-profile-hint">
            <Check size={11} />
            {t("本次参考个人档案")}
          </div>
        )}
        <div className="agent-quick-actions">
          <button
            disabled={busy}
            onClick={() =>
              setPrompt(
                "请根据当前选中的内容和已有事实生成简历表达，我的具体要求是：",
              )
            }
          >
            <Sparkles size={14} />
            {t("AI生成")}
          </button>
          <button
            disabled={busy}
            onClick={() =>
              send("请润色选定范围的文字，保持事实不变，表达更清晰简洁。", {
                context: quoteContext || focusContext,
              })
            }
          >
            <Star size={14} />
            {t("AI润色")}
          </button>
          <button
            disabled={busy}
            onClick={() =>
              send("请诊断选定范围的简历内容，指出具体改进建议，先不修改。")
            }
          >
            <Check size={14} />
            {t("AI诊断")}
          </button>
        </div>
        <div
          className="compose-box"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            addImages(e.dataTransfer.files);
          }}
        >
          {(quoteContext || focusContext) && (
            <div
              className="selection-chip"
              title={t((quoteContext || focusContext).title || "")}
            >
              <Star size={11} />
              <span>
                {(quoteContext || focusContext).label}
                {(quoteContext || focusContext).title
                  ? " · " + (quoteContext || focusContext).title
                  : ""}
              </span>
              <button
                aria-label={t("清除选中内容")}
                onClick={() => {
                  onClearContext?.();
                  setScope("all");
                }}
              >
                <X size={12} />
              </button>
            </div>
          )}
          {attachments.length > 0 && (
            <div className="compose-attachments">
              {attachments.map((a, i) => (
                <div key={i}>
                  <img src={a.preview} alt={a.name} />
                  <button
                    aria-label={t("移除图片 " + (i + 1))}
                    onClick={() =>
                      setAttachments((current) =>
                        current.filter((_, n) => n !== i),
                      )
                    }
                  >
                    <X size={11} />
                  </button>
                  <span>{a.name}</span>
                </div>
              ))}
            </div>
          )}
          <input
            ref={imageInput}
            type="file"
            hidden
            multiple
            accept="image/png,image/jpeg,image/webp"
            aria-label={t("选择参考图片")}
            onChange={(e) => {
              addImages(e.target.files);
              e.target.value = "";
            }}
          />
          <textarea
            aria-label={t("给简历助手发送消息")}
            onPaste={(e) => {
              const files = [...e.clipboardData.items]
                .filter((i) => i.kind === "file" && i.type.startsWith("image/"))
                .map((i) => i.getAsFile())
                .filter(Boolean);
              if (files.length) {
                e.preventDefault();
                addImages(files);
              }
            }}
            placeholder={t("告诉我，你想怎样优化简历…")}
            value={prompt}
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
          <div className="compose-bottom">
            <button
              className="attach-image"
              aria-label={t("上传参考图片")}
              title={t(
                canImages
                  ? t("上传图片，也可粘贴或拖入")
                  : t("当前模型未确认支持图片"),
              )}
              disabled={busy || !canImages || attachments.length >= MAX_IMAGES}
              onClick={() => imageInput.current.click()}
            >
              <ImagePlus size={16} />
            </button>
            <select
              aria-label={t("助手修改范围")}
              value={scope}
              onChange={(e) => {
                onClearContext?.();
                setScope(e.target.value);
              }}
            >
              <option value="all">{t("整份简历")}</option>
              <option value="basics">{t("基本信息")}</option>
              {sectionChoices(doc).map(([k, label]) => (
                <option value={k} key={k}>
                  {t(label)}
                </option>
              ))}
            </select>
            <button
              title={t("发送")}
              aria-label={t("发送消息")}
              disabled={busy || (!prompt.trim() && !attachments.length)}
              onClick={() => send()}
            >
              <ArrowUp size={17} />
            </button>
          </div>
        </div>
        <p>{t("内容由 AI 生成，请核对后使用")}</p>
      </div>
    </aside>
  );
}
