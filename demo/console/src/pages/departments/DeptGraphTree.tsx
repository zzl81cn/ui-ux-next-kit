import { CaretDownOutlined, CaretRightOutlined, HolderOutlined } from "@ant-design/icons";
import { useEffect, useMemo, useRef, useState, type DragEvent, type ReactNode } from "react";

/** 轨道色固定，不跟控制台主色走。 */
const DEPTH_LIGHT = ["#1677ff", "#722ed1", "#13c2c2", "#faad14", "#eb2f96", "#52c41a", "#fa541c", "#2f54eb"];
const DEPTH_DARK = ["#4096ff", "#9254de", "#36cfc9", "#ffc53d", "#f759ab", "#73d13d", "#ff7a45", "#597ef7"];
const INDENT = 20;
const ROW_H = 48;
const NODE = 8;

type DropPosition = "before" | "after";

type FlatRow<T> = {
  node: T;
  depth: number;
  rootHasNextSibling: boolean;
  underExpandedRoot: boolean;
  isFirst: boolean;
  isLast: boolean;
  closesRootSubtree: boolean;
  hasChildren: boolean;
  isExpanded: boolean;
  /** 所属的一级节点已是根的最后一个子节点。根干不必再往下延伸。 */
  lastRootChild: boolean;
  /**
   * 祖先列是否还要往下画竖线。下标 = 深度。
   * 进入某节点的子树时写入 `!isLast`：该节点后面还有同级，子孙行左侧要把这一列干续上。
   * 否则三级（及更深）行只画根干和直接父级，中间的一级紫干会断在展开的二级子树里。
   */
  ancestorContinues: boolean[];
};

function depthColor(depth: number, dark: boolean): string {
  const palette = dark ? DEPTH_DARK : DEPTH_LIGHT;
  return palette[depth % palette.length] ?? "#1677ff";
}

function columnX(level: number) {
  return level * INDENT + INDENT / 2;
}

function railWidth(depth: number) {
  if (depth <= 0) return INDENT;
  return depth * INDENT + INDENT / 2;
}

function useConsoleDark() {
  const [dark, setDark] = useState(
    () => typeof document !== "undefined" && document.documentElement.dataset.consoleTheme === "dark",
  );
  useEffect(() => {
    const root = document.documentElement;
    const sync = () => setDark(root.dataset.consoleTheme === "dark");
    const observer = new MutationObserver(sync);
    observer.observe(root, { attributes: true, attributeFilter: ["data-console-theme"] });
    return () => observer.disconnect();
  }, []);
  return dark;
}

function flattenRows<T>(
  nodes: T[],
  expanded: Set<string>,
  getKey: (node: T) => string,
  getChildren: (node: T) => T[] | undefined,
  depth = 0,
  rootHasNextSibling = false,
  underExpandedRoot = false,
  lastRootChild = false,
  ancestorContinues: boolean[] = [],
): FlatRow<T>[] {
  const rows: FlatRow<T>[] = [];
  nodes.forEach((node, index) => {
    const children = getChildren(node) ?? [];
    const hasChildren = children.length > 0;
    const key = getKey(node);
    const isExpanded = hasChildren && expanded.has(key);
    const isRoot = depth === 0;
    const isLast = index === nodes.length - 1;
    const rowLastRootChild = isRoot ? false : depth === 1 ? isLast : lastRootChild;
    rows.push({
      node,
      depth,
      rootHasNextSibling: isRoot ? !isLast : rootHasNextSibling,
      underExpandedRoot: isRoot ? isExpanded : underExpandedRoot,
      isFirst: index === 0,
      isLast,
      closesRootSubtree: false,
      hasChildren,
      isExpanded,
      lastRootChild: rowLastRootChild,
      ancestorContinues,
    });
    if (hasChildren && isExpanded) {
      rows.push(
        ...flattenRows(
          children,
          expanded,
          getKey,
          getChildren,
          depth + 1,
          isRoot ? !isLast : rootHasNextSibling,
          underExpandedRoot || (isRoot && isExpanded),
          isRoot ? false : rowLastRootChild,
          [...ancestorContinues, !isLast],
        ),
      );
    }
  });
  return rows.map((row, index) => {
    const next = rows[index + 1];
    return {
      ...row,
      closesRootSubtree: !next || next.depth === 0,
    };
  });
}

