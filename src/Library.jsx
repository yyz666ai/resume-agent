import React from "react";
import { FileText, Plus, Trash2, PenLine, FolderOpen } from "lucide-react";
export default function Library({
  library,
  onSwitch,
  onNew,
  onDelete,
  onRename,
}) {
  return (
    <aside className="resume-library" aria-label="简历列表">
      <header>
        <span>
          <FolderOpen size={15} />
          我的简历
        </span>
        <b>{library.entries.length}</b>
      </header>
      <button className="library-new" onClick={onNew}>
        <Plus size={14} />
        新建简历
      </button>
      <div className="library-items">
        {library.entries.map((entry) => (
          <div
            key={entry.id}
            className={
              "library-card " + (entry.id === library.activeId ? "active" : "")
            }
          >
            <button
              className="library-open"
              onClick={() => onSwitch(entry.id)}
              aria-label={
                "编辑简历 " +
                (entry.title || entry.document.basics.name || "未命名简历")
              }
            >
              <FileText size={20} />
              <strong>
                {entry.title ||
                  (entry.document.basics.name
                    ? entry.document.basics.name + "的简历"
                    : "未命名简历")}
              </strong>
              <small>
                {new Date(entry.updatedAt).toLocaleDateString("zh-CN")} 更新
              </small>
            </button>
            <div className="library-actions">
              <button
                title="重命名简历"
                onClick={() => {
                  const title = prompt(
                    "简历名称",
                    entry.title || entry.document.basics.name + "的简历",
                  );
                  if (title?.trim())
                    onRename(entry.id, title.trim().slice(0, 80));
                }}
              >
                <PenLine size={12} />
              </button>
              <button
                title="删除简历"
                onClick={() => {
                  if (
                    confirm(
                      "删除这份简历？此操作会从列表移除这份简历，请确认已备份。",
                    )
                  )
                    onDelete(entry.id);
                }}
              >
                <Trash2 size={12} />
              </button>
            </div>
          </div>
        ))}
      </div>
      <footer>
        仅保存在此浏览器
        <br />
        重要版本请导出 JSON 备份
      </footer>
    </aside>
  );
}
