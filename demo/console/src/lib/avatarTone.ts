const AVATAR_TONES = ["#3b82f6", "#4f5bd5", "#7c5cf0", "#a254d4", "#13a8a8", "#0e9ac7", "#2f7d9e", "#5b6b8c"];

/** 同一 id 每次同色。只用这 8 个冷色，不跟主题主色。 */
export function avatarTone(key: string): string {
  let hash = 0;
  for (const ch of key) hash = (hash * 31 + ch.codePointAt(0)!) >>> 0;
  return AVATAR_TONES[hash % AVATAR_TONES.length]!;
}

/** 去掉括号和空格后：三个字以内原样，再长取前两个。 */
export function avatarText(name: string): string {
  const compact = name.replace(/[（）()\s·]/g, "");
  return compact.length <= 3 ? compact : compact.slice(0, 2);
}

/** 圆里的字：有汉字用汉字规则；否则取 @ 前两个字母并大写。 */
export function avatarLetters(name: string): string {
  const base = (name.split("@")[0] ?? name).trim();
  const han = base.match(/[\u4e00-\u9fff]/g);
  if (han && han.length > 0) return avatarText(han.join(""));
  const alnum = base.replace(/[^a-zA-Z0-9]/g, "");
  if (alnum.length >= 2) return alnum.slice(0, 2).toUpperCase();
  return (alnum || "?").toUpperCase();
}
