import React from "react";

export default function Reply({ text }) {
  const blocks = [];
  for (const line of text.split("\n")) {
    const bullet = line.match(/^\s*[-*•]\s+(.+)/);
    const numbered = line.match(/^\s*(\d+)[.)]\s+(.+)/);
    const list = bullet || numbered;
    const heading = line.match(/^#{1,6}\s+(.+)/);
    const kind = bullet ? "ul" : numbered ? "ol" : heading ? "h4" : "p";
    if (list && blocks.at(-1)?.kind === kind) {
      blocks.at(-1).lines.push(list.at(-1));
    } else if (line.trim()) {
      blocks.push({ kind, start: numbered?.[1], lines: [list ? list.at(-1) : heading?.[1] ?? line] });
    }
  }
  const emphasis = (line) =>
    line.split(/(\*\*[^*]+\*\*)/).map((part, index) =>
      index % 2 ? <strong key={index}>{part.slice(2, -2)}</strong> : part,
    );
  return blocks.map(({ kind: Tag, start, lines }, index) =>
    (Tag === "p" || Tag === "h4") ? (
      <Tag key={index}>{emphasis(lines[0])}</Tag>
    ) : (
      <Tag key={index} start={start}>
        {lines.map((line, i) => <li key={i}>{emphasis(line)}</li>)}
      </Tag>
    ),
  );
}
