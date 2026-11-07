import { t } from "./i18n.js";
import React, { useRef } from "react";
import {
  Plus,
  Camera,
  Phone,
  Mail,
  MapPin,
  Calendar,
  User,
  Globe,
  MessageCircle,
  Home,
  Briefcase,
  Info,
} from "lucide-react";
import { BASIC_FIELDS, displayBasics } from "./basic-fields.js";
import PhotoSettings from "./PhotoSettings.jsx";
export const BASIC_ICONS = {
  name: User,
  gender: User,
  birthday: Calendar,
  phone: Phone,
  email: Mail,
  city: MapPin,
  hometown: Home,
  website: Globe,
  wechat: MessageCircle,
  role: Briefcase,
  details: Info,
};
export default function BasicInfo({ doc, update, onUpload, onCrop }) {
  const input = useRef();
  const basics = displayBasics(doc.basics);
  return (
    <div className="basic-info">
      <div className="basic-info-grid">
        <div className="basic-photo">
          <button
            aria-label={t("上传个人照片")}
            onClick={() => input.current.click()}
          >
            {doc.photo?.dataUrl ? (
              <img src={doc.photo.dataUrl} alt="个人照片" />
            ) : (
              <Camera size={25} />
            )}
          </button>
          <button
            className="photo-change-label"
            onClick={() =>
              doc.photo
                ? onCrop(doc.photo.source, doc.photo)
                : input.current.click()
            }
          >
            {doc.photo ? t("更换头像") : t("上传照片")}
          </button>
          <input
            hidden
            ref={input}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) => {
              if (e.target.files[0]) onUpload(e.target.files[0]);
              e.target.value = "";
            }}
          />
        </div>
        {BASIC_FIELDS.map(([key, label]) => {
          const Icon = BASIC_ICONS[key];
          return (
            <label
              className={
                "basic-input " +
                (["name", "gender", "birthday"].includes(key)
                  ? "beside-photo"
                  : "full-width")
              }
              key={key}
            >
              <Icon size={15} />
              <span>
                {t(label)}
                {key === "name" && <em>*</em>}
              </span>
              {key === "gender" ? (
                <select
                  aria-label={t(label)}
                  value={basics[key] || ""}
                  onChange={(e) =>
                    update((d) => {
                      d.basics[key] = e.target.value;
                    })
                  }
                >
                  <option value="">{t("请选择")}</option>
                  <option value="男">{t("男")}</option>
                  <option value="女">{t("女")}</option>
                  <option value="不填写">{t("不填写")}</option>
                </select>
              ) : (
                <input
                  aria-label={t(
                    label === "电话"
                      ? t("手机号码")
                      : label === "邮箱"
                        ? t("电子邮箱")
                        : label,
                  )}
                  value={basics[key] || ""}
                  placeholder={t("填写" + label)}
                  onChange={(e) =>
                    update((d) => {
                      d.basics[key] = e.target.value;
                    })
                  }
                />
              )}
            </label>
          );
        })}
      </div>
      {BASIC_FIELDS.some(([key]) => doc.basicsVisibility?.[key] === false) && (
        <div className="hidden-basic-fields">
          <span>{t("预览中已隐藏")}</span>
          {BASIC_FIELDS.filter(
            ([key]) => doc.basicsVisibility?.[key] === false,
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() =>
                update((d) => {
                  d.basicsVisibility = {
                    ...d.basicsVisibility,
                    [key]: true,
                  };
                })
              }
            >
              <Plus size={11} />
              {t(label)}
            </button>
          ))}
        </div>
      )}
      <details className="basic-photo-details">
        <summary>{t("照片尺寸与显示设置")}</summary>
        <PhotoSettings
          doc={doc}
          update={update}
          onUpload={onUpload}
          onCrop={onCrop}
        />
      </details>
    </div>
  );
}
