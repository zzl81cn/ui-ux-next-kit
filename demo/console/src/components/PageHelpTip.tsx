import { InfoCircleFilled } from "@ant-design/icons";
import { Tooltip } from "antd";
import { useCallback, type ReactNode } from "react";

/**
 * 说明图标：把页内「怎么用、规则是什么」这类介绍性长文案收成一枚 18px 蓝色信息图标，悬停出浮层，并用低频扫光引导注意。
 * 进场打水漂（从图标所在的那半边飞入，只播一次），再开始扫光；默认扫 3 轮后停下，persistent 才一直循环。
 * 扫光必须在 `.page-help-tip__icon` 圆内（`overflow: hidden`），不能挂在外框上，否则会和图标分家。
 * 报错、警告、随数据变化或带操作的提示不要收进来，仍用 Alert。
 */
export function PageHelpTip({
  title,
  children,
  placement = "bottom",
  persistent = false,
}: {
  title: string;
  children: ReactNode;
  placement?: "bottom" | "bottomRight";
  persistent?: boolean;
}) {
  /**
   * 进场方向：图标中心在视口左半边 → 从左侧飞入；右半边 → 从右侧飞入。
   * 只在挂载时量一次，直接写 data-from（不 setState、不随窗口缩放重量）。
   */
  const placeRef = useCallback((el: HTMLSpanElement | null) => {
    if (!el) return;
    const rect = el.getBoundingClientRect();
    el.dataset.from = rect.left + rect.width / 2 < window.innerWidth / 2 ? "left" : "right";
  }, []);

  return (
    <Tooltip
      placement={placement}
      styles={{ container: { maxWidth: 440 } }}
      title={
        <div className="page-help-tip__body">
          <b>{title}</b>
          <div>{children}</div>
        </div>
      }
    >
      <span
        ref={placeRef}
        className={persistent ? "page-help-tip page-help-tip--persistent" : "page-help-tip"}
        role="img"
        aria-label={title}
      >
        <span className="page-help-tip__icon">
          <InfoCircleFilled />
        </span>
      </span>
    </Tooltip>
  );
}
