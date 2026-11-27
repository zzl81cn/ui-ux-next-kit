import { Tooltip } from "antd";
import { useEffect, useState } from "react";
import { prefersReducedMotion } from "../lib/motion";
import type { TaskCounts } from "../mock/stats";
import { TweenNumber } from "./TweenNumber";

/** 段色在 CSS 里按主题取（浅色一组、深色换首页色板），这里只管顺序和提示文案 */
const SEGMENTS = [
  { key: "done", label: (n: number) => `已完成（含无权限等终态） ${n}` },
  { key: "failed", label: (n: number) => `失败 / 待人工 ${n}` },
  { key: "skipped", label: (n: number) => `跳过 / 过期（未交付） ${n}` },
  { key: "running", label: (n: number) => `运行中 ${n}` },
] as const;

const reduced = prefersReducedMotion;

/**
 * 当前任务的进度条：分段堆叠条，不是 antd Progress。
 * 轨道代表这一批的总数，有颜色的那一截 = 已处理（完成 + 失败 + 跳过），长度就是右边的百分比，
 * 里面按完成 / 失败 / 跳过分段；执行机真在跑时，最后多一小段「运行中」（最窄 8px）。未结的排队部分不画色，是空轨道。
 * 百分比胶囊在轨道外面，写已处理占比（数字补间，不回 0）。paused：有进度但此刻没在执行（派单待领、执行器空闲的未完成批次）时整条轨道呼吸。flowing：执行机真在跑时，有颜色的整段一起向右流动。empty：还没有数据，只画空轨道，胶囊 0%。
 */
export function TaskProgress({ counts, flowing, empty, paused }: { counts?: TaskCounts; flowing?: boolean; empty?: boolean; paused?: boolean }) {
  const total = counts ? Math.max(1, counts.total || counts.done + counts.failed + counts.skipped + counts.queued) : 1;
  const settled = counts && !empty ? counts.done + counts.failed + counts.skipped : 0;
  const running = counts && !empty && flowing ? Math.min(counts.running ?? 0, counts.queued) : 0;
  const filled = settled + running;
  const percent = empty || !counts ? 0 : Math.round((settled / total) * 100);

  // 数据第一次到了（等所在那一行淡入出来，约 300ms 后），有颜色的部分从 0 长到已处理占比（600ms）；之后只用 0.35s 平滑变宽
  const [grown, setGrown] = useState(reduced());
  const [live, setLive] = useState(reduced());
  useEffect(() => {
    if (empty || grown) return;
    const timer = window.setTimeout(() => setGrown(true), 300);
    return () => window.clearTimeout(timer);
  }, [empty, grown]);
  useEffect(() => {
    if (!grown || live) return;
    const timer = window.setTimeout(() => setLive(true), 700);
    return () => window.clearTimeout(timer);
  }, [grown, live]);

  const segs = counts && !empty ? SEGMENTS.filter((seg) => (seg.key === "running" ? running : counts[seg.key]) > 0) : [];
  const amount = (key: (typeof SEGMENTS)[number]["key"]) => (key === "running" ? running : counts![key]);
  const aria = counts
    ? `进度 ${percent}%：完成 ${counts.done}，失败 ${counts.failed}，跳过 ${counts.skipped}，未结 ${counts.queued}，共 ${total}`
    : "进度 0%";
  const pending = counts && !empty ? counts.queued : 0;
  const pillTip = counts
    ? `已处理 ${settled} / ${total}${
        settled > 0
          ? `（${[counts.done > 0 ? `完成 ${counts.done}` : "", counts.failed > 0 ? `失败 ${counts.failed}` : "", counts.skipped > 0 ? `跳过 ${counts.skipped}` : ""].filter(Boolean).join("，")}）`
          : ""
      }`
    : "已处理 0 / 0";

  return (
    <div className={paused ? "task-bar is-paused" : "task-bar"}>
      <div className="task-bar__track" role="img" aria-label={aria}>
        <div
          className={["task-bar__segs", flowing && filled > 0 ? "is-flow" : "", live ? "is-live" : ""].filter(Boolean).join(" ")}
          style={{ width: grown && !empty ? `${(filled / total) * 100}%` : 0 }}
        >
          {segs.map((seg, index) => (
            <Tooltip key={seg.key} title={seg.label(amount(seg.key))}>
              <i
                className={[
                  "task-bar__seg",
                  `task-bar__seg--${seg.key}`,
                  segs.length === 1 ? "is-only" : index === 0 ? "is-first" : index === segs.length - 1 ? "is-last" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                style={{ width: `${(amount(seg.key) / Math.max(1, filled)) * 100}%` }}
              />
            </Tooltip>
          ))}
        </div>
        <Tooltip title={counts && !empty ? `未结 ${pending}（排队 ${Math.max(0, pending - running)}，运行中 ${running}）` : undefined}>
          <i className="task-bar__rest" />
        </Tooltip>
      </div>
      <Tooltip title={pillTip}>
        <span className="task-bar__pill">
          <TweenNumber value={!empty && grown ? percent : 0} />%
        </span>
      </Tooltip>
    </div>
  );
}
