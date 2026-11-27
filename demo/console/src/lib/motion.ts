import type { CSSProperties } from "react";

export const prefersReducedMotion = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** 列表行队列进场：从右侧 16px 淡入 260ms，逐项延迟 序号 × min(40ms, 240ms ÷ 条数)，总跨度约 240ms。只动 transform / opacity，不带板块延迟 */
export function queueItemStyle(index: number, count: number): CSSProperties {
  const gap = Math.min(40, 240 / Math.max(1, count));
  return { ["--queue-i" as string]: index, ["--queue-gap" as string]: `${gap}ms` };
}
