import { Tooltip } from "antd";
import { useEffect, useRef, useState } from "react";
import type { TaskCounts } from "../mock/stats";

const SEGMENTS = [
  { key: "done", color: "#73d13d", label: (n: number) => `已完成（含无权限等终态） ${n}` },
  { key: "failed", color: "#ff4d4f", label: (n: number) => `失败 / 待人工 ${n}` },
  { key: "skipped", color: "#bfbfbf", label: (n: number) => `跳过 / 过期（未交付） ${n}` },
  { key: "queued", color: "#69b1ff", label: (n: number) => `未结（排队 + 运行中） ${n}` },
] as const;

function reduced() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** 胶囊数字：第一次从 0 跳到目标（700ms，前快后收），只跳这一次。之后直接显示新数，不回 0。减少动效直接是终值。 */
function usePillNumber(target: number, armed: boolean) {
  const [value, setValue] = useState(reduced() ? target : 0);
  const phase = useRef<"idle" | "jumping" | "done">(reduced() ? "done" : "idle");
  const latest = useRef(target);
  latest.current = target;

  useEffect(() => {
    if (!armed || phase.current !== "idle") return;
    phase.current = "jumping";
    let frame = 0;
    let started = 0;
    const tick = (now: number) => {
      started ||= now;
      const t = Math.min(1, (now - started) / 700);
      setValue(Math.round(latest.current * (1 - (1 - t) ** 4)));
      if (t < 1) frame = window.requestAnimationFrame(tick);
      else phase.current = "done";
    };
    frame = window.requestAnimationFrame(tick);
    return () => {
      window.cancelAnimationFrame(frame);
      if (phase.current === "jumping") phase.current = "idle";
    };
  }, [armed]);

  useEffect(() => {
    if (phase.current === "done") setValue(target);
  }, [target]);

  return value;
}

/**
 * 当前任务的进度条：分段堆叠条，不是 antd Progress。
 * 轨道 18px，按完成 / 失败 / 跳过 / 未结的数量占比分段，铺满整条；百分比胶囊在轨道外面，写已结占比。
 * flowing：只有执行机真在跑时斜纹才向右流动。empty：还没有数据，只画空轨道，胶囊 0%。
 */
export function TaskProgress({ counts, flowing, empty }: { counts?: TaskCounts; flowing?: boolean; empty?: boolean }) {
  const total = counts ? Math.max(1, counts.total || counts.done + counts.failed + counts.skipped + counts.queued) : 1;
  const settled = counts && !empty ? counts.done + counts.failed + counts.skipped : 0;
  const percent = empty || !counts ? 0 : Math.round((settled / total) * 100);

  // 数据第一次到了（约 60ms 后）整条容器宽度 0 → 100%（600ms）；之后只平滑变宽
  const [grown, setGrown] = useState(reduced());
  useEffect(() => {
    if (empty || grown) return;
    const timer = window.setTimeout(() => setGrown(true), 60);
    return () => window.clearTimeout(timer);
  }, [empty, grown]);

  const shown = usePillNumber(percent, !empty && grown);
  const segs = counts && !empty ? SEGMENTS.filter((seg) => counts[seg.key] > 0) : [];
  const aria = counts
    ? `进度 ${percent}%：完成 ${counts.done}，失败 ${counts.failed}，跳过 ${counts.skipped}，未结 ${counts.queued}，共 ${total}`
    : "进度 0%";

  return (
    <div className="task-bar">
      <div className="task-bar__track" role="img" aria-label={aria}>
        <div className="task-bar__segs" style={{ width: grown && !empty ? "100%" : 0 }}>
          {segs.map((seg, index) => (
            <Tooltip key={seg.key} title={seg.label(counts![seg.key])}>
              <i
                className={[
                  "task-bar__seg",
                  flowing ? "is-flow" : "",
                  segs.length === 1 ? "is-only" : index === 0 ? "is-first" : index === segs.length - 1 ? "is-last" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                style={{ width: `${Math.max(0, (counts![seg.key] / total) * 100)}%`, backgroundColor: seg.color }}
              />
            </Tooltip>
          ))}
        </div>
      </div>
      <span className="task-bar__pill">{empty ? 0 : shown}%</span>
    </div>
  );
}
