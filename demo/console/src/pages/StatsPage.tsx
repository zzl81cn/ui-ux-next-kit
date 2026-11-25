import { InfoCircleOutlined, QuestionCircleOutlined } from "@ant-design/icons";
import { Alert, Button, Card, DatePicker, Drawer, Popconfirm, Radio, Select, Spin, Tooltip, Typography } from "antd";
import dayjs, { type Dayjs } from "dayjs";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { DurationRing } from "../charts/DurationRing";
import { TrendChart } from "../charts/TrendChart";
import { RobotMemberAvatars } from "../components/RobotMemberAvatars";
import { CurrentTaskBody, RecentCard, type ListState } from "../components/StatsBlocks";
import { loadMotion } from "../lib/consolePrefs";
import { QUEUE_PATH, queuePath, RECORDS_RUNNING_PATH, WORKERS_PATH } from "../lib/statsLinks";
import {
  FAIL_QUEUES,
  isTaskState,
  QUEUED_COUNT,
  QUEUED_PENDING_EFFECT,
  RUNNING_RECORDS,
  sampleBatches,
  sampleQueues,
  TASK_STATE_OPTIONS,
  type TaskState,
} from "../mock/stats";
import { RATE_ROWS } from "../mock/data";
import { sortRobotMembers, useRobots } from "../mock/robots";
import { ActivityPanel } from "./ActivityPanel";

const DAYS_KEY = "demo-stats-days";
const MAX_SPAN = 366;
/** 演示里「数据到了」的时间：这之前是骨架 */
const DATA_MS = 300;
const RATE_COLORS = ["#6d5efc", "#3b82f6", "#22c55e", "#ff8a3d", "#ec4899", "#2dd4bf"];

function SkelBody({ height, lines = 4 }: { height?: number; lines?: number }) {
  const widths = ["100%", "72%", "88%", "56%"];
  return (
    <div className="skel-body" style={{ minHeight: height }}>
      {Array.from({ length: lines }, (_, index) => (
        <i key={index} className="skel-line" style={{ width: widths[index % widths.length] }} />
      ))}
    </div>
  );
}

function greeting(date: Date) {
  const hour = date.getHours();
  if (hour < 12) return "上午好";
  if (hour < 18) return "下午好";
  return "晚上好";
}

function readDays(): number {
  const saved = localStorage.getItem(DAYS_KEY);
  const parsed = saved ? Number(saved) : 30;
  if (!Number.isFinite(parsed) || parsed < 1 || parsed > 30) return 30;
  return parsed;
}

type GrowOpts = { delay?: number; duration?: number; ease?: "cubic" | "quart"; replayKey?: unknown };

/** 数字从 0 跳到目标整数。run 为 false 时直接是目标值。 */
function useGrow(target: number, run: boolean, { delay = 0, duration = 600, ease = "cubic", replayKey }: GrowOpts = {}) {
  const [value, setValue] = useState(run ? 0 : target);
  useEffect(() => {
    if (!run) {
      setValue(target);
      return;
    }
    setValue(0);
    let frame = 0;
    let started = 0;
    const tick = (now: number) => {
      started ||= now;
      const t = Math.min(1, (now - started) / duration);
      const eased = ease === "quart" ? 1 - (1 - t) ** 4 : 1 - (1 - t) ** 3;
      setValue(Math.round(target * eased));
      if (t < 1) frame = window.requestAnimationFrame(tick);
    };
    const timer = window.setTimeout(() => {
      frame = window.requestAnimationFrame(tick);
    }, delay);
    return () => {
      window.clearTimeout(timer);
      window.cancelAnimationFrame(frame);
    };
  }, [run, target, delay, duration, ease, replayKey]);
  return value;
}