function NodeDot({ cx, cy, color, hollow }: { cx: number; cy: number; color: string; hollow: boolean }) {
  const r = NODE / 2;
  if (hollow) {
    return (
      <circle cx={cx} cy={cy} r={r} fill="var(--ant-color-bg-container, #fff)" stroke={color} strokeWidth={2} />
    );
  }
  return <circle cx={cx} cy={cy} r={r} fill={color} />;
}

function Rail({ row, dark }: { row: FlatRow<unknown>; dark: boolean }) {
  const width = railWidth(row.depth);
  const midY = ROW_H / 2;
  const hollow = row.hasChildren && row.isExpanded;
  const rootX = columnX(0);
  const nodeX = columnX(row.depth);
  const rootColor = depthColor(0, dark);
  const nodeColor = depthColor(row.depth, dark);
  const overlap = 1;

  if (row.depth === 0) {
    return (
      <svg className="dept-graph__svg" width={width} height={ROW_H} aria-hidden>
        {!row.isFirst ? (
          <line x1={rootX} y1={-overlap} x2={rootX} y2={midY} stroke={rootColor} strokeWidth={2} strokeLinecap="round" />
        ) : null}
        {(row.hasChildren && row.isExpanded) || row.rootHasNextSibling ? (
          <line x1={rootX} y1={midY} x2={rootX} y2={ROW_H + overlap} stroke={rootColor} strokeWidth={2} strokeLinecap="round" />
        ) : null}
        <NodeDot cx={rootX} cy={midY} color={nodeColor} hollow={hollow} />
      </svg>
    );
  }

  const parentX = columnX(row.depth - 1);
  const parentColor = depthColor(row.depth - 1, dark);
  const ancestorRails: ReactNode[] = [];
  // 根干（depth 0）仍走下面的特殊逻辑；这里补 1‥depth-2 的中间祖先干
  for (let level = 1; level < row.depth - 1; level += 1) {
    if (!row.ancestorContinues[level]) continue;
    const x = columnX(level);
    ancestorRails.push(
      <line
        key={`anc-${level}`}
        x1={x}
        y1={-overlap}
        x2={x}
        y2={ROW_H + overlap}
        stroke={depthColor(level, dark)}
        strokeWidth={2}
        strokeLinecap="round"
      />,
    );
  }
  return (
    <svg className="dept-graph__svg" width={width} height={ROW_H} aria-hidden>
      {row.underExpandedRoot && (row.rootHasNextSibling || !row.lastRootChild) ? (
        <line x1={rootX} y1={-overlap} x2={rootX} y2={ROW_H + overlap} stroke={rootColor} strokeWidth={2} strokeLinecap="round" />
      ) : null}
      {!row.underExpandedRoot && row.rootHasNextSibling && row.closesRootSubtree ? (
        <line x1={rootX} y1={midY} x2={rootX} y2={ROW_H + overlap} stroke={rootColor} strokeWidth={2} strokeLinecap="round" />
      ) : null}
      {ancestorRails}
      <line x1={parentX} y1={-overlap} x2={parentX} y2={midY} stroke={parentColor} strokeWidth={2} strokeLinecap="round" />
      {!row.isLast ? (
        <line x1={parentX} y1={midY} x2={parentX} y2={ROW_H + overlap} stroke={parentColor} strokeWidth={2} strokeLinecap="round" />
      ) : null}
      <path
        d={`M ${parentX} ${midY} Q ${parentX} ${midY + 4} ${nodeX} ${midY}`}
        fill="none"
        stroke={nodeColor}
        strokeWidth={2}
        strokeLinecap="round"
      />
      {row.hasChildren && row.isExpanded ? (
        <line x1={nodeX} y1={midY} x2={nodeX} y2={ROW_H + overlap} stroke={nodeColor} strokeWidth={2} strokeLinecap="round" />
      ) : null}
      <NodeDot cx={nodeX} cy={midY} color={nodeColor} hollow={hollow} />
    </svg>
  );
}

