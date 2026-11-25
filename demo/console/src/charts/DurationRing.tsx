import * as echarts from "echarts";
import { Button, Tooltip } from "antd";
import { useEffect, useRef, useState } from "react";
import { useThemeMode } from "../theme/ThemeRoot";

const COLORS = ["#6d5efc", "#3b82f6", "#22c55e", "#ff8a3d", "#ec4899", "#8b919a"];

type Slice = { name: string; value: number };

/** 不足 1 分钟「N 秒」，不足 1 小时「N.N 分钟」，否则「N.N 小时」。中心和提示同一写法。 */
function fmtDuration(ms: number) {
  const sec = Math.round(ms / 1000);
  if (sec < 60) return `${sec} 秒`;
  const min = ms / 60000;
  if (min < 60) return `${min.toFixed(1)} 分钟`;
  return `${(min / 60).toFixed(1)} 小时`;
}

const SLICES: Slice[] = [
  { name: "发票同步", value: 46 * 60000 },
  { name: "库存推送", value: 28 * 60000 },
  { name: "邮件拉取", value: 16 * 60000 },
  { name: "空跑样本", value: 10 * 60000 },
];

function LegendName({ name }: { name: string }) {
  const [cut, setCut] = useState(false);
  return (
    <Tooltip title={cut ? name : null}>
      <span onMouseEnter={(event) => setCut(event.currentTarget.scrollWidth > event.currentTarget.clientWidth)}>{name}</span>
    </Tooltip>
  );
}

export function DurationRing({ enter }: { enter: boolean }) {
  const { dark } = useThemeMode();
  const hostRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<echarts.ECharts | null>(null);
  const total = SLICES.reduce((sum, item) => sum + item.value, 0);
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const enterOnce = useRef(enter && !reduce);
  // 评审用：重播入场。产品里只播一次
  const [replay, setReplay] = useState(0);
  function playAgain() {
    enterOnce.current = !reduce;
    setReplay((n) => n + 1);
  }

  useEffect(() => {
    const el = hostRef.current;
    if (!el) return;
    const play = enterOnce.current;
    const mark = window.setTimeout(() => {
      enterOnce.current = false;
    }, 0);
    const chart = echarts.getInstanceByDom(el) ?? echarts.init(el);
    chartRef.current = chart;
    const ink = dark ? "#e6e8eb" : "#111827";
    const [num, unit] = fmtDuration(total).split(" ");
    chart.setOption({
      color: COLORS,
      tooltip: {
        trigger: "item",
        appendTo: "body",
        borderWidth: 0,
        backgroundColor: dark ? "#1f1f1f" : "#fff",
        textStyle: { color: ink, fontSize: 12 },
        formatter: (raw: unknown) => {
          const item = (Array.isArray(raw) ? raw[0] : raw) as { name?: string; value?: unknown; percent?: number } | undefined;
          const value = typeof item?.value === "number" ? item.value : 0;
          const percent = typeof item?.percent === "number" ? Math.round(item.percent) : 0;
          return `${item?.name ?? ""}<br/>${fmtDuration(value)} · ${percent}%`;
        },
      },
      title: {
        text: `{n|${num ?? ""} ${unit ?? ""}}\n{s|总用时}`,
        left: "center",
        top: "center",
        textStyle: {
          rich: {
            n: { fontSize: 14, fontWeight: 600, color: ink, lineHeight: 18, align: "center" },
            s: { fontSize: 12, fontWeight: 600, color: ink, lineHeight: 16, align: "center" },
          },
        },
      },
      stateAnimation: reduce ? { duration: 0 } : { duration: 300, easing: "cubicOut" },
      series: [
        {
          type: "pie",
          radius: ["66%", "86%"],
          center: ["50%", "50%"],
          startAngle: 90,
          clockwise: false,
          padAngle: 5,
          minAngle: 3,
          cursor: "pointer",
          itemStyle: { borderRadius: 6 },
          label: { show: false },
          labelLine: { show: false },
          emphasis: {
            scale: true,
            scaleSize: 8,
            itemStyle: { shadowBlur: 12, shadowOffsetY: 2, shadowColor: "rgba(0, 0, 0, 0.16)" },
          },
          animation: !reduce,
          animationType: "expansion",
          animationDuration: play ? 1000 : 0,
          animationEasing: "cubicInOut",
          animationTypeUpdate: "transition",
          animationDurationUpdate: 600,
          animationEasingUpdate: "cubicInOut",
          data: SLICES.map((slice) => ({ name: slice.name, value: slice.value })),
        },
      ],
    });
    // observe() 会立刻回调一次，此时 resize 会打断入场；只在宽度真的变了才 resize
    let lastWidth = el.clientWidth;
    const observer = new ResizeObserver(() => {
      if (el.clientWidth === lastWidth) return;
      lastWidth = el.clientWidth;
      chart.resize();
    });
    observer.observe(el);
    return () => {
      window.clearTimeout(mark);
      observer.disconnect();
      chart.dispose();
      chartRef.current = null;
    };
  }, [dark, total, replay]);

  return (
    <div className="stats-share">
      <div ref={hostRef} className="stats-ring" />
      <ul>
        {SLICES.map((item, index) => (
          <li
            key={item.name}
            onMouseEnter={() => {
              chartRef.current?.dispatchAction({ type: "highlight", seriesIndex: 0, dataIndex: index });
              chartRef.current?.dispatchAction({ type: "showTip", seriesIndex: 0, dataIndex: index });
            }}
            onMouseLeave={() => {
              chartRef.current?.dispatchAction({ type: "hideTip" });
              chartRef.current?.dispatchAction({ type: "downplay", seriesIndex: 0, dataIndex: index });
            }}
          >
            <s style={{ background: COLORS[index] }} />
            <LegendName name={item.name} />
            <b>{Math.round((item.value / total) * 100)}%</b>
          </li>
        ))}
      </ul>
      <Button className="stats-ring-replay" size="small" type="link" onClick={playAgain}>
        重播
      </Button>
    </div>
  );
}
