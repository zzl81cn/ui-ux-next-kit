import * as echarts from "echarts";
import { useEffect, useRef } from "react";
import { useThemeMode } from "../theme/ThemeRoot";

type Day = { date: string; count: number };

const BAR = "#3b82f6";
const PEAK = "#6d5efc";
const EMPTY = "rgba(59, 130, 246, 0.35)";

function showTick(index: number, total: number): boolean {
  if (total <= 1) return true;
  const mid = Math.floor((total - 1) / 2);
  return index === 0 || index === mid || index === total - 1;
}

function monthDay(iso: string, withUnit: boolean) {
  const [, month, day] = iso.split("-");
  const m = Number(month);
  const d = Number(day);
  return withUnit ? `${m}月${d}日` : `${m}/${d}`;
}

/** 每日操作量。0 次是淡蓝短柱，最高那天是紫，其余是蓝。 */
export function ActivityDailyBars({
  series,
  peak,
  replayKey = 0,
  reduceMotion = false,
}: {
  series: Day[];
  peak: number;
  /** 变一下就整图重画、重播入场（评审用的「重播」） */
  replayKey?: number;
  /** 演示里模拟「减少动效」；系统设置了也算 */
  reduceMotion?: boolean;
}) {
  const { dark } = useThemeMode();
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = hostRef.current;
    if (!el || series.length === 0) return;
    const reduce = reduceMotion || window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const chart = echarts.getInstanceByDom(el) ?? echarts.init(el);
    const ink = dark ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.45)";
    const total = series.length;
    chart.setOption(
      {
        animation: !reduce,
        animationDuration: 1000,
        animationEasing: "elasticOut",
        animationDelay: (index: number) => index * 20,
        animationDurationUpdate: 1000,
        animationEasingUpdate: "elasticOut",
        animationDelayUpdate: (index: number) => index * 20,
        tooltip: {
          trigger: "axis",
          appendTo: "body",
          axisPointer: { type: "shadow" },
          borderWidth: 0,
          backgroundColor: dark ? "#1f1f1f" : "#fff",
          textStyle: { color: dark ? "#e6e8eb" : "#111827", fontSize: 12 },
          formatter: (params: unknown) => {
            const row = Array.isArray(params) ? params[0] : params;
            if (!row || typeof row !== "object") return "";
            const item = row as { dataIndex?: number };
            const day = series[item.dataIndex ?? 0];
            if (!day) return "";
            return `${monthDay(day.date, true)}\u3000${day.count} 次`;
          },
        },
        grid: { left: 18, right: 18, top: 6, bottom: 18, containLabel: false },
        xAxis: {
          type: "category",
          data: series.map((day, index) => (showTick(index, total) ? monthDay(day.date, false) : "")),
          axisTick: { show: false },
          axisLine: { show: false },
          axisLabel: { color: ink, fontSize: 10, interval: 0 },
        },
        yAxis: { type: "value", min: 0, max: Math.max(peak, 1), show: false },
        series: [
          {
            type: "bar",
            barMaxWidth: 8,
            barMinHeight: 3,
            data: series.map((day) => ({
              value: day.count,
              itemStyle: {
                color: day.count <= 0 ? EMPTY : day.count === peak ? PEAK : BAR,
                borderRadius: 999,
              },
            })),
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
  }, [dark, peak, series, replayKey, reduceMotion]);

  if (series.length === 0) return null;
  const activeDays = series.filter((day) => day.count > 0).length;
  return (
    <>
      <span className="sr-only">{`近 ${series.length} 天有 ${activeDays} 天活跃，单日最高 ${peak} 次`}</span>
      <div ref={hostRef} className="activity-echarts-bars" aria-hidden="true" />
    </>
  );
}