type LevelSection<T> = { head: FlatRow<T>; children: FlatRow<T>[] };
type CompanyBlock<T> = { root: FlatRow<T> | null; sections: LevelSection<T>[] };

/** 公司（depth 0）包住它下面的各二级节。公司吸在顶上，二级在公司下面依次替换。 */
function groupByCompany<T>(rows: FlatRow<T>[]): CompanyBlock<T>[] {
  const blocks: CompanyBlock<T>[] = [];
  let current: CompanyBlock<T> | null = null;
  const ensure = () => {
    if (!current) {
      current = { root: null, sections: [] };
      blocks.push(current);
    }
    return current;
  };
  let index = 0;
  while (index < rows.length) {
    const row = rows[index];
    if (!row) break;
    if (row.depth === 0) {
      current = { root: row, sections: [] };
      blocks.push(current);
      index += 1;
      continue;
    }
    if (row.depth === 1) {
      const block = ensure();
      const children: FlatRow<T>[] = [];
      index += 1;
      while (index < rows.length && (rows[index]?.depth ?? 0) > 1) {
        const child = rows[index];
        if (child) children.push(child);
        index += 1;
      }
      block.sections.push({ head: row, children });
      continue;
    }
    const block = ensure();
    const last = block.sections[block.sections.length - 1];
    if (last) last.children.push(row);
    index += 1;
  }
  return blocks;
}

function RootSection({
  sectionKey,
  rootRow,
  childRows,
}: {
  sectionKey: string;
  rootRow: (stuck: boolean) => ReactNode;
  childRows: ReactNode[];
}) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [stuck, setStuck] = useState(false);
  useEffect(() => {
    const sentinel = sentinelRef.current;
    const scrollRoot = sentinel?.closest(".dept-tree-panel--scrollable");
    if (!sentinel || !scrollRoot) return;
    const observer = new IntersectionObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const rootTop = entry.rootBounds?.top ?? 0;
      setStuck(!entry.isIntersecting && entry.boundingClientRect.top < rootTop);
    }, {
      root: scrollRoot,
      threshold: 0,
    });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [sectionKey]);
  return (
    <div className="dept-graph__section">
      <div ref={sentinelRef} className="dept-graph__sentinel" aria-hidden />
      {rootRow(stuck)}
      {childRows}
    </div>
  );
}

