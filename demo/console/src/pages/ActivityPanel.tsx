import { CheckOutlined } from "@ant-design/icons";
import { Empty, Tabs, Typography } from "antd";
import type { CSSProperties } from "react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ActivityDailyBars } from "../charts/ActivityDailyBars";

const WEEKDAYS = ["一", "二", "三", "四", "五", "六", "日"];

const SPLASH_BITS = [
  { x: "-22px", y: "-30px", r: "-28deg", c: "#c4b5fd" },
  { x: "2px", y: "-38px", r: "12deg", c: "#f9a8d4" },
  { x: "24px", y: "-26px", r: "36deg", c: "#fde68a" },
  { x: "-28px", y: "-8px", r: "-8deg", c: "#fff" },
  { x: "26px", y: "-6px", r: "20deg", c: "#a78bfa" },
  { x: "-10px", y: "-40px", r: "-16deg", c: "#fbcfe8" },
  { x: "14px", y: "-34px", r: "8deg", c: "#ddd6fe" },
] as const;

type Day = { date: string; count: number };
type CalCell = Day & { outside?: boolean };
type Recent = {
  at: string;
  title: string;
  path: string;
  method: string;
  kind: "auth" | "change";
  action: string;
  actor: string;
};

type Summary = {
  days: number;
  total: number;
  activeDays: number;
  logins: number;
  changes: number;
  peak: number;
  series: Day[];
  recent: Recent[];
};

function pad(value: number) {
  return `${value}`.padStart(2, "0");
}

function isoOf(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function parseIso(iso: string) {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function addDays(date: Date, count: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + count);
  return next;
}

function shanghaiToday() {
  const iso = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  return parseIso(iso);
}

function labelOf(iso: string) {
  const date = parseIso(iso);
  return `${date.getMonth() + 1}月${date.getDate()}日`;
}

function DayBurst({ day }: { day: string }) {
  return (
    <>
      <span className="activity-day-num">{day}</span>
      <span className="activity-day-pop" aria-hidden>
        {SPLASH_BITS.map((bit, index) => (
          <span
            key={index}
            className="activity-day-bit"
            style={{ "--x": bit.x, "--y": bit.y, "--r": bit.r, "--c": bit.c, "--d": `${index * 16}ms` } as CSSProperties}
          />
        ))}
      </span>
    </>
  );
}

const CAL_CELLS = 35;

function weeksOf(series: Day[]): CalCell[][] {
  const byDate = new Map(series.map((day) => [day.date, day.count]));
  const last = series.length > 0 ? parseIso(series[series.length - 1].date) : shanghaiToday();
  const mondayIndex = (last.getDay() + 6) % 7;
  const weekEnd = addDays(last, 6 - mondayIndex);
  const start = addDays(weekEnd, -(CAL_CELLS - 1));
  const windowStart = series[0]?.date;
  const windowEnd = series[series.length - 1]?.date;
  const cells: CalCell[] = [];
  for (let i = 0; i < CAL_CELLS; i += 1) {
    const date = isoOf(addDays(start, i));
    const inWindow = windowStart != null && windowEnd != null && date >= windowStart && date <= windowEnd;
    cells.push({ date, count: inWindow ? (byDate.get(date) ?? 0) : 0, outside: !inWindow });
  }
  const rows: CalCell[][] = [];
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));
  return rows;
}

function buildSummary(days: number): Summary {
  const end = shanghaiToday();
  const series: Day[] = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const date = addDays(end, -i);
    const n = date.getDate();
    const count = n % 5 === 0 ? 0 : (n % 7) + 1;
    series.push({ date: isoOf(date), count });
  }
  const total = series.reduce((sum, day) => sum + day.count, 0);
  const activeDays = series.filter((day) => day.count > 0).length;
  const logins = series.filter((day) => day.count > 0 && parseIso(day.date).getDate() % 3 === 0).length;
  const changes = series.reduce((sum, day) => {
    if (parseIso(day.date).getDate() % 3 === 0) return sum;
    return sum + day.count;
  }, 0);
  const peak = series.reduce((max, day) => Math.max(max, day.count), 0);
  const recent: Recent[] = [0, 0, 1, 2].map((ago, index) => {
    const date = addDays(end, -ago);
    const stamps = ["09:12", "10:04", "16:40", "11:05"];
    const rows = [
      { title: "登录", path: "/login", method: "POST", kind: "auth" as const, action: "login" },
      { title: "保存执行记录", path: "/jobs", method: "PUT", kind: "change" as const, action: "update" },
      { title: "登录", path: "/login", method: "POST", kind: "auth" as const, action: "login" },
      { title: "查看数据统计", path: "/stats", method: "GET", kind: "change" as const, action: "read" },
    ];
    return { at: `${isoOf(date)}T${stamps[index]}:00`, actor: "demo", ...rows[index] };
  });
  return { days, total, activeDays, logins, changes, peak, series, recent };
}

