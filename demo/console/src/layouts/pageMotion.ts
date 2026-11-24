import { useMemo, useRef } from "react";
import type { MenuNode } from "../mock/menus";

export type PageSlideDirection = "forward" | "back" | "fade";

/** 同页开抽屉仍算这一页，不重挂、不重播。 */
export function pageMotionKey(pathname: string): string {
  if (/^\/jobs(\/\d+)?$/.test(pathname)) return "/jobs";
  return pathname;
}

function menuOrder(nodes: MenuNode[]): string[] {
  const out: string[] = [];
  const walk = (items: MenuNode[]) => {
    for (const item of items) {
      if (item.children?.length) walk(item.children);
      else if (item.path) out.push(item.path);
    }
  };
  walk(nodes);
  return out;
}

const depth = (path: string) => path.split("/").filter(Boolean).length;

/**
 * 方向在渲染新页之前算好。两页都在侧栏里时按从上到下的顺序，同一层级也滑。
 * 刚进壳、以及两个地址都不在侧栏且深度相同，用淡入。
 */
export function usePageSlideDirection(pathname: string, nodes: MenuNode[]): { key: string; direction: PageSlideDirection } {
  const order = useMemo(() => menuOrder(nodes), [nodes]);
  const key = pageMotionKey(pathname);
  const prevKeyRef = useRef(key);
  const directionRef = useRef<PageSlideDirection>("fade");

  if (prevKeyRef.current !== key) {
    const prev = prevKeyRef.current;
    const prevIdx = order.indexOf(prev);
    const nextIdx = order.indexOf(key);
    if (prev === "/" || (prevIdx < 0 && nextIdx < 0 && depth(key) === depth(prev))) {
      directionRef.current = "fade";
    } else if (prevIdx >= 0 && nextIdx >= 0 && prevIdx !== nextIdx) {
      directionRef.current = nextIdx > prevIdx ? "forward" : "back";
    } else {
      const delta = depth(key) - depth(prev);
      directionRef.current = delta > 0 ? "forward" : delta < 0 ? "back" : "fade";
    }
    prevKeyRef.current = key;
  }

  return { key, direction: directionRef.current };
}
