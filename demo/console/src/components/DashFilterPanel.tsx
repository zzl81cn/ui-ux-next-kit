import { DownOutlined } from "@ant-design/icons";
import { Button, Input, Select } from "antd";
import {
  Children,
  Fragment,
  isValidElement,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type TransitionEvent,
} from "react";

const WIDTHS = [
  { min: 1600, columns: 4 },
  { min: 768, columns: 3 },
  { min: 576, columns: 2 },
  { min: 0, columns: 1 },
];

function columnsFor(width: number) {
  return WIDTHS.find((item) => width >= item.min)?.columns ?? 1;
}

function flattenFields(nodes: ReactNode): ReactNode[] {
  const out: ReactNode[] = [];
  Children.forEach(nodes, (child) => {
    if (child == null || child === false || child === true) return;
    if (isValidElement<{ children?: ReactNode }>(child) && child.type === Fragment) {
      out.push(...flattenFields(child.props.children));
      return;
    }
    out.push(child);
  });
  return out;
}

export function DashFilterField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="dash-filter-field">
      <span>{label}</span>
      {children}
    </label>
  );
}

export function DashFilterPanel({
  hint,
  children,
  onSearch,
  onReset,
  loading = false,
  columns,
  actions,
}: {
  hint?: string;
  children: ReactNode;
  onSearch?: () => void;
  onReset?: () => void;
  loading?: boolean;
  columns?: number;
  /** 换掉默认的「重置 / 查询」（没有查询语义的面板，如运行日志）。末列按内容宽，字段均分剩余宽度。 */
  actions?: ReactNode;
}) {
  const rootRef = useRef<HTMLFormElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const actionsRef = useRef<HTMLDivElement>(null);
  const flipFrom = useRef<{ x: number; y: number } | null>(null);
  const slideGen = useRef(0);
  const slideStartedAt = useRef(0);
  const [containerWidth, setContainerWidth] = useState(1200);
  const [morePhase, setMorePhase] = useState<"closed" | "open" | "closing">("closed");
  const [sliding, setSliding] = useState(false);

  useLayoutEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const apply = (width: number) => {
      const next = Math.max(0, Math.round(width));
      setContainerWidth((prev) => (prev === next ? prev : next));
    };
    const readWidth = () => el.getBoundingClientRect().width;
    apply(readWidth());
    const observer = new ResizeObserver(() => apply(readWidth()));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const colCount = columns != null ? Math.max(1, columns) : columnsFor(containerWidth);
  const fields = flattenFields(children);
  const visibleWhenCollapsed = Math.max(1, colCount - 1);
  const canCollapse = fields.length > visibleWhenCollapsed;
  const head = canCollapse ? fields.slice(0, visibleWhenCollapsed) : fields;
  const tail = canCollapse ? fields.slice(visibleWhenCollapsed) : [];
  const moreOpen = morePhase === "open" || morePhase === "closing";

  const prefersReducedMotion = () =>
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const toggleMore = () => {
    const el = bodyRef.current;
    if (!el) return;
    if (prefersReducedMotion()) {
      el.style.height = "";
      el.style.overflow = "";
      setSliding(false);
      setMorePhase(morePhase === "open" ? "closed" : "open");
      return;
    }
    const current = el.getBoundingClientRect().height;
    const actionsBox = actionsRef.current?.getBoundingClientRect();
    flipFrom.current = actionsBox ? { x: actionsBox.left, y: actionsBox.top } : null;
    slideGen.current += 1;
    slideStartedAt.current = performance.now();
    el.dataset.slide = String(slideGen.current);
    el.style.overflow = "hidden";
    el.style.height = `${current}px`;
    if (morePhase === "closed" || morePhase === "closing") setMorePhase("open");
    else setMorePhase("closing");
    setSliding(true);
  };

  useLayoutEffect(() => {
    const el = bodyRef.current;
    if (!el || !sliding || prefersReducedMotion()) return;
    const gen = slideGen.current;
    const from = el.getBoundingClientRect().height;
    el.style.transition = "none";
    el.style.height = "auto";
    const to = el.getBoundingClientRect().height;
    el.style.height = `${Math.round(from)}px`;
    const actions = actionsRef.current;
    const origin = flipFrom.current;
    if (actions && origin) {
      const now = actions.getBoundingClientRect();
      actions.style.transition = "none";
      actions.style.transform = `translate3d(${origin.x - now.left}px, ${origin.y - now.top}px, 0)`;
      flipFrom.current = null;
    }
    void el.offsetHeight;
    el.style.transition = "";
    if (actions) actions.style.transition = "";
    const id = requestAnimationFrame(() => {
      if (slideGen.current !== gen) return;
      el.style.height = `${Math.round(to)}px`;
      if (actions) actions.style.transform = "translate3d(0, 0, 0)";
    });
    return () => cancelAnimationFrame(id);
  }, [morePhase, sliding]);

  const finishSlide = (el: HTMLDivElement) => {
    if (el.dataset.slide !== String(slideGen.current)) return;
    if (morePhase === "closing") setMorePhase("closed");
    else {
      el.style.height = "";
      el.style.overflow = "";
    }
    if (actionsRef.current) {
      actionsRef.current.style.transform = "";
      actionsRef.current.style.transition = "";
    }
    setSliding(false);
  };

  const onBodyTransitionEnd = (event: TransitionEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget || event.propertyName !== "height") return;
    finishSlide(event.currentTarget);
  };

  useEffect(() => {
    if (!sliding) return;
    const phase = morePhase;
    const gen = slideGen.current;
    const elapsed = performance.now() - slideStartedAt.current;
    // 560ms 从点击算起。定时器会晚到，提前 40ms 启动，保证停稳不晚于这一上限。
    const timer = window.setTimeout(() => {
      const el = bodyRef.current;
      if (!el || el.dataset.slide !== String(gen)) return;
      if (phase === "closing") setMorePhase("closed");
      else {
        el.style.height = "";
        el.style.overflow = "";
      }
      if (actionsRef.current) {
        actionsRef.current.style.transform = "";
        actionsRef.current.style.transition = "";
      }
      setSliding(false);
    }, Math.max(0, 560 - elapsed - 40));
    return () => window.clearTimeout(timer);
  }, [sliding, morePhase]);

  useLayoutEffect(() => {
    if (sliding || morePhase !== "closed") return;
    const el = bodyRef.current;
    if (!el) return;
    el.style.height = "";
    el.style.overflow = "";
  }, [morePhase, sliding]);

  return (
    <form
      ref={rootRef}
      className="dash-filter"
      onSubmit={(event) => {
        event.preventDefault();
        onSearch?.();
      }}
    >
      {hint ? <p className="dash-filter-hint">{hint}</p> : null}
      <div
        ref={bodyRef}
        className={["dash-filter-body", "is-query", actions ? "has-actions" : null, sliding ? "is-sliding" : null].filter(Boolean).join(" ")}
        style={{ "--dash-filter-cols": colCount } as CSSProperties}
        onTransitionEnd={onBodyTransitionEnd}
      >
        <div className="dash-filter-fields">{head}</div>
        {canCollapse ? (
          <div className={["dash-filter-more", moreOpen ? "is-open" : null, morePhase === "closing" ? "is-closing" : null].filter(Boolean).join(" ")} aria-hidden={!moreOpen}>
            {tail.map((field, index) => (
              <div key={index} className="dash-filter-more-item">
                {field}
              </div>
            ))}
          </div>
        ) : null}
        <div ref={actionsRef} className="dash-filter-actions">
          {canCollapse ? (
            <Button type="link" className="dash-filter-toggle" aria-expanded={morePhase === "open"} onClick={toggleMore}>
              {morePhase === "open" ? "收起" : "展开"}
              <DownOutlined className={morePhase === "closed" ? undefined : "is-flipped"} />
            </Button>
          ) : null}
          {actions ?? (
            <>
              <Button onClick={onReset}>重置</Button>
              <Button type="primary" htmlType="submit" loading={loading}>
                查询
              </Button>
            </>
          )}
        </div>
      </div>
    </form>
  );
}

export function FilterInput({ className, ...props }: React.ComponentProps<typeof Input>) {
  return <Input className={["dash-filter-input", className].filter(Boolean).join(" ")} allowClear {...props} />;
}

export function FilterSelect({ className, ...props }: React.ComponentProps<typeof Select>) {
  return <Select className={["dash-filter-select", className].filter(Boolean).join(" ")} allowClear {...props} />;
}
