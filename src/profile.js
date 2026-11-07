import { emptyResume, validateDocument } from "./model.js";
export const PROFILE_KEY = "ai-resume.profile.v1";
export const PREFERENCES_KEY = "ai-resume.preferences.v1";
export const DEFAULT_PREFERENCES = {
  useProfile: true,
  writingStyle: "简洁专业，突出与岗位相关的行动和结果",
  targetJob: "",
};
export function emptyProfile() {
  return { version: 1, document: emptyResume(), targetJobs: "", notes: "" };
}
export function validateProfile(value) {
  if (!value || value.version !== 1) throw Error("档案格式无效");
  validateDocument(value.document);
  for (const key of ["targetJobs", "notes"])
    if (typeof value[key] !== "string" || value[key].length > 20000)
      throw Error("档案补充内容过长");
  return value;
}
export function loadProfile(storage) {
  try {
    return validateProfile(JSON.parse(storage.getItem(PROFILE_KEY)));
  } catch {
    return emptyProfile();
  }
}
export function loadPreferences(storage) {
  try {
    const p = JSON.parse(storage.getItem(PREFERENCES_KEY));
    return {
      useProfile: p.useProfile !== false,
      writingStyle: String(
        p.writingStyle || DEFAULT_PREFERENCES.writingStyle,
      ).slice(0, 2000),
      targetJob: String(p.targetJob || "").slice(0, 2000),
    };
  } catch {
    return { ...DEFAULT_PREFERENCES };
  }
}
export function agentProfile(profile, preferences) {
  const { photo, photoCandidates, ...document } = profile.document;
  return {
    ...(preferences.useProfile ? { profile: { ...profile, document } } : {}),
    writingStyle: preferences.writingStyle,
    targetJob: preferences.targetJob,
  };
}
// 明确的自然语言选择在发出请求之前生效，不能依赖模型自己承诺不读。
export function profileReferenceChoice(text, current) {
  if (
    /(?:不要|不用|别|不想|禁止|停止).{0,8}(?:参考|读取|使用|读|用).{0,6}(?:个人)?档案|不(?:读|参考|使用|用).{0,4}档案|without\s+(?:my\s+)?profile|(?:don['’]?t|do not|stop)\s+(?:read|use|using|reference).{0,10}profile/i.test(
      text,
    )
  )
    return false;
  if (
    /(?:恢复|重新|可以|请|继续).{0,5}(?:读|参考|使用|用).{0,5}档案|(?:use|read|reference)\s+my\s+profile/i.test(
      text,
    )
  )
    return true;
  return current;
}
export function verifiedProfileSuggestion(proposal, prompt, conversation = []) {
  const candidate = proposal?.profileSuggestion;
  if (
    !candidate ||
    typeof candidate.notes !== "string" ||
    typeof candidate.quote !== "string"
  )
    return undefined;
  const notes = candidate.notes.trim(),
    quote = candidate.quote.trim();
  if (!notes || notes.length > 6000 || quote.length < 6 || quote.length > 6000)
    return undefined;
  const sources = [
    prompt,
    ...conversation.filter((m) => m.role === "user").map((m) => m.text),
  ];
  return sources.some((source) => source.includes(quote))
    ? { notes, quote }
    : undefined;
}
