import { item } from "../src/model.js";
import { templateStyle } from "../src/templates.js";

const headings = {
  教育经历: "education",
  工作经历: "experience",
  掌握技能: "skills",
  项目经历: "projects",
  所获荣誉: "awards",
};

const escape = (text) =>
  text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");

export function restoreReferenceLayout(doc, rows) {
  const found = rows.filter(({ text, parts }) =>
    Object.hasOwn(headings, text) && Math.abs(parts[0].height - 13.4) < 0.3 &&
    Math.abs(parts[0].x - 33.5) < 1,
  );
  if (found.length !== Object.keys(headings).length ||
      new Set(found.map(({ text }) => text)).size !== found.length) return;

  const order = found.map(({ text }) => headings[text]);
  doc.order = [...order, ...doc.order.filter((key) => !order.includes(key))];
  doc.style = { ...doc.style, ...templateStyle("classic") };
  if (doc.photo) doc.photo.width = 19;
  const header = rows.slice(0, rows.indexOf(found[0])).map(({ text }) => text).join("\n");
  doc.basics = {
    ...doc.basics,
    gender: header.match(/^[男女](?=\s|[|｜]|$)/m)?.[0] || "",
    birthday: header.match(/生日[:：]\s*(\d{4}[-/]\d{1,2})/)?.[1] || "",
    hometown: header.match(/籍贯[:：]\s*([^\s|｜]+)/)?.[1] || "",
    details: "",
  };

  found.forEach((heading, index) => {
    const key = headings[heading.text];
    const end = found[index + 1];
    const content = rows.slice(rows.indexOf(heading) + 1, end ? rows.indexOf(end) : rows.length);
    const section = doc.sections[key];
    section.label = heading.text;
    section.visible = true;
    if (key === "awards") {
      section.items = [item("", content.flatMap(({ parts }) =>
        parts.map(({ text }) => `<p>${escape(text.trim())}</p>`),
      ).join(""))];
      return;
    }
    const entries = [];
    let entry;
    let blocks = [];
    let previous;
    function flush() {
      if (!entry) return;
      entry.body = blocks.map(({ html, list }) =>
        list ? `<ul><li>${html}</li></ul>` : `<p>${html}</p>`,
      ).join("");
      entries.push(entry);
      blocks = [];
    }
    content.forEach((row, i) => {
      const { text, parts } = row;
      const date = text.match(/\d{4}-\d{2}\s+-\s+(?:\d{4}-\d{2}|至今)$/)?.[0];
      if (date) {
        flush();
        entry = { ...item(text.slice(0, -date.length).trim()), date };
        previous = undefined;
        return;
      }
      if (!entry) entry = item();
      if (entry.title && !entry.subtitle && !blocks.length && !text.startsWith("•")) {
        entry.subtitle = text.replace(/\s*·\s*/g, "　·　");
        return;
      }
      const bullet = text.startsWith("•");
      const list = bullet && parts[0].text === "•";
      const skillTitle = key === "skills" && !bullet && content[i + 1]?.text.startsWith("•") &&
        (!previous || previous.parts[0].font !== parts[0].font);
      if (!bullet && !skillTitle && previous?.page === row.page &&
          Math.abs(previous.y - row.y - 17.88) < 0.3 && blocks.length) {
        blocks.at(-1).html += escape(text);
      } else {
        const html = list
          ? `<strong>${escape(parts[1]?.text || "")}</strong>${escape(parts.slice(2).map((part) => part.text).join(""))}`
          : escape(text);
        blocks.push({ list, html: skillTitle ? `<strong>${html}</strong>` : html });
      }
      previous = row;
    });
    flush();
    section.items = entries;
  });
}