const activityCache = new Map<number, Summary>();

function useActivity(days: number, ready: boolean) {
  const cached = activityCache.get(days) ?? null;
  const [data, setData] = useState<Summary | null>(cached);
  const [seenKey, setSeenKey] = useState(days);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(ready && cached == null);

  if (seenKey !== days) {
    const next = activityCache.get(days) ?? buildSummary(days);
    activityCache.set(days, next);
    setSeenKey(days);
    setData(next);
    setError(null);
    setLoading(false);
  }

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    const hit = activityCache.get(days) ?? null;
    if (!hit) setLoading(true);
    const timer = window.setTimeout(() => {
      if (cancelled) return;
      const next = buildSummary(days);
      activityCache.set(days, next);
      setData(next);
      setError(null);
      setLoading(false);
    }, hit ? 0 : 120);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [days, ready]);

  return { data, error, loading };
}

const COUNT_MS = 420;
const COUNT_LAG_MS = 500;

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function useCountUp(target: number, enabled: boolean) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!enabled) {
      setValue(0);
      return;
    }
    setValue(0);
    const startAt = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - startAt) / COUNT_MS);
      setValue(Math.round((1 - (1 - t) ** 4) * target));
      if (t < 1) frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [enabled, target]);
  return value;
}

function ActivityTotal({ total, windowKey }: { total: number; windowKey: number }) {
  const reduce = prefersReducedMotion();
  const [armedKey, setArmedKey] = useState(windowKey);
  const [enabled, setEnabled] = useState(reduce);
  if (armedKey !== windowKey) {
    setArmedKey(windowKey);
    setEnabled(reduce);
  }
  useEffect(() => {
    if (reduce) {
      setEnabled(true);
      return;
    }
    setEnabled(false);
    const id = window.setTimeout(() => setEnabled(true), COUNT_LAG_MS);
    return () => window.clearTimeout(id);
  }, [reduce, total, windowKey]);
  const counted = useCountUp(total, enabled && !reduce);
  const shown = reduce ? total : enabled ? counted : 0;
  return <div className="activity-num">{shown}</div>;
}

