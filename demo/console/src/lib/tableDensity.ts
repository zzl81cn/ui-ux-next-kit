import { useCallback, useSyncExternalStore } from "react";

/** 表格密度。只记在这台浏览器，所有公共表共用一份，没选过是中等。 */
export type TableDensity = "large" | "middle" | "small";

const KEY = "demo-table-density";
const DEFAULT: TableDensity = "middle";
const listeners = new Set<() => void>();

function read(): TableDensity {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved === "large" || saved === "middle" || saved === "small") return saved;
  } catch {
    /* 读不到就用默认 */
  }
  return DEFAULT;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === KEY) listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function saveTableDensity(next: TableDensity) {
  localStorage.setItem(KEY, next);
  listeners.forEach((listener) => listener());
}

/** 展开到 ProTable 的 `size` 和 `onSizeChange`。 */
export function useTableDensity() {
  const size = useSyncExternalStore(subscribe, read, () => DEFAULT);
  const onSizeChange = useCallback((next: unknown) => {
    if (next === "large" || next === "middle" || next === "small") saveTableDensity(next);
  }, []);
  return { size, onSizeChange };
}
