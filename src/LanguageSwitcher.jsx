import { ChevronDown } from "lucide-react";
import React from "react";
import { t, useLanguage } from "./i18n.js";
export default function LanguageSwitcher() {
  const [language, setLanguage] = useLanguage();
  return (
    <label className="settings-field settings-language">
      <span>
        {t("界面语言")}
        <small>{t("只切换界面文字，不修改简历内容。")}</small>
      </span>
      <span className="settings-select">
        <select
          aria-label="界面语言 / Interface language"
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
        >
          <option value="zh">简体中文</option>
          <option value="en">English</option>
        </select>
        <ChevronDown size={16} aria-hidden="true" />
      </span>
    </label>
  );
}
