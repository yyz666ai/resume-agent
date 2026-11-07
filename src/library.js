import { validateDocument, demoResume, emptyResume, id } from "./model.js";
export const LIBRARY_KEY = "zhijian.library.v1";
export function activeDocument(library) {
  return library.entries.find((e) => e.id === library.activeId)?.document ?? emptyResume();
}
export function loadLibrary(storage) {
  try {
    const saved = JSON.parse(storage.getItem(LIBRARY_KEY));
    if (
      saved?.version === 1 &&
      Array.isArray(saved.entries)
    ) {
      for (const entry of saved.entries) {
        validateDocument(entry.document);
        if (typeof entry.id !== "string" || typeof entry.title !== "string")
          throw Error();
      }
      if (!saved.entries.length) return { ...saved, activeId: null };
      if (saved.entries.some((e) => e.id === saved.activeId)) return saved;
    }
  } catch {}
  let document;
  try {
    document = validateDocument(
      JSON.parse(storage.getItem("zhijian.resume.v1")),
    );
  } catch {
    document = demoResume();
  }
  const entry = { id: id(), title: "", document, updatedAt: Date.now() };
  return { version: 1, activeId: entry.id, entries: [entry] };
}
export function saveActive(library, document) {
  return {
    ...library,
    entries: library.entries.map((e) =>
      e.id === library.activeId
        ? { ...e, document: structuredClone(document), updatedAt: Date.now() }
        : e,
    ),
  };
}
export function addResume(library, document = emptyResume(), title = "") {
  const entry = {
    id: id(),
    title,
    document: structuredClone(document),
    updatedAt: Date.now(),
  };
  return {
    ...library,
    activeId: entry.id,
    entries: [...library.entries, entry],
  };
}
export function removeResume(library, id) {
  const entries = library.entries.filter((e) => e.id !== id);
  return {
    ...library,
    entries,
    activeId: library.activeId === id ? (entries[0]?.id ?? null) : library.activeId,
  };
}
export function duplicateResume(library, sourceId) {
  const source = library.entries.find((entry) => entry.id === sourceId);
  if (!source) throw Error("找不到原简历");
  const base =
    source.title ||
    (source.document.basics.name
      ? source.document.basics.name + "的简历"
      : "未命名简历");
  let title = base + " · 副本",
    n = 2;
  while (library.entries.some((entry) => entry.title === title))
    title = base + " · 副本 " + n++;
  return addResume(library, source.document, title);
}
