import { type RefObject, useLayoutEffect } from "react";
import { prefersReducedMotion } from "../lib/motion";

const SELECTOR = ":scope > .stats-card, :scope > .stats-col > *";

/**
 * 卡片队列进场（多元素队列）：页面打开时，问候卡下面的各块按版面阅读顺序（先上后下，顶边相差不到 32px 算一行，同一行从左到右）
 * 一张接一张上浮淡入：520ms，起点下移 24px、缩到 0.985。首张延迟 60ms，之后每张再晚 gapMs，整条队列最长约 900ms。
 * 首屏以外的块不进队列，滚进视口再播同一段。只在挂载时播一次。gapMs 为 0 或减少动效时整页一起出现。
 */
export function useCardQueue(grid: RefObject<HTMLElement | null>, gapMs: number) {
  useLayoutEffect(() => {
    const root = grid.current;
    if (!root || gapMs <= 0 || prefersReducedMotion()) return;
    const items = [...root.querySelectorAll<HTMLElement>(SELECTOR)].map((el) => ({ el, rect: el.getBoundingClientRect() }));
    items.sort((a, b) => (Math.abs(a.rect.top - b.rect.top) < 32 ? a.rect.left - b.rect.left : a.rect.top - b.rect.top));
    const viewport = window.innerHeight;
    const first = items.filter((item) => item.rect.top < viewport);
    const rest = items.filter((item) => item.rect.top >= viewport);
    const gap = Math.min(gapMs, 840 / Math.max(1, first.length - 1));
    const frames = [
      { opacity: 0, transform: "translateY(24px) scale(0.985)" },
      { opacity: 1, transform: "none" },
    ];
    const run = (el: HTMLElement, delay: number) => {
      el.style.opacity = "0";
      const animation = el.animate(frames, { duration: 520, delay, easing: "cubic-bezier(0.16, 1, 0.3, 1)", fill: "backwards" });
      const done = () => {
        el.style.opacity = "";
      };
      animation.onfinish = done;
      animation.oncancel = done;
    };
    first.forEach((item, index) => run(item.el, 60 + index * gap));

    // 首屏外：先停在起始帧，滚进视口（底边留 40px 量）再播
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((entry) => entry.isIntersecting).map((entry) => entry.target as HTMLElement);
        visible
          .sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top)
          .forEach((el, index) => {
            io.unobserve(el);
            run(el, index * gap);
          });
      },
      { rootMargin: "0px 0px -40px 0px" },
    );
    rest.forEach((item) => {
      item.el.style.opacity = "0";
      io.observe(item.el);
    });
    return () => io.disconnect();
    // 只在挂载时播一次
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
