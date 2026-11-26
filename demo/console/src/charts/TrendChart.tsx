import * as echarts from "echarts";
import { useEffect, useMemo, useRef } from "react";
import { useThemeMode } from "../theme/ThemeRoot";
import { successStripe } from "./stripe";

type Day = { day: string; succeeded: number; failed: number; other: number };

function recentDays(count: number, end?: string): Day[] {
  const rows: Day[] = [];
  const last = end ? new Date(`${end}T00:00:00`) : new Date();
  const start = new Date(last);
  start.setDate(start.getDate() - (count - 1));
  for (let i = 0; i < count; i += 1) {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    const month = `${date.getMonth() + 1}`.padStart(2, "0");
    const day = `${date.getDate()}`.padStart(2, "0");
    rows.push({
      day: `${date.getFullYear()}-${month}-${day}`,
      succeeded: 4 + ((i * 3) % 7),
      failed: i % 4 === 0 ? 2 : 1,
      other: i % 5 === 0 ? 1 : 0,
    });
  }
  return rows;
}

/**
 * 运行趋势。入场和每日操作量同一套：从左到右每天一根柱子依次弹出，单根 1000ms、elasticOut，第 i 天延迟 i × 20ms。
 * 延迟只按「第几天」算（echarts 给每个系列传的都是数据下标），所以同一天的三层同时长出。
 * 换窗口、数据变化再播一遍，参数相同。减少动效时整套不播。起点由调用方控制：数据到了、等完「图表进场延迟」才挂载。
 */
export function TrendChart({ days, end }: { days: number; end?: string }) {
  const { dark } = useThemeMode();
  const hostRef = useRef<HTMLDivElement>(null);
  const rows = useMemo(() => recentDays(days, end), [days, end]);

  useEffect(() => {
    const el = hostRef.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const chart = echarts.getInstanceByDom(el) ?? echarts.init(el);
    const ink = dark ? "rgba(255,255,255,0.65)" : "rgba(0,0,0,0.45)";
    const grid = dark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)";
    const cap = (row: Day, key: "other" | "failed" | "succeeded"): [number, number, number, number] => {
      const top = row.succeeded > 0 ? "succeeded" : row.failed > 0 ? "failed" : "other";
      return top === key && row[key] > 0 ? [5, 5, 0, 0] : [0, 0, 0, 0];
    };
    const width = rows.length > 14 ? 14 : 22;
    chart.setOption({
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
      },
      legend: {
        top: 0,
        right: 0,
        icon: "circle",
        itemWidth: 8,
        itemHeight: 8,
        textStyle: { color: ink, fontSize: 12 },
        data: ["失败", "成功", "未出结论"],
      },
      grid: { left: 4, right: 8, top: 44, bottom: 4, containLabel: true },
      xAxis: {
        type: "category",
        data: rows.map((row) => row.day),
        axisTick: { show: false },
        axisLine: { show: false },
        axisLabel: {
          color: ink,
          fontSize: 11,
          hideOverlap: true,
          formatter: (value: string) => (value.length >= 10 ? value.slice(5) : value),
        },
      },
      yAxis: {
        type: "value",
        splitLine: { lineStyle: { type: "dashed", color: grid } },
        axisLabel: { color: ink, fontSize: 11 },
      },
      series: [
        {
          name: "未出结论",
          type: "bar",
          stack: "runs",
          barMaxWidth: width,
          itemStyle: { color: "rgba(139, 145, 154, 0.38)" },
          emphasis: { focus: "series" },
          data: rows.map((row) => ({ value: row.other, itemStyle: { borderRadius: cap(row, "other") } })),
        },
        {
          name: "失败",
          type: "bar",
          stack: "runs",
          barMaxWidth: width,
          itemStyle: { color: "#ec4899" },
          emphasis: { focus: "series" },
          data: rows.map((row) => ({ value: row.failed, itemStyle: { borderRadius: cap(row, "failed") } })),
        },
        {
          name: "成功",
          type: "bar",
          stack: "runs",
          barMaxWidth: width,
          itemStyle: { color: { image: successStripe(), repeat: "repeat" } },
          emphasis: { focus: "series" },
          data: rows.map((row) => ({ value: row.succeeded, itemStyle: { borderRadius: cap(row, "succeeded") } })),
        },
      ],
    });
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
  }, [dark, rows]);

  const ok = rows.reduce((sum, row) => sum + row.succeeded, 0);
  const fail = rows.reduce((sum, row) => sum + row.failed, 0);
  const other = rows.reduce((sum, row) => sum + row.other, 0);
  return (
    <>
      <span className="sr-only">{`近 ${days} 天：成功 ${ok}、失败 ${fail}、未出结论 ${other}`}</span>
      <div ref={hostRef} className="stats-trend" aria-hidden="true" />
    </>
  );
}
