import * as echarts from "echarts";
import { useEffect, useMemo, useRef } from "react";
import { useThemeMode } from "../theme/ThemeRoot";

export type TimelineHours = 24 | 168;
export type RunStatus = "success" | "failed" | "running" | "cancelled";

export const STATUS_META: Record<RunStatus, { label: string; color: string }> = {
  success: { label: "成功", color: "#22c55e" },
  failed: { label: "失败", color: "#ec4899" },
  running: { label: "运行中", color: "#ff8a3d" },
  cancelled: { label: "取消", color: "#8b919a" },
};

type Run = { app: string; start: number; end: number; status: RunStatus; mis: number; robot: string };

const APPS = ["发票同步", "对账回写", "库存推送", "邮件拉取", "报表导出", "日志归档"];
const MIN = 60000;
const LANE_H = 54;
const LANE_LIMIT = 8;
const PAD_TOP = 8;
const PAD_BOTTOM = 26;

/** 固定种子的伪随机，保证重绘时数据不抖 */
function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

/** 示例数据：一台执行机把派单首尾相接地跑下去，另一台偶尔插进来。最后一单还在跑。 */
function makeRuns(now: number): Run[] {
  const rand = rng(20261126);
  const rows: Run[] = [];
  const horizon = now - 168 * 60 * MIN;
  const weights = [30, 22, 18, 12, 8, 5];
  const pick = () => {
    let x = rand() * weights.reduce((sum, item) => sum + item, 0);
    for (let i = 0; i < weights.length; i += 1) {
      x -= weights[i];
      if (x <= 0) return APPS[i];
    }
    return APPS[0];
  };
  let cursor = horizon;
  let mis = 9100;
  while (cursor < now) {
    const long = rand() < 0.12;
    const duration = (long ? 60 + rand() * 80 : 3 + rand() * 40) * MIN;
    const roll = rand();
    const status: RunStatus = roll < 0.8 ? "success" : roll < 0.93 ? "failed" : "cancelled";
    const end = cursor + duration;
    rows.push({ app: pick(), start: cursor, end, status, mis: (mis += 1), robot: "执行机-01" });
    cursor = end + (rand() < 0.15 ? 60 + rand() * 120 : rand() * 25) * MIN;
  }
  const last = rows[rows.length - 1];
  last.end = now;
  last.status = "running";
  // 第二台机器：稀疏，会和第一台重叠
  cursor = horizon + 90 * MIN;
  while (cursor < now - 30 * MIN) {
    const duration = (5 + rand() * 25) * MIN;
    rows.push({ app: pick(), start: cursor, end: cursor + duration, status: rand() < 0.9 ? "success" : "failed", mis: (mis += 1), robot: "执行机-02" });
    cursor += duration + (120 + rand() * 360) * MIN;
  }
  return rows;
}

