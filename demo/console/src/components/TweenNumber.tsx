import TweenOne, { ChildrenPlugin } from "rc-tween-one";
import { useState, type CSSProperties } from "react";
import { prefersReducedMotion } from "../lib/motion";

// Ant Design Motion · TweenOne「Children」插件：数字补间（与范本控制台同一版本 3.0.6）
// https://motion.ant.design/components/tween-one-cn#components-tween-one-demo-children
TweenOne.plugins.push(ChildrenPlugin);

type Props = {
  value: number;
  /** 补间起点（首个子节点的文字）。重挂载时传上一次画出的值，就不会从 0 重来 */
  from?: number;
  /** 渲染的标签，默认 span */
  as?: "span" | "strong" | "div";
  className?: string;
  style?: CSSProperties;
  /** 小数位数，默认 0 */
  floatLength?: number;
};

/** 时长随变化量伸缩：小变动不拖沓，大变动不超过 1s */
function durationFor(delta: number) {
  return Math.min(1000, 380 + Math.abs(delta) * 25);
}

/**
 * 数字补间：首次从 `from`（默认 0）起跳，之后数值变化不归零，从当前显示值补间到新值（easeOutExpo）。
 * 系统开启「减少动效」时直接显示终值。
 */
export function TweenNumber({ value, from = 0, as = "span", className, style, floatLength = 0 }: Props) {
  // 渲染期派生：记下「上一个目标值 → 这次的变化量」，用来决定补间时长
  const [tracked, setTracked] = useState({ value, delta: value - from });
  if (tracked.value !== value) {
    setTracked({ value, delta: value - tracked.value });
  }

  if (prefersReducedMotion()) {
    const Tag = as;
    return (
      <Tag className={className} style={style}>
        {value.toLocaleString(undefined, { minimumFractionDigits: floatLength, maximumFractionDigits: floatLength })}
      </Tag>
    );
  }

  return (
    <TweenOne
      component={as}
      className={className}
      style={style}
      animation={{
        Children: { value, floatLength, formatMoney: true },
        duration: durationFor(tracked.delta),
        ease: "easeOutExpo",
      }}
    >
      {from}
    </TweenOne>
  );
}
