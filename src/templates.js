const standardSingleColumn = {
  font: "sans",
  fontSize: 13.9,
  lineHeight: 1.715,
  margin: 12,
  gap: 25,
};

export const TEMPLATES = [
  {
    id: "classic",
    name: "经典留白",
    description: "大标题、紧凑抬头与右上角照片",
    category: "单栏",
    style: { ...standardSingleColumn, color: "#263948" },
  },
  {
    id: "teal-band",
    name: "浅青标题带",
    description: "浅青圆角底、青色竖条与深色粗体标题",
    category: "单栏",
    style: { ...standardSingleColumn, color: "#0ca4a9" },
  },
  {
    id: "editorial",
    name: "编辑式 · 墨",
    description: "居中衬线姓名，双线与黑白层次",
    category: "单栏",
    style: {
      color: "#252525",
      font: "serif",
      fontSize: 13,
      lineHeight: 1.6,
      margin: 17,
      gap: 17,
    },
  },
  {
    id: "swiss",
    name: "瑞士 · 清晰",
    description: "大字姓名，粗线与利落的信息层级",
    category: "单栏",
    style: {
      color: "#1d394b",
      font: "sans",
      fontSize: 13,
      lineHeight: 1.65,
      margin: 18,
      gap: 20,
    },
  },
  {
    id: "timeline",
    name: "时间轴 · 青",
    description: "圆点与竖线串联每一段经历",
    category: "单栏",
    style: {
      color: "#36746d",
      font: "sans",
      fontSize: 13,
      lineHeight: 1.6,
      margin: 17,
      gap: 17,
    },
  },
  {
    id: "sidebar",
    name: "现代侧栏",
    description: "浅色信息栏，联系方式与技能分层",
    category: "双栏",
    style: {
      color: "#49687b",
      font: "sans",
      fontSize: 13,
      lineHeight: 1.7,
      margin: 15,
      gap: 18,
    },
  },
  {
    id: "executive",
    name: "深蓝履历",
    description: "深色侧栏与白色正文，克制而鲜明",
    category: "双栏",
    style: {
      color: "#203d52",
      font: "sans",
      fontSize: 13,
      lineHeight: 1.7,
      margin: 15,
      gap: 19,
    },
  },
  {
    id: "minimal",
    name: "索引 · 极简",
    description: "左侧模块索引，右侧展开经历",
    category: "双栏",
    style: {
      color: "#3e4f5b",
      font: "sans",
      fontSize: 13,
      lineHeight: 1.7,
      margin: 17,
      gap: 20,
    },
  },
  {
    id: "academic",
    name: "学术 · 宋",
    description: "宋体居中抬头，适合科研与教育岗位",
    category: "单栏",
    style: {
      color: "#282b30",
      font: "serif",
      fontSize: 13,
      lineHeight: 1.75,
      margin: 18,
      gap: 18,
    },
  },
  {
    id: "compact",
    name: "紧凑商务",
    description: "窄色带与紧凑分区，承载丰富经历",
    category: "紧凑",
    style: {
      color: "#364e62",
      font: "sans",
      fontSize: 12.5,
      lineHeight: 1.55,
      margin: 16,
      gap: 14,
    },
  },
];
export const TEMPLATE_IDS = TEMPLATES.map((t) => t.id);
export function templateStyle(id) {
  const template = TEMPLATES.find((t) => t.id === id);
  if (!template) throw Error("未知模板");
  return { template: id, ...template.style };
}
