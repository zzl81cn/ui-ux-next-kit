import { QuestionCircleOutlined } from "@ant-design/icons";
import { Button, Card, Drawer, Popconfirm, Radio, Spin, Typography } from "antd";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { DurationRing } from "../charts/DurationRing";
import { TrendChart } from "../charts/TrendChart";
import { RobotMemberAvatars } from "../components/RobotMemberAvatars";
import { loadMotion } from "../lib/consolePrefs";
import { RATE_ROWS } from "../mock/data";
import { sortRobotMembers, useRobots } from "../mock/robots";
import { ActivityPanel } from "./ActivityPanel";

const MOTION_KEY = "demo-stats-grown";
const DAYS_KEY = "demo-stats-days";
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

function useGrow(target: number, run: boolean) {
  const [value, setValue] = useState(run ? 0 : target);
  useEffect(() => {
    if (!run) {
      setValue(target);
      return;
    }
    const started = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - started) / 600);
      const eased = 1 - (1 - t) ** 3;
      setValue(Math.round(target * eased));
      if (t < 1) frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [run, target]);
  return value;
}

const BATCHES = [
  { name: "发票同步", when: "14:20", result: "进行中" },
  { name: "库存推送", when: "13:02", result: "一次成功" },
  { name: "邮件拉取", when: "11:40", result: "失败" },
];

const TABLES = [
  { name: "dispatch", bytes: "1.2 GB", width: "100%" },
  { name: "run_log", bytes: "640 MB", width: "53%" },
  { name: "artifact", bytes: "220 MB", width: "18%" },
];