export function DeptGraphTree<T>({
  nodes,
  expandedKeys,
  getKey,
  getChildren,
  renderRow,
  onExpand,
  draggable = false,
  canDragRow,
  onMove,
  canDrop,
}: {
  nodes: T[];
  expandedKeys: string[];
  getKey: (node: T) => string;
  getChildren: (node: T) => T[] | undefined;
  renderRow: (node: T) => ReactNode;
  onExpand: (keys: string[]) => void;
  draggable?: boolean;
  canDragRow?: (node: T) => boolean;
  onMove?: (dragId: string, targetId: string, position: DropPosition) => void | Promise<void>;
  canDrop?: (dragId: string, targetId: string) => boolean;
}) {
  const dark = useConsoleDark();
  const expandedSet = useMemo(() => new Set(expandedKeys), [expandedKeys]);
  const [dragKey, setDragKey] = useState<string | null>(null);
  const [hover, setHover] = useState<{ key: string; position: DropPosition } | null>(null);
  const rows = useMemo(
    () => flattenRows(nodes, expandedSet, getKey, getChildren),
    [nodes, expandedSet, getKey, getChildren],
  );

  const toggle = (key: string, hasChildren: boolean, isExpanded: boolean) => {
    if (!hasChildren) return;
    const next = new Set(expandedKeys);
    if (isExpanded) next.delete(key);
    else next.add(key);
    onExpand([...next]);
  };

  const clearDrag = () => {
    setDragKey(null);
    setHover(null);
  };

  const onDragOver = (event: DragEvent<HTMLDivElement>, rowKey: string) => {
    if (!draggable || !dragKey || dragKey === rowKey) return;
    if (canDrop && !canDrop(dragKey, rowKey)) {
      event.dataTransfer.dropEffect = "none";
      if (hover?.key === rowKey) setHover(null);
      return;
    }
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    const rect = event.currentTarget.getBoundingClientRect();
    const position: DropPosition = event.clientY - rect.top < rect.height / 2 ? "before" : "after";
    setHover({ key: rowKey, position });
  };

  const onDrop = async (event: DragEvent<HTMLDivElement>, rowKey: string) => {
    if (!draggable || !onMove) return;
    event.preventDefault();
    const from = dragKey ?? event.dataTransfer.getData("text/plain");
    if (!from || from === rowKey || (canDrop && !canDrop(from, rowKey))) {
      clearDrag();
      return;
    }
    const rect = event.currentTarget.getBoundingClientRect();
    const position: DropPosition =
      hover?.key === rowKey ? hover.position : event.clientY - rect.top < rect.height / 2 ? "before" : "after";
    await onMove(from, rowKey, position);
    clearDrag();
  };

  const renderTreeRow = (row: FlatRow<T>, index: number, affix: "company" | "level" | null, stuck = false) => {
    const key = getKey(row.node);
    const classes = [
      "dept-graph__row",
      index % 2 === 1 ? "is-stripe" : "",
      affix ? "is-affix" : "",
      affix === "company" ? "is-root-sticky" : "",
      affix === "level" ? "is-level-sticky" : "",
      affix && stuck ? "is-stuck" : "",
      dragKey === key ? "is-dragging" : "",
      hover?.key === key && hover.position === "before" ? "is-drop-before" : "",
      hover?.key === key && hover.position === "after" ? "is-drop-after" : "",
    ]
      .filter(Boolean)
      .join(" ");
    const showHandle = draggable && (canDragRow ? canDragRow(row.node) : true);
    return (
      <div
        key={key}
        className={classes}
        onDragOver={(event) => onDragOver(event, key)}
        onDragLeave={() => {
          if (hover?.key === key) setHover(null);
        }}
        onDrop={(event) => void onDrop(event, key)}
      >
        {showHandle ? (
          <span
            className="dept-graph__handle"
            draggable
            aria-label="拖拽排序"
            onDragStart={(event) => {
              event.dataTransfer.setData("text/plain", key);
              event.dataTransfer.effectAllowed = "move";
              setDragKey(key);
            }}
            onDragEnd={clearDrag}
          >
            <HolderOutlined />
          </span>
        ) : draggable ? (
          <span className="dept-graph__handle dept-graph__handle--spacer" aria-hidden />
        ) : null}
        <Rail row={row} dark={dark} />
        <button
          type="button"
          className="dept-graph__switcher"
          aria-label={row.isExpanded ? "折叠" : "展开"}
          disabled={!row.hasChildren}
          onClick={() => toggle(key, row.hasChildren, row.isExpanded)}
        >
          {row.hasChildren ? (
            row.isExpanded ? <CaretDownOutlined /> : <CaretRightOutlined />
          ) : (
            <span className="dept-graph__switcher-pad" />
          )}
        </button>
        <div className="dept-graph__content">{renderRow(row.node)}</div>
      </div>
    );
  };

  const companies = groupByCompany(rows);
  let flatIndex = 0;
  return (
    <div className="dept-graph">
      {companies.map((company) => {
        const companyKey = company.root ? getKey(company.root.node) : "loose";
        const rootIndex = company.root ? flatIndex++ : -1;
        const sections = company.sections.map((section) => {
          const sectionKey = getKey(section.head.node);
          const headIndex = flatIndex++;
          return (
            <RootSection
              key={sectionKey}
              sectionKey={sectionKey}
              rootRow={(stuck) => renderTreeRow(section.head, headIndex, "level", stuck)}
              childRows={section.children.map((row) => {
                const index = flatIndex++;
                return renderTreeRow(row, index, null);
              })}
            />
          );
        });
        if (!company.root) {
          return <div key={companyKey}>{sections}</div>;
        }
        const root = company.root;
        return (
          <RootSection
            key={companyKey}
            sectionKey={companyKey}
            rootRow={(stuck) => renderTreeRow(root, rootIndex, "company", stuck)}
            childRows={sections}
          />
        );
      })}
    </div>
  );
}
