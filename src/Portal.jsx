import LanguageSwitcher from "./LanguageSwitcher.jsx";
import { t } from "./i18n.js";
import HomeAgent from "./HomeAgent.jsx";
import React, { useEffect, useRef, useState } from "react";
import {
  FileText,
  UserRound,
  Settings2,
  Plus,
  Upload,
  Loader2,
  Copy,
  PenLine,
  Trash2,
  Sparkles,
  Check,
  Download,
  FolderOpen,
} from "lucide-react";
import Resume from "./Resume.jsx";
import Editor from "./Editor.jsx";
import Agent from "./Agent.jsx";
import PhotoCropper from "./PhotoCropper.jsx";
import { preparePhoto } from "./photo.js";
import { emptyResume } from "./model.js";
import { validateProfile } from "./profile.js";
export const resumeName = (entry) =>
  entry.title ||
  (entry.document.basics.name
    ? entry.document.basics.name + "的简历"
    : "未命名简历");
function download(value, name) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(value, null, 2)], {
      type: "application/json",
    }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function ResumeCard({ entry, onEdit, onCopy, onRename, onDelete }) {
  const [renaming, setRenaming] = useState(false),
    [title, setTitle] = useState("");
  return (
    <article className="home-resume-card">
      <div className="card-preview">
        <button
          className="resume-thumbnail"
          onClick={() => onEdit(entry.id)}
          aria-label={t("编辑简历 " + resumeName(entry))}
        >
          <div className="resume-thumbnail-paper">
            <Resume doc={entry.document} print />
          </div>
          <span className="thumbnail-edit">
            <PenLine size={16} />
            {t("编辑简历")}
          </span>
        </button>
        <div className="card-actions">
          <button
            onClick={() => onCopy(entry.id)}
            aria-label={t("复制简历 " + resumeName(entry))}
            title={t("复制")}
          >
            <Copy size={14} />
          </button>
          <button
            onClick={() => {
              if (confirm("删除“" + resumeName(entry) + "”？请确认已有备份。"))
                onDelete(entry.id);
            }}
            aria-label={t("删除简历 " + resumeName(entry))}
            title={t("删除")}
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
      <div className="card-caption">
        <div className="card-title-row">
          {renaming ? (
            <input
              className="card-rename"
              aria-label={t("新的简历名称")}
              autoFocus
              value={title}
              maxLength={80}
              onFocus={(e) => e.currentTarget.select()}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={() => {
                const next = title.trim();
                if (next && next !== resumeName(entry)) onRename(entry.id, next);
                setRenaming(false);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.nativeEvent.isComposing) e.currentTarget.blur();
                if (e.key === "Escape") setRenaming(false);
              }}
            />
          ) : (
            <>
              <button className="card-title" onClick={() => onEdit(entry.id)}>
                {resumeName(entry)}
              </button>
              <button
                className="card-title-edit"
                onClick={() => {
                  setTitle(resumeName(entry));
                  setRenaming(true);
                }}
                aria-label={t("重命名简历 " + resumeName(entry))}
                title={t("改名")}
              >
                <PenLine size={14} />
              </button>
            </>
          )}
        </div>
        <p className="card-meta">
          {new Date(entry.updatedAt).toLocaleString("zh-CN", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      </div>
    </article>
  );
}
export default function Portal({
  view,
  navigate,
  library,
  onEdit,
  onNew,
  onCopy,
  onRename,
  onDelete,
  onImport,
  onImportFile,
  importing,
  onAgentSave,
  profile,
  setProfile,
  preferences,
  setPreferences,
  notify,
}) {
  const [section, setSection] = useState("basics"),
    [crop, setCrop] = useState(null),
    [settingsTab, setSettingsTab] = useState("preferences"),
    [draggingFile, setDraggingFile] = useState(false);
  const dragDepth = useRef(0);
  function clearFileDrag() {
    dragDepth.current = 0;
    setDraggingFile(false);
  }
  useEffect(() => {
    clearFileDrag();
    if (
      view === "settings" &&
      new URLSearchParams(location.search).get("tab") === "api"
    )
      setSettingsTab("api");
  }, [view]);
  const profileInput = useRef();
  function updateProfile(fn) {
    const next = structuredClone(profile);
    fn(next.document);
    setProfile(next);
  }
  async function photo(file) {
    try {
      setCrop({
        source: await preparePhoto(file),
        photo: null,
      });
    } catch (e) {
      notify(e.message);
    }
  }
  const recentResumes = [...library.entries].sort(
    (a, b) => b.updatedAt - a.updatedAt,
  );
  return (
    <div className={"portal-shell" + (view === "agent" ? " portal-agent-view" : "")}>
      <aside className="portal-sidebar">
        <button className="portal-brand" onClick={() => navigate("/")}>
          <Sparkles size={24} />
          {t("简历Agent")}
        </button>
        <div className="portal-nav-label">{t("我的求职工作台")}</div>
        <nav>
          {[
            ["agent", Sparkles, "简历Agent", "/"],
            ["home", FileText, "我的简历", "/resumes"],
            ["profile", UserRound, "个人档案", "/profile"],
            ["settings", Settings2, "Agent 设置", "/settings"],
          ].map(([key, Icon, label, url]) => (
            <button
              className={view === key ? "active" : ""}
              key={key}
              onClick={() => navigate(url)}
            >
              <Icon size={20} />
              {t(label)}
            </button>
          ))}
        </nav>
        <div className="portal-sidebar-footer">
          <span className="tiny-dot online" />
          {t("自动保存在当前浏览器")}
          <small>{t("无需登录 · 开源免费")}</small>
        </div>
      </aside>
      <main className="portal-main">
        {view === "agent" && (
          <div className="agent-page-content">
            <HomeAgent
              library={library}
              profile={profile}
              preferences={preferences}
              onSave={onAgentSave}
              onUpdateProfile={setProfile}
              onEdit={onEdit}
              navigate={navigate}
            />
          </div>
        )}
        {view === "home" && (
          <div
            className={"home-content home-drop-area" + (draggingFile ? " is-dragging" : "")}
            onDragEnter={(event) => {
              if (!event.dataTransfer.types.includes("Files")) return;
              event.preventDefault();
              dragDepth.current++;
              if (!importing) setDraggingFile(true);
            }}
            onDragOver={(event) => {
              if (!event.dataTransfer.types.includes("Files")) return;
              event.preventDefault();
              event.dataTransfer.dropEffect = importing ? "none" : "copy";
            }}
            onDragLeave={() => {
              dragDepth.current = Math.max(0, dragDepth.current - 1);
              if (!dragDepth.current) setDraggingFile(false);
            }}
            onDrop={(event) => {
              if (!event.dataTransfer.types.includes("Files")) return;
              event.preventDefault();
              clearFileDrag();
              if (importing) return;
              const { files } = event.dataTransfer;
              if (files.length > 1) {
                notify(t("请一次拖入一个文件。"));
                return;
              }
              onImportFile(files[0]);
            }}
          >
            <div className="home-library-heading">
              <div>
                <h2>
                  {t("我的简历")}
                  <span>{library.entries.length}</span>
                </h2>
              </div>
              <div className="home-primary-actions">
                <button
                  className="secondary"
                  onClick={() => onNew(profile.document, "基于个人档案的简历")}
                >
                  <FolderOpen size={15} />
                  {t("从档案创建")}
                </button>
                <button
                  className="secondary"
                  disabled={importing}
                  onClick={onImport}
                >
                  <Upload size={16} />
                  {t("导入 PDF / JSON")}
                </button>
                <button
                  className="primary"
                  onClick={() => onNew(emptyResume(), "新简历")}
                >
                  <Plus size={17} />
                  {t("新建简历")}
                </button>
              </div>
            </div>
            <button
              type="button"
              className={"resume-drop-button" + (recentResumes.length ? "" : " empty")}
              onClick={onImport}
              disabled={importing}
              aria-busy={importing}
            >
              {importing ? <Loader2 size={22} className="spin" /> : <Upload size={22} />}
              <span role="status">
                {t(importing ? "正在导入简历…" : "拖入 PDF 或 JSON")}
              </span>
            </button>
            <div className="home-resume-grid">
              {recentResumes.map((entry) => (
                <ResumeCard
                  key={entry.id}
                  entry={entry}
                  onEdit={onEdit}
                  onCopy={onCopy}
                  onRename={onRename}
                  onDelete={onDelete}
                />
              ))}
            </div>
          </div>
        )}
        {view === "profile" && (
          <div className="profile-content">
            <div className="portal-page-intro">
              <h1>{t("个人档案")}</h1>
              <button
                className="secondary"
                onClick={() => download(profile, "个人档案.json")}
              >
                <Download size={15} />
                {t("备份档案")}
              </button>
            </div>
            <div className="profile-layout">
              <nav className="profile-toc">
                <strong>{t("档案目录")}</strong>
                {[
                  ["basics", "个人信息"],
                  ["intent", "求职信息"],
                  ...profile.document.order.map((key) => [
                    key,
                    profile.document.sections[key].label,
                  ]),
                  ["notes", "补充事实"],
                ].map(([key, label]) => (
                  <button
                    key={key}
                    className={section === key ? "active" : ""}
                    onClick={() => setSection(key)}
                  >
                    {t(label)}
                  </button>
                ))}
              </nav>
              <div className="profile-details">
                <div className="profile-source">
                  <span>
                    <Check size={15} />
                    {t("由你维护的真实档案")}
                  </span>
                  <select
                    aria-label={t("从简历填入档案")}
                    value=""
                    onChange={(e) => {
                      if (
                        e.target.value &&
                        confirm(
                          "将所选简历复制到档案？现有档案经历将被替换，求职信息和补充事实保留。",
                        )
                      )
                        setProfile({
                          ...profile,
                          document: structuredClone(
                            library.entries.find((x) => x.id === e.target.value)
                              .document,
                          ),
                        });
                    }}
                  >
                    <option value="">{t("从已有简历填入…")}</option>
                    {library.entries.map((e) => (
                      <option key={e.id} value={e.id}>
                        {resumeName(e)}
                      </option>
                    ))}
                  </select>
                  <button onClick={() => profileInput.current.click()}>
                    {t("导入备份")}
                  </button>
                  <input
                    ref={profileInput}
                    hidden
                    type="file"
                    accept=".json"
                    onChange={async (e) => {
                      try {
                        const f = e.target.files[0];
                        if (f) {
                          if (f.size > 10 * 1024 * 1024)
                            throw Error("档案文件过大");
                          setProfile(
                            validateProfile(JSON.parse(await f.text())),
                          );
                          notify("档案已导入");
                        }
                      } catch (err) {
                        notify(err.message);
                      }
                      e.target.value = "";
                    }}
                  />
                </div>
                {section === "intent" ? (
                  <section className="profile-text-section">
                    <h2>{t("求职信息")}</h2>
                    <p>{t("你期待的岗位、方向、城市与工作方式。")}</p>
                    <textarea
                      aria-label={t("档案求职信息")}
                      value={profile.targetJobs}
                      onChange={(e) =>
                        setProfile({
                          ...profile,
                          targetJobs: e.target.value,
                        })
                      }
                      maxLength={20000}
                      placeholder={t(
                        "例如：AI 产品经理 / 北京；希望突出产品设计与 Agent 项目经历。",
                      )}
                    />
                  </section>
                ) : section === "notes" ? (
                  <section className="profile-text-section">
                    <h2>{t("补充事实")}</h2>
                    <p>
                      {t(
                        "写下暂时没有放进简历的背景、职责、成果与证据。数据不确定时请标注待核实。",
                      )}
                    </p>
                    <textarea
                      aria-label={t("档案补充事实")}
                      value={profile.notes}
                      onChange={(e) =>
                        setProfile({
                          ...profile,
                          notes: e.target.value,
                        })
                      }
                      maxLength={20000}
                      placeholder={t(
                        "可以大致描述你真实做过的事，不需要先写成漂亮的简历。",
                      )}
                    />
                  </section>
                ) : (
                  <Editor
                    doc={profile.document}
                    selected={section}
                    setSelected={(key) => setSection(key || section)}
                    update={updateProfile}
                    onUploadPhoto={photo}
                    onCropPhoto={(source, photo) =>
                      setCrop({
                        source,
                        photo,
                      })
                    }
                  />
                )}
              </div>
            </div>
          </div>
        )}
        {view === "settings" && (
          <div className="portal-settings">
            <nav className="settings-toc">
              {[
                ["preferences", "档案与写作偏好"],
                ["api", "模型与 API"],
              ].map(([key, label]) => (
                <button
                  key={key}
                  className={settingsTab === key ? "active" : ""}
                  aria-current={settingsTab === key ? "page" : undefined}
                  onClick={() => setSettingsTab(key)}
                >
                  {t(label)}
                </button>
              ))}
            </nav>
            <div className="settings-detail">
              {settingsTab === "preferences" ? (
                <>
                  <h1>{t("档案与写作偏好")}</h1>
                  <p className="settings-description">
                    {t("让助手理解你的求职方向，保留每一段经历的真实性。")}
                  </p>
                  <div className="settings-card settings-preferences">
                    <LanguageSwitcher />
                    <div className="settings-toggle">
                      <div>
                        <strong>{t("参考个人档案")}</strong>
                        <p>
                          {t(
                            "发送修改请求时，将档案中的经历一并提供给当前模型。",
                          )}
                        </p>
                      </div>
                      <button
                        className={
                          "switch " + (preferences.useProfile ? "on" : "")
                        }
                        role="switch"
                        aria-label={t("参考个人档案")}
                        aria-checked={preferences.useProfile}
                        onClick={() =>
                          setPreferences({
                            ...preferences,
                            useProfile: !preferences.useProfile,
                          })
                        }
                      >
                        <span />
                      </button>
                    </div>
                    <label className="settings-field">
                      {t("默认目标岗位")}
                      <input
                        aria-label={t("默认目标岗位")}
                        placeholder={t("例如：AI 产品经理")}
                        value={preferences.targetJob}
                        maxLength={2000}
                        onChange={(e) =>
                          setPreferences({
                            ...preferences,
                            targetJob: e.target.value,
                          })
                        }
                      />
                    </label>
                    <label className="settings-field">
                      {t("表达偏好")}
                      <textarea
                        aria-label={t("表达偏好")}
                        value={preferences.writingStyle}
                        maxLength={2000}
                        onChange={(e) =>
                          setPreferences({
                            ...preferences,
                            writingStyle: e.target.value,
                          })
                        }
                      />
                    </label>
                    <div className="truth-note">
                      <Check size={17} />
                      <div>
                        <strong>{t("真实经历始终优先")}</strong>
                        <p>
                          {t(
                            "不补造数字、不虚构职责；档案只由你维护，助手的改写不会自动成为新事实。",
                          )}
                        </p>
                      </div>
                    </div>
                    <button
                      className="secondary"
                      onClick={() => navigate("/profile")}
                    >
                      <UserRound size={15} />
                      {t("管理个人档案")}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <h1>{t("模型与 API")}</h1>
                  <p className="settings-description">
                    {t(
                      "为各提供商分别配置 API。保存后，简历助手和 PDF 导入使用当前模型。",
                    )}
                  </p>
                  <Agent
                    settingsOnly
                    doc={emptyResume()}
                    selected="all"
                    notify={notify}
                  />
                </>
              )}
            </div>
          </div>
        )}
      </main>
      {crop && (
        <PhotoCropper
          source={crop.source}
          photo={crop.photo}
          onClose={() => setCrop(null)}
          onSave={(photo) => {
            updateProfile((d) => {
              d.photo = photo;
            });
            setCrop(null);
          }}
        />
      )}
    </div>
  );
}
