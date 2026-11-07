export function constrainTarget(document, proposal, target) {
  if (!target?.entryId) return proposal;
  const section = document.sections[target.section];
  const existing = section?.items.find((e) => e.id === target.entryId);
  if (!existing) throw Error("选中的条目已不存在，请重新选择");
  if (proposal.style)
    throw Error("当前选中单个条目，请切换到整份简历后调整全局排版");
  if (proposal.sections?.length || proposal.sectionStyles?.length)
    throw Error("当前仅选中条目，不能修改模块结构或模块格式");
  if (
    proposal.entryStyles?.some(
      (change) =>
        change.section !== target.section || change.entryId !== target.entryId,
    )
  )
    throw Error("格式修改超出选中条目");
  if (!Array.isArray(proposal.changes)) throw Error("修改建议格式有误");
  if (!proposal.changes.length)
    return {
      ...proposal,
      target: { section: target.section, entryId: target.entryId },
    };
  if (
    proposal.changes.length !== 1 ||
    proposal.changes[0].section !== target.section ||
    proposal.changes[0].items?.length !== 1
  )
    throw Error("助手修改超出选中条目，请重新生成建议");
  const updated = {
    ...existing,
    ...proposal.changes[0].items[0],
    id: existing.id,
  };
  return {
    ...proposal,
    target: { section: target.section, entryId: target.entryId },
    changes: [
      {
        section: target.section,
        items: section.items.map((e) =>
          e.id === existing.id ? updated : structuredClone(e),
        ),
      },
    ],
  };
}
