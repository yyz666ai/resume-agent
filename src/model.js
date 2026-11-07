import { BASIC_FIELDS } from "./basic-fields.js";
import { validatePhoto } from "./photo.js";
import { TEMPLATE_IDS, templateStyle } from "./templates.js";
export const MODULES = [
  ["education", "教育经历", "学校、专业与在校经历"],
  ["experience", "工作经历", "展示你的职责与实际成果"],
  ["projects", "项目经历", "让项目成果为你的能力作证"],
  ["summary", "个人优势", "用几句话介绍你的核心竞争力"],
  ["skills", "专业技能", "与目标岗位相关的技能"],
  ["awards", "所获荣誉", "以标签展示荣誉和奖项"],
  ["certificates", "资格证书", "添加资格、语言或专业认证"],
];
export const DEFAULT_STYLE = templateStyle("classic");
export const id = () => globalThis.crypto.randomUUID();
export const item = (title = "", body = "") => ({
  id: id(),
  title,
  subtitle: "",
  date: "",
  body,
});
export const isCustomSection = (key) => /^custom_[a-z0-9_]{1,64}$/.test(key);
export const sectionChoices = (doc) =>
  doc.order.map((key) => [key, doc.sections[key].label]);
export function addSection(
  doc,
  label,
  key = "custom_" + id().replaceAll("-", ""),
) {
  if (typeof label !== "string" || !label.trim() || label.trim().length > 30)
    throw Error("模块名称需为 1–30 字");
  if (!isCustomSection(key) || Object.hasOwn(doc.sections, key))
    throw Error("模块 ID 不可用");
  if (doc.order.length >= 20) throw Error("最多支持 20 个模块");
  if (Object.values(doc.sections).some((s) => s.label === label.trim()))
    throw Error("该模块名称已存在");
  doc.sections[key] = { label: label.trim(), visible: true, items: [item()] };
  doc.order.push(key);
  return key;
}
export function removeSection(doc, key) {
  if (!isCustomSection(key) || !Object.hasOwn(doc.sections, key))
    throw Error("只能删除自定义模块，固定模块可隐藏");
  delete doc.sections[key];
  doc.order = doc.order.filter((k) => k !== key);
}
function validFormat(format, entry = false) {
  if (format === undefined) return;
  if (!format || typeof format !== "object" || Array.isArray(format))
    throw Error("模块格式有误");
  const allowed = entry
    ? ["titleBold", "subtitleBold", "lineHeight"]
    : ["titleBold", "entryTitleBold", "subtitleBold", "lineHeight"];
  for (const [key, value] of Object.entries(format)) {
    if (!allowed.includes(key)) throw Error("不支持的模块格式");
    if (key === "lineHeight") {
      if (
        typeof value !== "number" ||
        !Number.isFinite(value) ||
        value < 1.2 ||
        value > 2.2
      )
        throw Error("模块行距需在 1.2–2.2 之间");
    } else if (typeof value !== "boolean") throw Error("加粗配置需为布尔值");
  }
}
export function emptyResume() {
  return {
    version: 1,
    sectionOrderVersion: 2,
    basics: { name: "", role: "", phone: "", email: "", city: "", website: "" },
    sections: Object.fromEntries(
      MODULES.map(([key, label]) => [key, { label, visible: true, items: [] }]),
    ),
    order: MODULES.map((x) => x[0]),
    style: { ...DEFAULT_STYLE },
  };
}
export function demoResume() {
  const d = emptyResume();
  d.basics = {
    name: "林知远",
    role: "产品经理",
    phone: "138 0000 0000",
    email: "hello@example.com",
    city: "上海",
    website: "portfolio.example.com",
  };
  d.sections.summary.items = [
    item(
      "",
      "<p>拥有 5 年互联网产品经验，专注于将复杂问题转化为清晰、易用的产品体验。具备从用户研究、产品规划到项目落地的完整实践。</p>",
    ),
  ];
  d.sections.experience.items = [
    {
      ...item(
        "远山科技",
        "<ul><li>负责协作产品的需求分析与版本规划，推动核心工作流持续优化。</li><li>搭建用户反馈与数据分析机制，协同设计和研发团队完成产品迭代。</li><li>主导新用户引导流程改版，提升关键路径的使用体验。</li></ul>",
      ),
      subtitle: "高级产品经理",
      date: "2022.06 — 至今",
    },
    {
      ...item(
        "星河信息",
        "<ul><li>参与企业服务产品从 0 到 1 建设，完成需求调研、原型设计和上线验收。</li><li>建立产品文档与项目协作规范，推动跨团队高效沟通。</li></ul>",
      ),
      subtitle: "产品经理",
      date: "2020.07 — 2022.05",
    },
  ];
  d.sections.projects.items = [
    {
      ...item(
        "Flow · 团队协作工作台",
        "<p>面向中小团队的一站式协作平台，整合任务管理、知识沉淀与团队沟通。</p><ul><li>负责产品整体规划及核心交互设计，建立清晰的信息架构。</li><li>通过用户访谈识别痛点，推动任务看板与知识库功能落地。</li></ul>",
      ),
      subtitle: "产品负责人",
      date: "2023.03 — 2023.12",
    },
  ];
  d.sections.education.items = [
    {
      ...item("浙江大学", "<p>主修：管理学、统计学、用户研究与交互设计</p>"),
      subtitle: "信息管理与信息系统 · 本科",
      date: "2016.09 — 2020.06",
    },
  ];
  d.sections.skills.items = [
    item(
      "",
      "<p>产品规划 / 用户研究 / 交互设计 / Figma / SQL / 数据分析 / 敏捷协作</p>",
    ),
  ];
  d.sections.awards.visible = false;
  return d;
}
const alias = {
  summary: [
    "个人优势",
    "自我评价",
    "个人简介",
    "自我介绍",
    "专业总结",
    "summary",
    "profile",
  ],
  experience: [
    "工作经历",
    "工作经验",
    "实习经历",
    "实习经验",
    "职业经历",
    "experience",
    "employment",
  ],
  projects: ["项目经历", "项目经验", "科研经历", "projects"],
  education: ["教育经历", "教育背景", "教育信息", "学历信息", "education"],
  skills: [
    "专业技能",
    "掌握技能",
    "技能特长",
    "技术栈",
    "个人技能",
    "技能",
    "skills",
  ],
  certificates: ["资格证书", "专业证书", "证书"],
  awards: [
    "证书与荣誉",
    "所获荣誉",
    "荣誉奖项",
    "获奖经历",
    "其他经历",
    "校园经历",
    "awards",
  ],
};
export function parseResume(text) {
  const d = emptyResume();
  const lines = text
    .split(/\r?\n/)
    .map((x) => x.trim())
    .filter(Boolean);
  let current = null;
  const buckets = { header: [] };
  for (const line of lines) {
    const normalized = line.replace(/[\s：:·|]/g, "").toLowerCase();
    const section = Object.keys(alias).find((k) =>
      alias[k].some((a) => normalized === a.toLowerCase()),
    );
    if (section) {
      current = section;
      buckets[current] ??= [];
    } else {
      (buckets[current || "header"] ??= []).push(line);
    }
  }
  const header = buckets.header.join("\n");
  d.basics.name =
    lines.find(
      (x) =>
        /^[\u4e00-\u9fa5]{2,5}$/.test(x) &&
        !Object.values(alias).flat().includes(x),
    ) ||
    lines[0]?.slice(0, 30) ||
    "";
  d.basics.email = header.match(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/i)?.[0] || "";
  d.basics.phone =
    header.match(/(?:\+86[ -]?)?1[3-9]\d[ -]?\d{4}[ -]?\d{4}/)?.[0] || "";
  d.basics.city =
    header.match(/(?:期望城市|意向城市|现居地)[：:\s]*([^\n|｜]+)/)?.[1] || "";
  d.basics.role =
    header.match(
      /(?:求职意向|意向岗位|应聘岗位|求职岗位)[：:\s]*([^\n|｜]+)/,
    )?.[1] || "";
  // 未识别的头部文字保留在个人优势中，避免静默丢失。
  const leftovers = buckets.header.filter(
    (x) =>
      ![d.basics.name, d.basics.email, d.basics.phone].includes(x) &&
      !x.startsWith("求职意向"),
  );
  if (leftovers.length)
    d.basics.details = leftovers
      .map((x) =>
        x
          .replace(d.basics.email, "")
          .replace(d.basics.phone, "")
          .replace(/期望城市[：:].*/, "")
          .trim(),
      )
      .filter(Boolean)
      .join(" · ");
  for (const [key] of MODULES) {
    d.sections[key].items = buckets[key]?.length
      ? [item("", buckets[key].join("\n"))]
      : [];
    d.sections[key].visible = !!d.sections[key].items.length;
  }
  return d;
}
function consolidateSkills(section) {
  const first = section.items[0];
  if (!first || (section.items.length === 1 && !first.title && !first.subtitle && !first.date))
    return;
  const escape = (text) =>
    text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
  const body = section.items.map((entry) => {
    const heading = [entry.title, entry.subtitle, entry.date].filter(Boolean).join(" · ");
    const details = /<\/?[a-z][\s\S]*>/i.test(entry.body)
      ? entry.body
      : entry.body.split(/\r?\n/).filter(Boolean).map((line) => `<p>${escape(line)}</p>`).join("");
    return (heading ? `<p><strong>${escape(heading)}</strong></p>` : "") + details;
  }).join("");
  section.items = [{ ...first, title: "", subtitle: "", date: "", body }];
}