export function StatsPage() {
  const navigate = useNavigate();
  const { robots } = useRobots();
  const robotMembers = useMemo(() => [...robots].sort(sortRobotMembers), [robots]);
  const now = new Date();
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const seen = sessionStorage.getItem(MOTION_KEY) === "1";
  const [days, setDays] = useState(readDays);
  const [open, setOpen] = useState(false);
  const [ready, setReady] = useState(seen);
  const [grown, setGrown] = useState(seen || reduce);
  const [enter, setEnter] = useState(!seen && !reduce);
  const cradle = useRef(!seen && !reduce).current;
  const [refreshing, setRefreshing] = useState(false);
  const rates = useMemo(
    () =>
      [...RATE_ROWS]
        .sort((a, b) => {
          const rank = (row: (typeof RATE_ROWS)[number]) => (row.ok + row.fail > 0 ? row.rate : 1);
          const delta = rank(a) - rank(b);
          return delta !== 0 ? delta : b.fail - a.fail;
        })
        .map((row, index) => ({ ...row, color: RATE_COLORS[index % RATE_COLORS.length] })),
    [],
  );
  const failCount = useGrow(3, grown && !seen);
  const queueCount = useGrow(8, grown && !seen);
  const running = true;

  const chartDelay = reduce ? 0 : loadMotion().chartDelayMs;

  useEffect(() => {
    if (ready) return;
    const timer = window.setTimeout(() => {
      setReady(true);
      setGrown(true);
    }, chartDelay);
    return () => window.clearTimeout(timer);
  }, [ready, chartDelay]);

  useEffect(() => {
    if (!grown || seen) return;
    const timer = window.setTimeout(() => sessionStorage.setItem(MOTION_KEY, "1"), 700);
    return () => window.clearTimeout(timer);
  }, [grown, seen]);

  useEffect(() => {
    if (!enter || !grown) return;
    const timer = window.setTimeout(() => setEnter(false), 1400);
    return () => window.clearTimeout(timer);
  }, [enter, grown]);

  function chooseDays(next: number) {
    const clamped = Math.min(30, Math.max(1, next));
    setDays(clamped);
    localStorage.setItem(DAYS_KEY, String(clamped));
    if (sessionStorage.getItem(MOTION_KEY) === "1") {
      setRefreshing(true);
      window.setTimeout(() => setRefreshing(false), 700);
    }
  }

  function chooseRange(value: string) {
    if (!value) return;
    const start = new Date(`${value}T00:00:00`);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const span = Math.round((today.getTime() - start.getTime()) / 86400000);
    chooseDays(span);
  }

  const label = new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(now);
  const todayValue = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Shanghai" }).format(now);
  const minValue = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Shanghai" }).format(
    new Date(now.getTime() - 30 * 86400000),
  );

  return (
    <div className={enter && grown ? "stats-page is-enter" : "stats-page"}>
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
            value={days === 7 || days === 30 ? days : undefined}
            optionType="button"
            buttonStyle="solid"
            onChange={(event) => chooseDays(event.target.value)}
            options={[
              { label: "7 天", value: 7 },
              { label: "30 天", value: 30 },
            ]}
          />
          <input className="stats-range" type="date" min={minValue} max={todayValue} aria-label="日期范围" onChange={(event) => chooseRange(event.target.value)} />
        </div>
      </section>
      <div className="stats-grid">
        <div className="stats-col">
          <article className="stats-card">
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
                {ready ? <Button type="link">详情</Button> : null}
                <a className="stats-queue-link" href="#/jobs">
                  去工作队列开跑
                </a>
              </div>
            </div>
            {ready ? <p>执行机-01 正在跑「发票同步」。</p> : <SkelBody lines={2} />}
          </article>
          <article className="stats-card">
            <h2>运行趋势 · {days} 天</h2>
            {ready ? (
              <>
                <p className="stats-sub">一次成功 71% · vs T0 68%</p>
                <TrendChart days={days} enter={enter} />
              </>
            ) : (
              <SkelBody height={200} lines={5} />
            )}
          </article>
          <div className="stats-health">
            {[
              { label: "失败待处理", icon: "#ec489918", bar: "#ec4899", value: failCount },
              { label: "排队中", icon: "#3b82f618", bar: "#3b82f6", value: queueCount },
              { label: "执行机在线", icon: "#22c55e18", bar: "#22c55e", value: "4 / 5", width: "80%" },
            ].map((card, index) => (
              <article
                key={card.label}
                className={enter && grown ? "stats-item" : undefined}
                style={enter && grown ? { animationDelay: `${200 + index * 55}ms` } : undefined}
              >
                <div className="stats-health-head">
                  <i className="stats-health-icon" style={{ background: card.icon }} />
                  {ready ? <b>{card.value}</b> : null}
                </div>
                <span>{card.label}</span>
                {ready ? (
                  <i className="stats-health-bar" style={{ background: card.bar, width: card.width }} />
                ) : (
                  <div className="stats-health-lines">
                    <i className="skel-line" style={{ width: "36%" }} />
                    <i className="skel-line" style={{ width: "72%" }} />
                  </div>
                )}
              </article>
            ))}
          </div>
          <article className="stats-card">
            <h2>最近批次</h2>
            {ready ? (
              <ul className="stats-list">
                {BATCHES.map((row, index) => (
                  <li
                    key={row.name}
                    className={enter ? "stats-item" : undefined}
                    style={enter ? { animationDelay: `${200 + index * 55}ms` } : undefined}
                  >
                    <span>{row.name}</span>
                    <em>{row.when}</em>
                    <b>{row.result}</b>
                  </li>
                ))}
              </ul>
            ) : (
              <SkelBody lines={3} />
            )}
          </article>
        </div>
        <div className="stats-col">
          {running ? (
            <article className="stats-card">
              <h2>正在运行</h2>
              <p>发票同步 · 执行机-01</p>
            </article>
          ) : null}
          <article className="stats-card">
            <h2>各任务用时占比</h2>
            {ready ? (
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
                          <i style={{ width: grown ? width : 0, backgroundColor: row.color, transitionDelay: `${index * 55}ms` }}>
                            <b>{percent}%</b>
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
        <div className="stats-col">
          <article className="stats-card">
            <h2>工作台</h2>
            <ActivityPanel days={days} ready={ready} animate={enter} />
          </article>
          <article className="stats-card">
            <h2>存储占用</h2>
            {ready ? (
              <>
                <p className="stats-figure">2.1 GB</p>
                <ul className="stats-bars">
                  {TABLES.map((row) => (
                    <li key={row.name}>
                      <span>{row.name}</span>
                      <i>
                        <b style={{ width: grown ? row.width : 0 }} />
                      </i>
                      <em>{row.bytes}</em>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <SkelBody lines={4} />
            )}
          </article>
          <article className="stats-card">
            <h2>
              失败归因
              <Button type="link" size="small">
                元素聚类
              </Button>
            </h2>
            {ready ? <p>窗口内没有失败的 Run</p> : <SkelBody lines={3} />}
          </article>
        </div>
      </div>
      <Drawer title="指标口径" open={open} onClose={() => setOpen(false)} size="large">
        <Typography.Paragraph>
          问候卡只留一句。影子、重试、跳过为什么不进比率，以及「没测」为什么不是 0，都在下面。
        </Typography.Paragraph>
        <Card size="small" title="不进比率" style={{ marginBottom: 16 }}>
          <Typography.Paragraph>影子运行不回写，不进比率。</Typography.Paragraph>
          <Typography.Paragraph>重试是新的一次运行，不覆盖历史，不算进这一次的成功率。</Typography.Paragraph>
          <Typography.Paragraph style={{ marginBottom: 0 }}>跳过没跑过。不能算成功，也不能算失败。</Typography.Paragraph>
        </Card>
        <Card size="small" title="跟 MIS" style={{ marginBottom: 16 }}>
          <Typography.Paragraph style={{ marginBottom: 0 }}>
            成败先看上传结果。后面补开始、进行中、成功或失败及原因。
          </Typography.Paragraph>
        </Card>
        <Card size="small" title="没样本时">
          <Typography.Paragraph style={{ marginBottom: 0 }}>一次运行都没有时显示「没测」，不是 0。</Typography.Paragraph>
        </Card>
      </Drawer>
    </div>
  );
}
