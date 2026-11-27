import { CheckOutlined, DesktopOutlined, HistoryOutlined, ThunderboltOutlined, UnorderedListOutlined } from "@ant-design/icons";
import { Button, Empty, Switch, Tabs, Typography } from "antd";
import type { CSSProperties } from "react";
import { useEffect, useState } from "react";
import { TweenNumber } from "../components/TweenNumber";
import { prefersReducedMotion, queueItemStyle } from "../lib/motion";
import { Link } from "react-router-dom";
import { ActivityDailyBars } from "../charts/ActivityDailyBars";
import { AUDIT_LOG_PATH, ADVANCED_PATH, QUEUE_PATH, RECORDS_PATH, WORKERS_PATH } from "../lib/statsLinks";

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

const COUNT_LAG_MS = 500;

/** 大数字上一次的目标值：组件重挂（切页签、切窗口时骨架闪一下）也从它起跳，不回 0。null = 还没出现过 */
let lastActivityShown: number | null = null;

/** 首次进场：先停在 0，等面板露头后再从 0 补间到目标；之后任何变化都从当前值补间到新目标（rc-tween-one Children）。 */
function ActivityTotal({ total, windowKey }: { total: number; windowKey: number }) {
  void windowKey;
  const [from] = useState(() => lastActivityShown ?? 0);
  const [first] = useState(() => lastActivityShown == null);
  const [ready, setReady] = useState(!first || prefersReducedMotion());

  useEffect(() => {
    if (!first || prefersReducedMotion()) return;
    const id = window.setTimeout(() => setReady(true), COUNT_LAG_MS);
    return () => window.clearTimeout(id);
  }, [first]);

  useEffect(() => {
    if (ready) lastActivityShown = total;
  }, [ready, total]);

  return <TweenNumber className="activity-num" as="div" value={ready ? total : from} from={from} />;
}