export function validateDocument(d) {
  if (
    !d ||
    d.version !== 1 ||
    !d.basics ||
    !d.sections ||
    !Array.isArray(d.order) ||
    !d.style
  )
    throw Error("不是有效的简历备份文件");
  // 为旧版六模块文档补充资格证书，保留既有内容与顺序。
  if (
    !Object.hasOwn(d.sections, "certificates") &&
    MODULES.filter((m) => m[0] !== "certificates").every(([key]) =>
      Object.hasOwn(d.sections, key),
    )
  ) {
    d.sections.certificates = { label: "资格证书", visible: false, items: [] };
    d.order.push("certificates");
  }
  if (d.basicsVisibility !== undefined) {
    for (const [key, value] of Object.entries(d.basicsVisibility))
      if (!BASIC_FIELDS.some((f) => f[0] === key) || typeof value !== "boolean")
        throw Error("基本信息显示设置有误");
  }
  for (const [key] of BASIC_FIELDS)
    if (d.basics[key] !== undefined && typeof d.basics[key] !== "string")
      throw Error("个人信息格式有误");
  if (d.sections.awards?.label === "证书与荣誉")
    d.sections.awards.label = "所获荣誉";
  validatePhoto(d.photo);
  if (
    d.photoCandidates !== undefined &&
    (!Array.isArray(d.photoCandidates) ||
      d.photoCandidates.length > 32 ||
      d.photoCandidates.some(
        (image) =>
          typeof image.dataUrl !== "string" ||
          image.dataUrl.length > 2000000 ||
          !/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(
            image.dataUrl,
          ),
      ))
  )
    throw Error("PDF 图片候选格式有误");
  if (
    d.basics.details !== undefined &&
    (typeof d.basics.details !== "string" || d.basics.details.length > 2000)
  )
    throw Error("其他信息格式有误");
  for (const key of ["name", "role", "phone", "email", "city", "website"])
    if (typeof d.basics[key] !== "string" || d.basics[key].length > 500)
      throw Error("基本信息格式有误");
  const keys = Object.keys(d.sections);
  if (
    keys.length < MODULES.length ||
    keys.length > 20 ||
    d.order.length !== keys.length ||
    new Set(d.order).size !== keys.length ||
    !MODULES.every(([key]) => Object.hasOwn(d.sections, key)) ||
    keys.some(
      (key) => !MODULES.some((m) => m[0] === key) && !isCustomSection(key),
    ) ||
    d.order.some((key) => !Object.hasOwn(d.sections, key))
  )
    throw Error("模块顺序或类型有误");
  for (const key of keys) {
    const s = d.sections[key];
    if (
      !s ||
      typeof s.label !== "string" ||
      s.label.length > 30 ||
      typeof s.visible !== "boolean" ||
      !Array.isArray(s.items) ||
      s.items.length > 100
    )
      throw Error("模块内容格式有误");
    validFormat(s.format);
    for (const row of s.items) validFormat(row.format, true);
    for (const row of s.items)
      for (const f of ["title", "subtitle", "date", "body"])
        if (typeof row[f] !== "string" || row[f].length > 100000)
          throw Error("条目格式有误");
  }
  const s = d.style;
  if (s.template === "reference") s.template = "classic";
  if (
    !TEMPLATE_IDS.includes(s.template) ||
    !["sans", "serif"].includes(s.font) ||
    !/^#[0-9a-f]{6}$/i.test(s.color)
  )
    throw Error("模板配置有误");
  for (const [k, min, max] of [
    ["fontSize", 10, 18],
    ["lineHeight", 1.2, 2.2],
    ["margin", 10, 26],
    ["gap", 8, 30],
  ])
    if (
      typeof s[k] !== "number" ||
      !Number.isFinite(s[k]) ||
      s[k] < min ||
      s[k] > max
    )
      throw Error("排版参数超出范围");
  // 已有文档只迁移一次；之后仍允许用户手动调序。
  if (d.sectionOrderVersion !== 2) {
    const first = ["education", "experience", "projects"];
    d.order = [...first, ...d.order.filter((key) => !first.includes(key))];
    d.sectionOrderVersion = 2;
  }
  consolidateSkills(d.sections.skills);
  return d;
}
export function applyProposal(source, proposal, scope = "all") {
  const d = structuredClone(source);
  if (
    !proposal ||
    !Array.isArray(proposal.changes) ||
    proposal.changes.length > 10
  )
    throw Error("助手返回的修改格式有误");
  if (proposal.sections !== undefined) {
    if (scope !== "all") throw Error("新增、重命名或删除模块，请选择整份简历");
    if (!Array.isArray(proposal.sections) || proposal.sections.length > 14)
      throw Error("模块操作格式有误");
    for (const operation of proposal.sections) {
      if (operation.action === "add") {
        const key = addSection(d, operation.label, operation.id);
        if (operation.items !== undefined) {
          if (!Array.isArray(operation.items) || operation.items.length > 100)
            throw Error("模块条目格式有误");
          d.sections[key].items = operation.items.length
            ? operation.items.map((row) => ({ ...item(), ...row, id: id() }))
            : [item()];
        }
        if (operation.after) {
          const index = d.order.indexOf(operation.after);
          if (index < 0) throw Error("指定插入位置不存在");
          d.order = d.order.filter((k) => k !== key);
          d.order.splice(index + 1, 0, key);
        }
      } else if (operation.action === "remove")
        removeSection(d, operation.section);
      else if (operation.action === "rename") {
        if (
          !Object.hasOwn(d.sections, operation.section) ||
          typeof operation.label !== "string" ||
          !operation.label.trim() ||
          operation.label.length > 30
        )
          throw Error("模块名称有误");
        d.sections[operation.section].label = operation.label.trim();
      } else throw Error("不支持的模块操作");
    }
  }
  for (const c of proposal.changes) {
    if (c.section === "basics") {
      if (scope !== "all" && scope !== "basics")
        throw Error("修改超出选定模块");
      for (const [k, v] of Object.entries(c.fields || {})) {
        if (
          !BASIC_FIELDS.some((field) => field[0] === k) ||
          typeof v !== "string"
        )
          throw Error("不支持的基本信息字段");
        d.basics[k] = v;
      }
      continue;
    }
    if (!Object.hasOwn(d.sections, c.section)) throw Error("不支持的模块");
    if (scope !== "all" && scope !== c.section) throw Error("修改超出选定模块");
    if (!Array.isArray(c.items)) throw Error("条目格式有误");
    const known = new Set(d.sections[c.section].items.map((e) => e.id)),
      used = new Set();
    d.sections[c.section].items = c.items.map((x) => {
      const entryId = known.has(x.id) && !used.has(x.id) ? x.id : id();
      used.add(entryId);
      return { ...x, id: entryId };
    });
    d.sections[c.section].visible = true;
  }
  for (const type of ["sectionStyles", "entryStyles"]) {
    if (proposal[type] === undefined) continue;
    if (!Array.isArray(proposal[type]) || proposal[type].length > 100)
      throw Error("格式修改条目有误");
    for (const change of proposal[type]) {
      if (
        !Object.hasOwn(d.sections, change.section) ||
        (scope !== "all" && scope !== change.section)
      )
        throw Error("格式修改超出选定模块");
      if (!change.style) throw Error("格式操作缺少设置");
      validFormat(change.style, type === "entryStyles");
      if (type === "sectionStyles")
        d.sections[change.section].format = {
          ...d.sections[change.section].format,
          ...change.style,
        };
      else {
        const entry = d.sections[change.section].items.find(
          (e) => e.id === change.entryId,
        );
        if (!entry) throw Error("格式修改目标条目不存在");
        entry.format = { ...entry.format, ...change.style };
      }
    }
  }
  if (proposal.style) {
    if (scope !== "all")
      throw Error("全局排版请先选择整份简历；局部行距可使用模块格式");
    for (const [key, value] of Object.entries(proposal.style)) {
      if (!Object.hasOwn(DEFAULT_STYLE, key)) throw Error("不支持的排版配置");
      d.style[key] = value;
    }
  }
  return validateDocument(d);
}
