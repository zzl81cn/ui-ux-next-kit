/** 筛选面板的展开 / 收起记在这台浏览器：全局只记一份，所有筛选面板共用，不进服务端。没操作过时按面板自己的缺省（不传 = 收起）。 */
const KEY = "console-filter-expanded";

export function readFilterExpanded(): boolean | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw === "1" ? true : raw === "0" ? false : null;
  } catch {
    return null;
  }
}

let memory: boolean | null = null;

/** 写不进 localStorage（隐私模式）时，本次会话内仍然生效 */
export function loadFilterExpanded(fallback = false): boolean {
  return readFilterExpanded() ?? memory ?? fallback;
}

export function saveFilterExpanded(open: boolean) {
  memory = open;
  try {
    localStorage.setItem(KEY, open ? "1" : "0");
  } catch {
    /* 内存里的那份继续用 */
  }
}

export { KEY as FILTER_EXPANDED_KEY };