function ActivityRows({ rows, showActor }: { rows: Recent[]; showActor?: boolean }) {
  if (rows.length === 0) {
    return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="这段时间还没有操作" />;
  }
  return (
    <ul className="activity-log">
      {rows.map((item) => {
        const at = parseIso(item.at.slice(0, 10));
        const clock = item.at.slice(11, 16);
        const title = item.kind === "auth" && item.action === "login" ? "登录" : item.title;
        return (
          <li className="activity-log__item" key={`${item.at}-${item.action}`}>
            <span className="activity-log__date">
              <b>{pad(at.getDate())}</b>
              <small>{at.getMonth() + 1}月</small>
            </span>
            <div className="activity-log__body">
              <div className="activity-log__title">{title}</div>
              <div className="activity-log__sub">
                {showActor ? `${item.actor} · ` : ""}
                {item.path}
              </div>
            </div>
            <span className="activity-log__side">
              <span className="activity-log__tag">{item.method}</span>
              <span className="activity-log__sub">{clock}</span>
              <span className="activity-log__tag">{item.kind === "auth" ? "认证" : "变更"}</span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function MyActivity({ days, ready }: { days: number; ready: boolean }) {
  const { data, error, loading } = useActivity(days, ready);

  if (!ready || (loading && !data)) {
    return (
      <div className="skel-body" aria-hidden="true">
        {Array.from({ length: 5 }, (_, index) => (
          <i key={index} className="skel-line" style={{ width: ["100%", "72%", "88%", "56%", "64%"][index] }} />
        ))}
      </div>
    );
  }
  if (error) return <Typography.Text type="danger">{error}</Typography.Text>;
  if (!data) return null;

  const series = data.series;
  const signature = series.map((day) => `${day.date}:${day.count}`).join("|");
  const anchor = series.length > 0 ? parseIso(series[series.length - 1].date) : null;
  let checkIndex = 0;

  return (
    <>
      <div className="activity-board">
        <div className="activity-board-top">
          <div>
            <ActivityTotal total={data.total} windowKey={days} />
            <div className="activity-num-label">次个人活动</div>
            <div className="activity-pills">
              <span className="activity-pill activity-pill--active">
                活跃 <strong>{data.activeDays}</strong> 天
              </span>
              <span className="activity-pill activity-pill--login">
                登录 <strong>{data.logins}</strong>
              </span>
              <span className="activity-pill activity-pill--change">
                变更 <strong>{data.changes}</strong>
              </span>
            </div>
          </div>
          <div className="activity-cal" aria-label="个人活动日历">
            <div className="activity-cal-head">
              {WEEKDAYS.map((label) => (
                <span key={label}>{label}</span>
              ))}
            </div>
            <div className="activity-cal-grid" key={signature}>
              {weeksOf(series).map((week, row) => (
                <div className="activity-cal-row" key={row}>
                  {week.map((cell) => {
                    const when = parseIso(cell.date);
                    const label = labelOf(cell.date);
                    if (cell.outside) {
                      return (
                        <span key={cell.date} className="activity-day is-outside" aria-label={`${label}，暂无记录`}>
                          {when.getDate()}
                        </span>
                      );
                    }
                    const on = cell.count > 0;
                    const index = on ? checkIndex++ : undefined;
                    const otherMonth = anchor != null && (when.getFullYear() !== anchor.getFullYear() || when.getMonth() !== anchor.getMonth());
                    const className = otherMonth
                      ? on
                        ? "activity-day is-on is-other-month"
                        : "activity-day is-other-month"
                      : on
                        ? "activity-day is-on"
                        : "activity-day";
                    return (
                      <span
                        key={cell.date}
                        className={className}
                        tabIndex={0}
                        style={index !== undefined ? ({ "--i": index } as CSSProperties) : undefined}
                        aria-label={on ? `${label}，${cell.count} 次` : label}
                      >
                        {on ? <CheckOutlined /> : null}
                        <DayBurst day={`${when.getDate()}`} />
                      </span>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="activity-chart">
        <Typography.Text strong>每日操作量</Typography.Text>
        <div className="activity-chart-sub">
          近 {data.days} 天有 {data.activeDays} 天活跃，单日最高 {data.peak} 次
        </div>
        <ActivityDailyBars series={series} peak={data.peak} />
      </div>
      <div className="activity-recent-head">
        <Typography.Text strong>最近动态</Typography.Text>
        <Typography.Text type="secondary">最新 4 条</Typography.Text>
      </div>
      <ActivityRows rows={data.recent.slice(0, 4)} />
    </>
  );
}

const QUICK_LINKS = [
  { title: "执行记录", description: "一次派出的过程和日志", path: "/jobs" },
  { title: "数据统计", description: "跑批概况和活动", path: "/stats" },
];

export function ActivityPanel({ days, ready, animate }: { days: number; ready: boolean; animate: boolean }) {
  void animate;
  return (
    <Tabs
      className="activity-tabs"
      size="small"
      items={[
        {
          key: "activity",
          label: "活动",
          children: (
            <Tabs
              className="activity-subtabs"
              size="small"
              items={[
                { key: "mine", label: "我的活动", children: <MyActivity days={days} ready={ready} /> },
                {
                  key: "audit",
                  label: "操作审计",
                  children: <ActivityRows rows={buildSummary(days).recent.slice(0, 4)} showActor />,
                },
              ]}
            />
          ),
        },
        {
          key: "quick",
          label: "快捷入口",
          children: (
            <ul className="activity-log">
              {QUICK_LINKS.map((link) => (
                <li className="activity-log__item" key={link.path}>
                  <Link className="activity-log__body" to={link.path}>
                    <div className="activity-log__title">{link.title}</div>
                    <div className="activity-log__sub">{link.description}</div>
                  </Link>
                </li>
              ))}
            </ul>
          ),
        },
        {
          key: "todo",
          label: "待办",
          children: (
            <ul className="activity-log">
              <li className="activity-log__item">
                <Link className="activity-log__body" to="/jobs">
                  <div className="activity-log__title">发票同步</div>
                  <div className="activity-log__sub">执行机-01 正在跑</div>
                </Link>
              </li>
            </ul>
          ),
        },
      ]}
    />
  );
}