const pad = (value: number) => `${value}`.padStart(2, "0");
const fmtClock = (ms: number, withDay: boolean) => {
  const d = new Date(ms);
  return `${withDay ? `${d.getMonth() + 1}/${d.getDate()} ` : ""}${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
const fmtSpan = (ms: number) => {
  const min = Math.max(1, Math.round(ms / MIN));
  return min < 60 ? `${min} 分钟` : `${(min / 60).toFixed(1)} 小时`;
};

type Segment = { lane: number; run: Run; start: number; end: number };

/** 按窗口取派单：只画已被执行机领走的，排队中的不画。泳道按派单数从多到少，最多 8 条，其余只报数。 */
export function useTimelineData(hours: TimelineHours, now: number) {
  return useMemo(() => {
    const winStart = now - hours * 60 * MIN;
    const inWindow = makeRuns(now).filter((run) => run.end > winStart && run.start < now);
    const counts = new Map<string, number>();
    for (const run of inWindow) counts.set(run.app, (counts.get(run.app) ?? 0) + 1);
    const ordered = [...counts.entries()].sort((a, b) => b[1] - a[1] || APPS.indexOf(a[0]) - APPS.indexOf(b[0]));
    const lanes = ordered.slice(0, LANE_LIMIT).map(([app]) => app);
    const hidden = ordered.length - lanes.length;
    const segments: Segment[] = inWindow
      .filter((run) => lanes.includes(run.app))
      .map((run) => ({ lane: lanes.indexOf(run.app), run, start: Math.max(run.start, winStart), end: Math.min(run.end, now) }))
      .sort((a, b) => a.run.start - b.run.start);
    return { winStart, now, lanes, hidden, segments };
  }, [hours, now]);
}

/**
 * 执行时间轴（custom 系列，睡眠阶段图的做法）。泳道 = 应用，色块 = 一次派单，换泳道的相邻两段用渐变过渡带连起来。
 * 进场：与其他图表共用起步时刻（调用方等「图表进场延迟」后才挂载），按开始时间从左到右逐段出现。
 * 每个色块（连同光晕）从左边沿向右长出并淡入，单段 600ms 缓出，段间隔 min(70ms, 1000ms/段数)，过渡带比它连向的那一段晚 120ms。
 * 切窗口重画并重播；减少动效不播。
 */
export function CommandTimeline({ hours, now }: { hours: TimelineHours; now: number }) {
  const { dark } = useThemeMode();
  const hostRef = useRef<HTMLDivElement>(null);
  const data = useTimelineData(hours, now);
  const height = data.lanes.length * LANE_H + PAD_TOP + PAD_BOTTOM;

  useEffect(() => {
    const el = hostRef.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const chart = echarts.getInstanceByDom(el) ?? echarts.init(el);
    const ink = dark ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.45)";
    const line = dark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)";
    const { segments, lanes, winStart } = data;
    const step = segments.length > 0 ? Math.min(70, 1000 / segments.length) : 0;
    const withDay = hours > 24;

    // 过渡带：按开始时间排序，相邻两段间隔不超过 40 分钟，且不在同一条泳道
    type Band = { from: Segment; to: Segment; toIndex: number };
    const bands: Band[] = [];
    for (let i = 0; i + 1 < segments.length; i += 1) {
      const a = segments[i];
      const b = segments[i + 1];
      const gap = b.start - a.end;
      if (a.lane !== b.lane && gap >= 0 && gap <= 40 * MIN) bands.push({ from: a, to: b, toIndex: i + 1 });
    }

    const blockHeight = (laneH: number) => Math.min(30, laneH * 0.46);

    chart.setOption(
      {
        animation: !reduce,
        grid: { left: 8, right: 12, top: PAD_TOP, bottom: PAD_BOTTOM },
        tooltip: {
          trigger: "item",
          appendTo: "body",
          borderWidth: 0,
          backgroundColor: dark ? "#1f1f1f" : "#fff",
          textStyle: { color: dark ? "#e6e8eb" : "#111827", fontSize: 12 },
          formatter: (params: { seriesIndex: number; dataIndex: number }) => {
            if (params.seriesIndex !== 1) return "";
            const seg = segments[params.dataIndex];
            if (!seg) return "";
            const meta = STATUS_META[seg.run.status];
            const running = seg.run.status === "running";
            return [
              `<b>${seg.run.app}</b>`,
              `${meta.label} · MIS_ID ${seg.run.mis}`,
              `${fmtClock(seg.run.start, true)} – ${running ? "现在" : fmtClock(seg.run.end, true)} · ${fmtSpan(seg.run.end - seg.run.start)}`,
              `执行机 ${seg.run.robot}`,
            ].join("<br/>");
          },
        },
        xAxis: {
          type: "time",
          min: winStart,
          max: data.now,
          axisTick: { show: false },
          axisLine: { show: false },
          splitLine: { show: true, lineStyle: { type: "dashed", color: line } },
          axisLabel: { color: ink, fontSize: 11, hideOverlap: true, formatter: (value: number) => fmtClock(value, withDay) },
        },
        yAxis: {
          type: "value",
          min: 0,
          max: lanes.length,
          interval: 1,
          inverse: true,
          axisLabel: { show: false },
          axisTick: { show: false },
          axisLine: { show: false },
          splitLine: { show: true, lineStyle: { type: "solid", color: line } },
        },
        series: [
          {
            // 0：过渡带，画在色块下面
            type: "custom",
            silent: true,
            z: 1,
            animationDuration: 600,
            animationEasing: "cubicOut",
            animationDelay: (index: number) => (bands[index]?.toIndex ?? 0) * step + 120,
            data: bands.map((band) => [band.from.lane, band.to.lane]),
            renderItem: (params: { dataIndex: number }, api: any) => {
              const band = bands[params.dataIndex];
              const laneH = api.size([0, 1])[1];
              const h = blockHeight(laneH);
              const x0 = api.coord([band.from.end, 0])[0];
              const x1 = api.coord([band.to.start, 0])[0];
              const width = Math.min(14, Math.max(8, x1 - x0));
              const cx = (x0 + x1) / 2;
              const upper = band.from.lane < band.to.lane ? band.from : band.to;
              const lower = upper === band.from ? band.to : band.from;
              const yTop = api.coord([0, upper.lane + 0.5])[1] + h / 2;
              const yBottom = api.coord([0, lower.lane + 0.5])[1] - h / 2;
              return {
                type: "rect",
                shape: { x: cx - width / 2, y: yTop, width, height: Math.max(0, yBottom - yTop) },
                style: {
                  fill: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                    { offset: 0, color: STATUS_META[upper.run.status].color },
                    { offset: 1, color: STATUS_META[lower.run.status].color },
                  ]),
                  opacity: 0.32,
                },
                enterFrom: { style: { opacity: 0 } },
              };
            },
          },
          {
            // 1：色块，连同 3px 光晕；从自己的左边沿向右长出
            type: "custom",
            z: 2,
            animationDuration: 600,
            animationEasing: "cubicOut",
            animationDelay: (index: number) => index * step,
            data: segments.map((seg) => [seg.lane, seg.start, seg.end]),
            renderItem: (params: { dataIndex: number }, api: any) => {
              const seg = segments[params.dataIndex];
              const laneH = api.size([0, 1])[1];
              const h = blockHeight(laneH);
              const x = api.coord([seg.start, seg.lane + 0.5])[0];
              const y = api.coord([seg.start, seg.lane + 0.5])[1] - h / 2;
              const w = Math.max(6, api.coord([seg.end, 0])[0] - x);
              const r = Math.min(8, h / 2, w / 2);
              const color = STATUS_META[seg.run.status].color;
              return {
                type: "group",
                children: [
                  {
                    type: "rect",
                    shape: { x: x - 3, y: y - 3, width: w + 6, height: h + 6, r: r + 3 },
                    style: { fill: color, opacity: 0.22 },
                    enterFrom: { shape: { width: 0 }, style: { opacity: 0 } },
                  },
                  {
                    type: "rect",
                    shape: { x, y, width: w, height: h, r },
                    style: { fill: color },
                    enterFrom: { shape: { width: 0 }, style: { opacity: 0 } },
                  },
                ],
              };
            },
          },
          {
            // 2：泳道名，11px 三级色，贴在泳道左上角，不占坐标轴宽度
            type: "custom",
            silent: true,
            z: 3,
            animation: false,
            data: lanes.map((_, index) => [index]),
            renderItem: (params: { dataIndex: number }, api: any) => {
              const [x, y] = api.coord([winStart, params.dataIndex]);
              return { type: "text", x: x + 6, y: y + 4, style: { text: lanes[params.dataIndex], fill: ink, fontSize: 11, textVerticalAlign: "top" } };
            },
          },
        ],
      },
      true,
    );

    // observe() 会立刻回调一次，此时 resize 会把入场动画打断，所以只在宽度真的变了才 resize
    let lastWidth = el.clientWidth;
    const observer = new ResizeObserver(() => {
      if (el.clientWidth === lastWidth) return;
      lastWidth = el.clientWidth;
      chart.resize();
    });
    observer.observe(el);
    return () => {
      observer.disconnect();
      chart.dispose();
    };
  }, [dark, data, hours]);

  const count = data.segments.length;
  return (
    <>
      <span className="sr-only">{`近 ${hours === 24 ? "24 小时" : "7 天"}：${data.lanes.length} 个应用，${count} 次派单`}</span>
      <div ref={hostRef} className="stats-timeline__chart" style={{ height }} aria-hidden="true" />
      {data.hidden > 0 ? <p className="stats-timeline__more">另有 {data.hidden} 个应用没有画出（只画派单最多的 {LANE_LIMIT} 个）。</p> : null}
    </>
  );
}