function ActivityRows({ rows, showActor }: { rows: Recent[]; showActor?: boolean }) {
  if (rows.length === 0) {
    return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="这段时间还没有操作" />;
  }
  return (
    <ul className="activity-log is-zebra">
      {rows.map((item, rowIndex) => {
        const at = parseIso(item.at.slice(0, 10));
        const clock = item.at.slice(11, 16);
        const title = item.kind === "auth" && item.action === "login" ? "登录" : item.title;
        return (
          <li className="activity-log__item dash-queue-item" style={queueItemStyle(rowIndex, rows.length)} key={`${item.at}-${item.action}`}>
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

function MyActivity({ days, capped, ready }: { days: number; capped?: boolean; ready: boolean }) {
  const { data, error, loading } = useActivity(days, ready);
  const [replayKey, setReplayKey] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);

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
  const todayIso = isoOf(shanghaiToday());
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
                    const today = cell.date === todayIso;
                    const base = otherMonth
                      ? on
                        ? "activity-day is-on is-other-month"
                        : "activity-day is-other-month"
                      : on
                        ? "activity-day is-on"
                        : "activity-day";
                    const className = today ? `${base} is-today` : base;
                    return (
                      <span
                        key={cell.date}
                        className={className}
                        tabIndex={0}
                        style={index !== undefined ? ({ "--i": index } as CSSProperties) : undefined}
                        aria-label={`${today ? "今天，" : ""}${on ? `${label}，${cell.count} 次` : label}`}
                      >
                        {on && !today ? <CheckOutlined /> : null}
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
          {capped ? <div>我的活动固定看今天往前最近 {data.days} 天（最多 30 天），不跟着所选日期。</div> : null}
        </div>
        <ActivityDailyBars series={series} peak={data.peak} replayKey={replayKey} reduceMotion={reduceMotion} />
        <div className="activity-chart-demo">
          <Button size="small" type="link" onClick={() => setReplayKey((key) => key + 1)}>
            重播
          </Button>
          <label>
            减少动效
            <Switch size="small" checked={reduceMotion} onChange={setReduceMotion} aria-label="模拟减少动效" />
          </label>
        </div>
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
  { title: "工作队列", description: "排队、失败、正在跑的行", path: QUEUE_PATH, icon: <UnorderedListOutlined /> },
  { title: "执行记录", description: "一次派出的过程和日志", path: RECORDS_PATH, icon: <HistoryOutlined /> },
  { title: "高级任务", description: "应用、运行包和开始跑批", path: ADVANCED_PATH, icon: <ThunderboltOutlined /> },
  { title: "执行机", description: "在线机器人和心跳", path: WORKERS_PATH, icon: <DesktopOutlined /> },
];

type ListState = "ok" | "empty" | "error";

/** 全站操作审计的示例行：操作者 · 路径 */
function auditRows(): Recent[] {
  const end = shanghaiToday();
  const rows: { ago: number; at: string; actor: string; title: string; path: string; method: string; kind: "auth" | "change"; action: string }[] = [
    { ago: 0, at: "10:21", actor: "demo", title: "保存执行记录", path: "/jobs", method: "PUT", kind: "change", action: "update" },
    { ago: 0, at: "09:12", actor: "zhang.san", title: "登录", path: "/login", method: "POST", kind: "auth", action: "login" },
    { ago: 0, at: "08:47", actor: "li.si", title: "修改角色权限", path: "/settings/roles", method: "PUT", kind: "change", action: "update" },
    { ago: 1, at: "17:30", actor: "demo", title: "新建菜单", path: "/system/menus", method: "POST", kind: "change", action: "create" },
    { ago: 1, at: "16:02", actor: "wang.wu", title: "登录", path: "/login", method: "POST", kind: "auth", action: "login" },
    { ago: 2, at: "11:05", actor: "demo", title: "停用用户", path: "/settings/users", method: "PUT", kind: "change", action: "disable" },
  ];
  return rows.map((row) => ({ ...row, at: `${isoOf(addDays(end, -row.ago))}T${row.at}:00` }));
}

function AuditPanel({ state, ready }: { state: ListState; ready: boolean }) {
  const rows = state === "ok" ? auditRows().slice(0, 8) : [];
  if (!ready) {
    return (
      <div className="skel-body" aria-hidden="true">
        {Array.from({ length: 4 }, (_, index) => (
          <i key={index} className="skel-line" style={{ width: ["100%", "72%", "88%", "56%"][index] }} />
        ))}
      </div>
    );
  }
  return (
    <>
      <div className="activity-recent-head" style={{ margin: "0 0 2px" }}>
        <Typography.Text strong>全站操作审计</Typography.Text>
        <Link to={AUDIT_LOG_PATH}>全部</Link>
      </div>
      {state === "error" ? (
        <Typography.Text type="danger">操作审计读取失败：日志服务没有响应。</Typography.Text>
      ) : (
        <>
          {rows.length > 0 ? <div className="activity-chart-sub" style={{ margin: "0 0 10px" }}>最近 {rows.length} 条后台行为</div> : null}
          <ActivityRows rows={rows} showActor />
        </>
      )}
    </>
  );
}

export function ActivityPanel({
  days,
  capped,
  ready,
  animate,
  auditState = "ok",
  todoState = "ok",
}: {
  days: number;
  capped?: boolean;
  ready: boolean;
  animate: boolean;
  auditState?: ListState;
  todoState?: ListState;
}) {
  void animate;
  void todoState;
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
                { key: "mine", label: "我的活动", children: <MyActivity days={days} capped={capped} ready={ready} /> },
                { key: "audit", label: "操作审计", children: <AuditPanel state={auditState} ready={ready} /> },
              ]}
            />
          ),
        },
        {
          key: "quick",
          label: "快捷入口",
          children: (
            <ul className="activity-log is-zebra">
              {QUICK_LINKS.map((link, index) => (
                <li className="activity-log__item dash-queue-item" style={queueItemStyle(index, QUICK_LINKS.length)} key={link.path}>
                  <Link className="activity-log__link" to={link.path}>
                    <span className="activity-log__date activity-log__icon">{link.icon}</span>
                    <span className="activity-log__body">
                      <div className="activity-log__title">{link.title}</div>
                      <div className="activity-log__sub">{link.description}</div>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ),
        },
        {
          key: "todo",
          label: "待办",
          // 系统还没有待办流程与数据来源：永远是空态，不拿失败执行、离线执行机冒充
          children: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无待办" />,
        },
      ]}
    />
  );
}