/** 失败归因：原因名只用这张键对照表，表里没有的键直接显示键名 */
const FAIL_LABELS: Record<string, string> = {
  selector_drift: "元素漂移",
  platform_defect: "平台缺陷",
  timing: "时序",
  auth: "登录/风控",
  rate_limit: "限流",
  business_data: "业务数据",
  upstream: "上游缺件",
  flow_logic: "流程逻辑",
  unknown: "归不出来",
  unattributed: "没归因",
};
const FAIL_PINK = "#ec4899";
const FAIL_LIGHT_PINK = "#f9a8d4";
const FAILS = [
  { key: "selector_drift", count: 9 },
  { key: "timing", count: 6 },
  { key: "auth", count: 5 },
  { key: "rate_limit", count: 4 },
  { key: "unknown", count: 3 },
  { key: "upstream", count: 3 },
  { key: "business_data", count: 2 },
  { key: "unattributed", count: 2 },
  { key: "flow_logic", count: 1 },
  { key: "platform_defect", count: 1 },
].filter((row) => row.count > 0);
/** 占比的分母是窗口内全部已归因失败，不是列出来这几行之和 */
const FAIL_TOTAL = FAILS.reduce((sum, row) => sum + row.count, 0);

const GB = 1024 ** 3;
const MB = 1024 ** 2;
const TABLES = [
  { name: "执行端安装包", bytes: 1.2 * GB },
  { name: "应用运行包", bytes: 640 * MB },
  { name: "Webhook 事件", bytes: 220 * MB },
  { name: "审计日志", bytes: 38 * MB },
];
const TABLE_TOTAL = TABLES.reduce((sum, row) => sum + row.bytes, 0);
const TABLE_MAX = Math.max(...TABLES.map((row) => row.bytes));

/** ≥1 GB「N.N GB」，≥1 MB「N.N MB」，≥1 KB「N KB」，否则「N B」 */
function fmtBytes(value: number) {
  if (value >= GB) return `${(value / GB).toFixed(1)} GB`;
  if (value >= MB) return `${(value / MB).toFixed(1)} MB`;
  if (value >= 1024) return `${Math.round(value / 1024)} KB`;
  return `${Math.round(value)} B`;
}

/** 条内百分比：700ms、1-(1-t)^4 前快后收，所有条同时起跳，不按序号错开。切窗口重新从 0 跳。 */
function RatePercent({ percent, grown, reduce, replayKey }: { percent: number; grown: boolean; reduce: boolean; replayKey: number }) {
  const value = useGrow(percent, grown && !reduce, { duration: 700, ease: "quart", replayKey });
  // 数据到了、还没开跑时是空轨道：数字先停在 0，不露终值。减少动效直接是终值
  return <b>{!reduce && !grown ? 0 : value}%</b>;
}

/** 7 天窗口的示例数，条目和 30 天相同，数字不同，用来看切窗口时条的过渡 */
const RATE_ROWS_7 = [
  { name: "对账回写", rate: 0, ok: 0, fail: 2 },
  { name: "发票同步", rate: 0.75, ok: 6, fail: 2 },
  { name: "库存推送", rate: 0.71, ok: 15, fail: 6 },
  { name: "邮件拉取", rate: 0.25, ok: 1, fail: 3 },
  { name: "空跑样本", rate: 0, ok: 0, fail: 0 },
];

