import { type RefObject, useEffect } from "react";
import { prefersReducedMotion } from "../lib/motion";

const PEAK = 0.6; // 正下方放大 1 + 0.6 = 1.6 倍
const SIGMA_PITCH = 1.05; // σ = 相邻圆心间距 × 1.05

/**
 * 叠放组的鱼眼悬停：鼠标在叠圆上移动时，每颗按圆心到指针的水平距离高斯放大 scale = 1 + 0.6 × exp(-(d/σ)²)，
 * 相邻圆心的间距按两颗的平均缩放撑开（两侧被依次推开），整体再平移一次让指针下那一点不动。
 * 进入时量一次圆心并缓存，之后每次 pointermove 只做数学，经 requestAnimationFrame 合并（一帧最多一次），只写 transform / z-index。
 * 只对鼠标生效；触屏、减少动效、进场动画没播完时不启用，仍走 CSS 悬停（放大 1.16 + 邻居让开 2px）。
 */
export function useAvatarFisheye(host: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const root = host.current;
    if (!root) return;
    let chips: HTMLElement[] = [];
    let centers: number[] = [];
    let pitch = 0;
    let pointer = 0;
    let frame = 0;
    let active = false;

    const clear = () => {
      window.cancelAnimationFrame(frame);
      frame = 0;
      root.classList.remove("is-fisheye");
      chips.forEach((chip) => {
        chip.style.transform = "";
        chip.style.zIndex = "";
      });
      active = false;
    };

    const paint = () => {
      frame = 0;
      const sigma = pitch * SIGMA_PITCH;
      const scales = centers.map((c) => 1 + PEAK * Math.exp(-(((c - pointer) / sigma) ** 2)));
      const placed: number[] = [centers[0]];
      for (let i = 1; i < centers.length; i += 1) {
        placed.push(placed[i - 1] + (centers[i] - centers[i - 1]) * ((scales[i - 1] + scales[i]) / 2));
      }
      // 指针下那一点保持不动：用离指针最近的那颗的位移做整体平移
      let nearest = 0;
      centers.forEach((c, i) => {
        if (Math.abs(c - pointer) < Math.abs(centers[nearest] - pointer)) nearest = i;
      });
      const shift = centers[nearest] - placed[nearest];
      chips.forEach((chip, i) => {
        chip.style.transform = `translateX(${(placed[i] + shift - centers[i]).toFixed(2)}px) scale(${scales[i].toFixed(3)})`;
        chip.style.zIndex = i === nearest ? "30" : "";
      });
    };

    const onMove = (event: PointerEvent) => {
      if (event.pointerType !== "mouse" || prefersReducedMotion()) return;
      if (!active) {
        chips = [...root.querySelectorAll<HTMLElement>(".robot-member-avatar")];
        // 进场（打水漂）还在播时不启用，免得盖掉位移
        if (chips.length < 2 || chips.some((chip) => chip.getAnimations().some((a) => a instanceof CSSAnimation))) return;
        centers = chips.map((chip) => {
          const rect = chip.getBoundingClientRect();
          return rect.left + rect.width / 2;
        });
        pitch = (centers[centers.length - 1] - centers[0]) / (centers.length - 1) || 20;
        active = true;
        root.classList.add("is-fisheye");
      }
      pointer = event.clientX;
      if (!frame) frame = window.requestAnimationFrame(paint);
    };

    root.addEventListener("pointermove", onMove);
    root.addEventListener("pointerleave", clear);
    return () => {
      root.removeEventListener("pointermove", onMove);
      root.removeEventListener("pointerleave", clear);
      clear();
    };
  }, [host]);
}
