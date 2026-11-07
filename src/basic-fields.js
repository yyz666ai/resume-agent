export const BASIC_FIELDS = [
  ["name", "姓名"],
  ["gender", "性别"],
  ["birthday", "生日"],
  ["phone", "电话"],
  ["wechat", "微信"],
  ["email", "邮箱"],
  ["hometown", "籍贯"],
  ["city", "期望城市"],
  ["role", "求职意向"],
  ["website", "个人网站"],
  ["details", "其他信息"],
];
export function displayBasics(basics) {
  const out = { ...basics };
  let details = basics.details || "";
  const patterns = {
    gender: /(?:^|[\s|·｜])(男|女)(?=$|[\s|·｜])/,
    birthday: /(?:生日|出生年月)[：:\s]*([0-9]{4}[-/][0-9]{1,2})/,
    hometown: /籍贯[：:\s]*([^\s|·｜]+)/,
  };
  for (const [key, pattern] of Object.entries(patterns)) {
    const found = details.match(pattern);
    if (found) {
      if (!Object.hasOwn(basics, key)) out[key] = found[1];
      details = details.replace(found[0], " ");
    }
  }
  out.details = details.replace(/^[\s|·｜]+|[\s|·｜]+$/g, "").trim();
  return out;
}