export function StatsPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { robots } = useRobots();
  // 演示用：当前任务的七种状态（也可 #/stats?task=pending），以及各列表的没有 / 拿不到状态
  const [step, setStep] = useState(0);
  const [task, setTask] = useState<TaskState>(() => {
    const raw = params.get("task");
    return isTaskState(raw) ? raw : "running";
  });
  const listState = (key: string): ListState => (params.get(key) === "empty" ? "empty" : params.get(key) === "error" ? "error" : "ok");
  const batches = useMemo(() => sampleBatches(), []);
  const queues = useMemo(() => sampleQueues(), []);
  const offlineRobots = robots.filter((robot) => !robot.online);
  const onlineCount = robots.length - offlineRobots.length;
  const robotMembers = useMemo(() => [...robots].sort(sortRobotMembers), [robots]);
  const now = new Date();
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  // 「只播一次」= 每次进入页面（含刷新）播一次，切 7 / 30 天、换主题不重播。和线上控制台的首屏标记同一口径
  const seen = false;
  const played = useRef(false);
  // 窗口 = [start, end]，含两端。7 / 30 天按钮 = 终点是今天往前数。自定义区间不记到本地。
  const [range, setRange] = useState<[Dayjs, Dayjs]>(() => [dayjs().subtract(readDays() - 1, "day"), dayjs()]);
  const days = range[1].startOf("day").diff(range[0].startOf("day"), "day") + 1;
  const endIso = range[1].format("YYYY-MM-DD");
  const endsToday = range[1].isSame(dayjs(), "day");
  const [open, setOpen] = useState(false);
  const [ready, setReady] = useState(seen);
  const [grown, setGrown] = useState(seen || reduce);
  const [enter, setEnter] = useState(!seen && !reduce);
  const cradle = useRef(!seen && !reduce).current;
  const [refreshing, setRefreshing] = useState(false);
  const rates = useMemo(
    () =>
      [...(days <= 7 ? RATE_ROWS_7 : RATE_ROWS)]
        .sort((a, b) => {
          const rank = (row: { ok: number; fail: number; rate: number }) => (row.ok + row.fail > 0 ? row.rate : 1);
          const delta = rank(a) - rank(b);
          return delta !== 0 ? delta : b.fail - a.fail;
        })
        .map((row, index) => ({ ...row, color: RATE_COLORS[index % RATE_COLORS.length] })),
    [days],
  );
  const failCount = useGrow(3, grown && !seen && !reduce);
  const queueCount = useGrow(QUEUED_COUNT, grown && !seen && !reduce);
  const running = task === "running" || task === "wlerror" || task === "pending";
  const hasBatch = running || task === "unfinished" || task === "abnormal";
  const runRecords = RUNNING_RECORDS[task];

  const chartDelay = reduce ? 0 : loadMotion().chartDelayMs;

  // 数据到了（骨架换成内容，色条是空轨道）→ 再等「图表进场延迟」→ 开跑
  useEffect(() => {
    if (ready) return;
    const timer = window.setTimeout(() => setReady(true), reduce ? 0 : DATA_MS);
    return () => window.clearTimeout(timer);
  }, [ready, reduce]);

  useEffect(() => {
    if (!ready || grown) return;
    const timer = window.setTimeout(() => setGrown(true), chartDelay);
    return () => window.clearTimeout(timer);
  }, [ready, grown, chartDelay]);

  useEffect(() => {
    if (!grown || seen) return;
    const timer = window.setTimeout(() => {
      played.current = true;
    }, 700);
    return () => window.clearTimeout(timer);
  }, [grown, seen]);

  useEffect(() => {
    if (!enter || !grown) return;
    const timer = window.setTimeout(() => setEnter(false), 1400);
    return () => window.clearTimeout(timer);
  }, [enter, grown]);

  function applyRange(next: [Dayjs, Dayjs], remember?: number) {
    setRange(next);
    if (remember) localStorage.setItem(DAYS_KEY, String(remember));
    if (played.current) {
      setRefreshing(true);
      window.setTimeout(() => setRefreshing(false), 700);
    }
  }

  function chooseDays(next: number) {
    applyRange([dayjs().subtract(next - 1, "day"), dayjs()], next);
  }

  const label = new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(now);

  return (
    <div className={enter && grown ? "stats-page is-enter" : "stats-page"}>
      {params.get("api") === "down" ? (
        <Alert
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
          title="控制面 API 未连接"
          description="请求 http://127.0.0.1:8080/api/stats 失败。请先在后端目录启动服务，再刷新页面。"
        />
      ) : null}
      <section className="stats-hello">
        {refreshing ? <Spin className="stats-refresh" size="small" /> : null}
        <div>
          <p className="stats-date">{label}</p>
          <h1>{greeting(now)}，跑批概况</h1>
          <p>不含影子、重试和跳过。</p>
        </div>
        <div className="stats-window">
          <Button className="stats-guide" onClick={() => setOpen(true)}>
            口径说明
          </Button>
          <Radio.Group
            className="stats-days"
            value={endsToday && (days === 7 || days === 30) ? days : undefined}
            optionType="button"
            buttonStyle="solid"
            onChange={(event) => chooseDays(event.target.value)}
            options={[
              { label: "7 天", value: 7 },
              { label: "30 天", value: 30 },
            ]}
          />
          <DatePicker.RangePicker
            className="stats-range"
            aria-label="日期范围"
            value={range}
            allowClear={false}
            disabledDate={(date) => date.isAfter(dayjs(), "day") || date.isBefore(dayjs().subtract(MAX_SPAN - 1, "day"), "day")}
            onChange={(value) => {
              const start = value?.[0];
              const end = value?.[1];
              if (start && end) applyRange([start, end]);
            }}
          />
        </div>
      </section>
      <div className="stats-grid">
        <article className="stats-card stats-current-card">
          <div className="stats-current__head">
            <div className="stats-current__title">
              <h2>
                <span className="stats-current__name">当前任务</span>
                <button type="button" className="stats-help" aria-label="当前任务说明">
                  <QuestionCircleOutlined />
                </button>
              </h2>
              <div className="stats-robots" aria-label="本机机器人">
                <RobotMemberAvatars
                  variant="group"
                  cradle={cradle}
                  members={robotMembers}
                  maxCount={3}
                  size={28}
                  showStatusDot
                  manageLabel="执行机"
                  onManage={() => navigate("/workers")}
                  empty={<Typography.Text type="secondary">无机器人</Typography.Text>}
                />
              </div>
            </div>
            <div className="stats-actions">
              {ready && running ? (
                <>
                  <Popconfirm title="确定停止当前任务？" okText="停止" okButtonProps={{ danger: true }} cancelText="取消">
                    <Button danger>停止</Button>
                  </Popconfirm>
                  <Button type="link">运行日志</Button>
                </>
              ) : null}
              {ready && hasBatch ? <Button type="link">详情</Button> : null}
              <a className="stats-queue-link" href={`#${QUEUE_PATH}`}>
                去工作队列开跑
              </a>
            </div>
          </div>
          {ready ? (
            <>
              <div className="stats-demo-switch">
                <span>演示状态</span>
                <Select
                  size="small"
                  value={task}
                  onChange={(value) => {
                    setTask(value);
                    setStep(0);
                  }}
                  options={TASK_STATE_OPTIONS}
                  style={{ minWidth: 200 }}
                  aria-label="当前任务示例状态"
                />
                {task === "running" || task === "wlerror" ? (
                  <Button size="small" type="link" onClick={() => setStep((value) => value + 1)}>
                    推进一步
                  </Button>
                ) : null}
              </div>
              <CurrentTaskBody state={task} step={step} />
            </>
          ) : (
            <SkelBody lines={2} />
          )}
        </article>
        <div className="stats-col stats-col--left">
          <article className="stats-card">
            <h2>运行趋势 · {days} 天</h2>
            {grown ? (
              <>
                <p className="stats-sub">一次成功 71% · vs T0 68%</p>
                <TrendChart days={days} end={endIso} enter={enter} />
              </>
            ) : (
              <SkelBody height={200} lines={5} />
            )}
          </article>
          <div className="stats-health">
            {(() => {
              const failTotal = FAIL_QUEUES.reduce((sum, row) => sum + row.failed, 0);
              const failNames = FAIL_QUEUES.filter((row) => row.failed > 0).map((row) => row.name);
              // 只有一个队列有失败：去该队列并筛失败；否则去工作队列
              const failTo = failNames.length === 1 ? queuePath(failNames[0], true) : QUEUE_PATH;
              const offlineNames = offlineRobots.map((robot) => robot.name).join("、");
              const cards = [
                {
                  label: "失败待处理",
                  icon: failTotal > 0 ? "#ec489918" : "#22c55e18",
                  bar: "#ec4899",
                  value: failTotal > 0 ? failCount : 0,
                  note: failTotal > 0 ? failNames.join("、") : "没有失败行",
                  to: failTo,
                  empty: true,
                },
                {
                  label: "排队中",
                  icon: "#3b82f618",
                  bar: "#3b82f6",
                  value: queueCount,
                  note: QUEUED_PENDING_EFFECT > 0 ? `另有 ${QUEUED_PENDING_EFFECT} 个待生效` : "等执行机领走",
                  to: QUEUE_PATH,
                },
                {
                  label: "执行机在线",
                  icon: offlineRobots.length > 0 ? "#ec489918" : "#22c55e18",
                  bar: offlineRobots.length > 0 ? "#ec4899" : "#22c55e",
                  value: robots.length > 0 ? `${onlineCount} / ${robots.length}` : "—",
                  note: offlineRobots.length > 0 ? `离线：${offlineNames}` : "全部在线",
                  to: WORKERS_PATH,
                  width: robots.length > 0 ? `${Math.round((onlineCount / robots.length) * 100)}%` : "0%",
                },
              ];
              return cards.map((card, index) => (
                <article
                  key={card.label}
                  className={[enter && grown ? "stats-item" : "", "stats-health-card"].filter(Boolean).join(" ")}
                  style={enter && grown ? { animationDelay: `${200 + index * 55}ms` } : undefined}
                  role="link"
                  tabIndex={0}
                  onClick={() => navigate(card.to)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      navigate(card.to);
                    }
                  }}
                >
                  <div className="stats-health-head">
                    <i className="stats-health-icon" style={{ background: card.icon }} />
                    {ready ? <b>{card.value}</b> : null}
                  </div>
                  <span className="stats-health-title">{card.label}</span>
                  {ready ? <span className="stats-health-note" title={card.note}>{card.note}</span> : null}
                  {ready ? (
                    card.empty ? (
                      <i className="stats-health-track" />
                    ) : (
                      <i
                        className="stats-health-bar grow-bar"
                        style={{ background: card.bar, width: grown ? (card.width ?? "100%") : 0, transitionDelay: `${index * 55}ms` }}
                      />
                    )
                  ) : (
                    <div className="stats-health-lines">
                      <i className="skel-line" style={{ width: "36%" }} />
                      <i className="skel-line" style={{ width: "72%" }} />
                    </div>
                  )}
                </article>
              ));
            })()}
          </div>
          <RecentCard
            loading={!ready}
            batches={batches}
            queues={queues}
            batchState={listState("batches")}
            queueState={listState("queues")}
          />
        </div>
        <div className="stats-col stats-col--mid">
          {runRecords.count > 0 ? (
            <article className="stats-card stats-running">
              <h2>正在运行</h2>
              <Link to={RECORDS_RUNNING_PATH}>
                {runRecords.count} 条执行记录在跑{runRecords.longest ? ` · 最久已跑 ${runRecords.longest}` : ""}
              </Link>
            </article>
          ) : null}
          <article className="stats-card">
            <h2>各任务用时占比</h2>
            {grown ? (
              <div className="stats-share-host">
                <DurationRing enter={enter} />
              </div>
            ) : (
              <SkelBody height={168} lines={4} />
            )}
          </article>
          <article className="stats-card">
            <h2>各任务一次成功率</h2>
            {!ready ? (
              <SkelBody lines={5} />
            ) : rates.length === 0 ? (
              <p className="rate-empty">这段窗口没有已结束的首次运行</p>
            ) : (
              <div className="rates">
                {rates.map((row, index) => {
                  const hasRate = row.ok + row.fail > 0;
                  const percent = hasRate ? Math.round(row.rate * 100) : null;
                  const width = percent == null ? "0px" : percent === 0 ? "36px" : `${Math.max(percent, 8)}%`;
                  return (
                    <div
                      className={enter ? "rate-row stats-item" : "rate-row"}
                      key={row.name}
                      style={{ ["--bar" as string]: row.color, animationDelay: enter ? `${200 + index * 55}ms` : undefined }}
                    >
                      <span className="rate-name">{row.name}</span>
                      <div className="rate-track">
                        {percent == null ? null : (
                          <i className="grow-bar" style={{ width: grown ? width : 0, backgroundColor: row.color, transitionDelay: `${index * 55}ms` }}>
                            <RatePercent percent={percent} grown={grown} reduce={reduce} replayKey={days} />
                          </i>
                        )}
                      </div>
                      <p className="rate-detail">{`${row.ok} 次成功 · ${row.fail} 次失败`}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </article>
        </div>
        <div className="stats-col stats-col--right">
          <article className="stats-card">
            <h2>工作台</h2>
            <ActivityPanel
              days={Math.min(days, 30)}
              capped={days > 30 || !endsToday}
              ready={grown}
              animate={enter}
              auditState={listState("audit")}
              todoState={listState("todo")}
            />
          </article>
          <article className="stats-card">
            <h2>
              存储占用
              {ready ? (
                <Tooltip title="安装包保留最近 3 个版本，运行包保留最近 30 天，超出的由清理任务回收。">
                  <InfoCircleOutlined className="stats-info" aria-label="存储说明" />
                </Tooltip>
              ) : null}
            </h2>
            {ready ? (
              <>
                <p className="stats-figure">{fmtBytes(TABLE_TOTAL)}</p>
                <ul className="stats-bars">
                  {TABLES.map((row) => (
                    <li key={row.name}>
                      <span title={row.name}>{row.name}</span>
                      <i>
                        <b style={{ width: grown ? `${(row.bytes / TABLE_MAX) * 100}%` : 0 }} />
                      </i>
                      <em>{fmtBytes(row.bytes)}</em>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <SkelBody lines={4} />
            )}
          </article>
          <article className="stats-card">
            <h2 className="stats-head-split">
              失败归因
              <Button type="link" size="small" href="#/failures">
                元素聚类
              </Button>
            </h2>
            {!ready ? (
              <SkelBody lines={3} />
            ) : FAILS.length === 0 ? (
              <p>窗口内没有失败的 Run</p>
            ) : (
              <ul className="stats-fails">
                {[...FAILS]
                  .sort((x, y) => y.count - x.count)
                  .slice(0, 8)
                  .map((row, index) => {
                    const color = row.key === "unknown" || row.key === "unattributed" ? FAIL_LIGHT_PINK : FAIL_PINK;
                    return (
                      <li
                        key={row.key}
                        className={enter ? "stats-item" : undefined}
                        style={enter ? { animationDelay: `${200 + index * 55}ms` } : undefined}
                      >
                        <span className="fail-pct" style={{ color, background: `${color}22` }}>
                          {Math.round((row.count / FAIL_TOTAL) * 100)}%
                        </span>
                        <div className="fail-text">
                          <span className="fail-name">{FAIL_LABELS[row.key] ?? row.key}</span>
                          <span className="fail-count">{row.count} 次</span>
                        </div>
                        <span className="fail-tag">归因</span>
                      </li>
                    );
                  })}
              </ul>
            )}
          </article>
        </div>
      </div>
      <Drawer title="指标口径" open={open} onClose={() => setOpen(false)} size="large">
        <Typography.Paragraph>
          问候卡只留一句。影子、重试、跳过为什么不进比率，电子税局四个任务为什么算正式交付，以及「没测」为什么不是 0，都在下面。
        </Typography.Paragraph>
        <Card size="small" title="不进比率" style={{ marginBottom: 16 }}>
          <Typography.Paragraph>
            <b>影子运行</b>：还在和影刀对同一笔任务、不回写 MIS。电子税局四个任务已经在这里跑完并上传，不算影子。
          </Typography.Paragraph>
          <Typography.Paragraph>
            <b>重试</b>：新 Run 不覆盖历史；算进去等于多试几次把成功率试上去。
          </Typography.Paragraph>
          <Typography.Paragraph style={{ marginBottom: 0 }}>
            <b>跳过 / 过期的白名单行</b>：没跑过。并进成功是假交付，并进失败是冤枉。
          </Typography.Paragraph>
        </Card>
        <Card size="small" title="跟 MIS" style={{ marginBottom: 16 }}>
          <Typography.Paragraph style={{ marginBottom: 0 }}>
            现在 MIS 只能凭上传结果判断成败。后面补状态回写：开始、进行中、成功或失败及原因。文件上传照旧。
          </Typography.Paragraph>
        </Card>
        <Card size="small" title="没样本时">
          <Typography.Paragraph style={{ marginBottom: 0 }}>
            维护工时一起事件都没有 →「没测」，不是 0。静默错误没断言 →「没证据」，不是 0%。
          </Typography.Paragraph>
        </Card>
      </Drawer>
    </div>
  );
}
