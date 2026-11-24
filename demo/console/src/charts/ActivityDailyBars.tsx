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
export function ActivityDailyBars({ series, peak }: { series: Day[]; peak: number }) {
  const { dark } = useThemeMode();
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = hostRef.current;
    if (!el || series.length === 0) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const chart = echarts.getInstanceByDom(el) ?? echarts.init(el);
    const ink = dark ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.45)";
    const total = series.length;
    chart.setOption(
      {
        animation: !reduce,
        animationDuration: 700,
        animationEasing: "cubicOut",
        animationDurationUpdate: 400,
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
    const observer = new ResizeObserver(() => chart.resize());
    observer.observe(el);
    return () => {
      observer.disconnect();
      chart.dispose();
    };
  }, [dark, peak, series]);

  if (series.length === 0) return null;
  return <div ref={hostRef} className="activity-echarts-bars" />;
}
