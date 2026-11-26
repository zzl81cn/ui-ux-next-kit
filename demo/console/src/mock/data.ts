/** 演示用内存数据。字段对齐参考控制台的派单记录，不接真实库。 */

import { loadCaptchaSettings, type CaptchaSettings } from "../lib/consolePrefs";

export type ExecutionStatus =
  | "pending"
  | "running"
  | "stopping"
  | "succeeded"
  | "failed"
  | "stopped";

export type Execution = {
  id: number;
  job_id: number;
  config_key: string;
  title: string;
  queue_name: string;
  mis_task_id: number | null;
  robot_name: string | null;
  robot_id: string | null;
  status: ExecutionStatus;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
  queue_info: string | null;
};

const executions: Execution[] = [
  {
    id: 1842,
    job_id: 90,
    config_key: "invoice-sync",
    title: "发票同步",
    queue_name: "发票同步，任务 4412",
    mis_task_id: 4412,
    robot_name: "执行机-01",
    robot_id: "r-01",
    status: "running",
    created_at: "2026-11-24T01:12:00Z",
    started_at: "2026-11-24T01:14:00Z",
    finished_at: null,
    queue_info: '{"mis_id":4412,"env":"test"}',
  },
  {
    id: 1841,
    job_id: 90,
    config_key: "invoice-sync",
    title: "发票同步",
    queue_name: "发票同步，任务 4412",
    mis_task_id: 4412,
    robot_name: "执行机-01",
    robot_id: "r-01",
    status: "failed",
    created_at: "2026-11-23T09:02:00Z",
    started_at: "2026-11-23T09:03:00Z",
    finished_at: "2026-11-23T09:11:00Z",
    queue_info: '{"mis_id":4412}',
  },
  {
    id: 1800,
    job_id: 77,
    config_key: "stock-push",
    title: "库存推送",
    queue_name: "库存推送，任务 2201",
    mis_task_id: 2201,
    robot_name: null,
    robot_id: "r-02",
    status: "succeeded",
    created_at: "2026-11-22T04:20:00Z",
    started_at: "2026-11-22T04:21:00Z",
    finished_at: "2026-11-22T04:40:00Z",
    queue_info: null,
  },
  {
    id: 1790,
    job_id: 70,
    config_key: "mail-fetch",
    title: "邮件拉取",
    queue_name: "邮件拉取，任务 18",
    mis_task_id: null,
    robot_name: "执行机-03",
    robot_id: "r-03",
    status: "stopped",
    created_at: "2026-11-21T08:00:00Z",
    started_at: "2026-11-21T08:05:00Z",
    finished_at: "2026-11-21T08:06:00Z",
    queue_info: '{"box":"inbox"}',
  },
  {
    id: 1702,
    job_id: 61,
    config_key: "stock-push",
    title: "库存推送",
    queue_name: "库存推送，任务 2190",
    mis_task_id: 2190,
    robot_name: null,
    robot_id: null,
    status: "pending",
    created_at: "2026-11-20T02:00:00Z",
    started_at: null,
    finished_at: null,
    queue_info: '{"mis_id":2190}',
  },
];

// 演示数据：在上面 5 条之外再生成 35 条，让筛选、分页和滚动都有东西可看
(() => {
  const apps = [
    { title: "发票同步", key: "invoice-sync", mis: 4412 },
    { title: "库存推送", key: "stock-push", mis: 2201 },
    { title: "邮件拉取", key: "mail-fetch", mis: 18 },
    { title: "对账回写", key: "bill-writeback", mis: 3305 },
    { title: "报销审批", key: "expense-approve", mis: 5120 },
    { title: "客户回款核销", key: "receipt-match", mis: 6048 },
  ];
  const robots = [
    { name: "执行机-01", id: "r-01" },
    { name: "执行机-02", id: "r-02" },
    { name: "执行机-03", id: "r-03" },
    { name: "执行机-04", id: "r-04" },
  ];
  const statuses: ExecutionStatus[] = ["succeeded", "succeeded", "failed", "succeeded", "stopped", "succeeded", "running", "pending"];
  const base = Date.UTC(2026, 10, 19, 6, 0, 0);
  for (let i = 0; i < 35; i += 1) {
    const app = apps[i % apps.length];
    const robot = robots[(i * 3 + 1) % robots.length];
    const status = statuses[i % statuses.length];
    const created = base - i * 5.5 * 3600_000;
    const started = status === "pending" ? null : created + 60_000;
    const finished = status === "succeeded" || status === "failed" || status === "stopped" ? (started as number) + (3 + (i % 9) * 4) * 60_000 : null;
    const iso = (t: number | null) => (t == null ? null : new Date(t).toISOString().replace(".000", ""));
    const mis = app.mis + (i % 3);
    executions.push({
      id: 1700 - i - 1,
      job_id: 60 + (i % 6),
      config_key: app.key,
      title: app.title,
      queue_name: `${app.title}，任务 ${mis}`,
      mis_task_id: i % 7 === 3 ? null : mis,
      robot_name: status === "pending" ? null : robot.name,
      robot_id: status === "pending" ? null : robot.id,
      status,
      created_at: iso(created) as string,
      started_at: iso(started),
      finished_at: iso(finished),
      queue_info: i % 5 === 2 ? null : `{"mis_id":${mis},"env":"${i % 2 ? "prod" : "test"}"}`,
    });
  }
})();


type Captcha = { captcha_id: string; image: string; code: string };

let captcha: Captcha = drawCaptcha(loadCaptchaSettings());

function drawCaptcha(look: CaptchaSettings): Captcha {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const length = Math.min(6, Math.max(4, Math.round(look.length) || 4));
  let code = "";
  for (let i = 0; i < length; i += 1) code += alphabet[Math.floor(Math.random() * alphabet.length)];
  const dots = look.noise === "low" ? 8 : look.noise === "high" ? 56 : 24;
  const lines = Math.min(8, Math.max(0, Math.round(look.lines) || 0));
  const width = 28 * length;
  // 白底，笔画按横向渐变上色：深蓝 → 紫 → 青循环取色，每张图的起始色随机；噪点和圆点跟着同色
  const palette = ["#1d4ed8", "#7c3aed", "#0d9488"];
  const first = Math.floor(Math.random() * palette.length);
  const stops = [0, 1, 2, 3].map((n) => `<stop offset="${((n * 100) / 3).toFixed(2)}%" stop-color="${palette[(first + n) % palette.length]}"/>`).join("");
  const noise = Array.from({ length: dots }, (_, index) => {
    const x = (index * 37) % width;
    const y = (index * 17) % 40;
    return `<circle cx="${x}" cy="${y}" r="1" fill="url(#cap-ink)" opacity="0.55"/>`;
  }).join("");
  const rules = Array.from({ length: lines }, (_, index) => {
    const y = 6 + index * 4;
    return `<line x1="0" y1="${y}" x2="${width}" y2="${40 - y}" stroke="url(#cap-ink)" stroke-width="1" opacity="0.4"/>`;
  }).join("");
  const id = `cap-${Date.now()}-${code}`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="40" data-lines="${lines}" data-noise="${look.noise}">
    <defs><linearGradient id="cap-ink" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="${width}" y2="0">${stops}</linearGradient></defs>
    <rect width="${width}" height="40" fill="#fff"/>
    ${rules}
    ${noise}
    <text x="10" y="27" font-family="ui-monospace,monospace" font-size="20" font-weight="700" fill="url(#cap-ink)" letter-spacing="3">${code}</text>
  </svg>`;
  return { captcha_id: id, image: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`, code };
}

export function issueCaptcha(): { captcha_id: string; image: string } {
  captcha = drawCaptcha(loadCaptchaSettings());
  return { captcha_id: captcha.captcha_id, image: captcha.image };
}

/** 设置页预览。按当前表单重画，不替换登录页正在用的那张。 */
export function previewCaptcha(look: CaptchaSettings): string {
  return drawCaptcha(look).image;
}

export function login(input: {
  username: string;
  password: string;
  captchaId: string;
  captchaCode: string;
}): { ok: true } | { ok: false; message: string } {
  if (loadCaptchaSettings().enabled) {
    if (!input.captchaId || input.captchaId !== captcha.captcha_id || input.captchaCode.trim().toUpperCase() !== captcha.code) {
      return { ok: false, message: "验证码不正确" };
    }
  }
  if (!input.username || !input.password) {
    return { ok: false, message: "登录失败" };
  }
  return { ok: true };
}

/** 队列项编号：演示里取队列项名称里的「任务 N」。 */
export function queueIdOf(row: Execution): number {
  return Number(/任务 (\d+)/.exec(row.queue_name)?.[1] ?? 0);
}

/** 北京时间的日期，YYYY-MM-DD。筛选的日期范围一律按北京时间算。 */
function beijingDay(iso: string): string {
  return new Date(new Date(iso).getTime() + 8 * 3600_000).toISOString().slice(0, 10);
}

export type DayRange = { from?: string; to?: string };

export type ExecutionSortField =
  | "title"
  | "queue_name"
  | "mis_task_id"
  | "robot_name"
  | "status"
  | "created_at"
  | "started_at"
  | "finished_at";

const STATUS_ORDER: Record<ExecutionStatus, number> = { pending: 0, running: 1, stopping: 2, succeeded: 3, failed: 4, stopped: 5 };

function inRange(iso: string | null, range?: DayRange) {
  if (!range?.from && !range?.to) return true;
  // 还没开始 / 还没结束的派单没有这个时间，不进对应的范围
  if (!iso) return false;
  const day = beijingDay(iso);
  if (range.from && day < range.from) return false;
  if (range.to && day > range.to) return false;
  return true;
}

export function listExecutions(query: {
  title?: string;
  result?: string;
  /** 名称或标识，模糊 */
  robot?: string;
  misTaskId?: string;
  created?: DayRange;
  started?: DayRange;
  finished?: DayRange;
  /** 只看某个队列项的执行 */
  queueId?: number;
  sort?: { field: ExecutionSortField; order: "ascend" | "descend" };
  offset: number;
  limit: number;
}): { items: Execution[]; total: number } {
  const title = query.title?.trim().toLowerCase() ?? "";
  const robot = query.robot?.trim().toLowerCase() ?? "";
  const mis = query.misTaskId?.trim() ?? "";
  const filtered = executions.filter((row) => {
    if (title && !row.title.toLowerCase().includes(title)) return false;
    if (query.result && row.status !== query.result) return false;
    if (robot && !`${row.robot_name ?? ""} ${row.robot_id ?? ""}`.toLowerCase().includes(robot)) return false;
    if (mis && !String(row.mis_task_id ?? "").includes(mis)) return false;
    if (query.queueId != null && queueIdOf(row) !== query.queueId) return false;
    return inRange(row.created_at, query.created) && inRange(row.started_at, query.started) && inRange(row.finished_at, query.finished);
  });
  const field = query.sort?.field ?? "created_at";
  const sign = (query.sort?.order ?? "descend") === "ascend" ? 1 : -1;
  const keyOf = (row: Execution): string | number | null => (field === "status" ? STATUS_ORDER[row.status] : row[field]);
  filtered.sort((a, b) => {
    const x = keyOf(a);
    const y = keyOf(b);
    // 空值永远排在最后，不随升降序翻到最前
    if (x == null && y == null) return b.id - a.id;
    if (x == null) return 1;
    if (y == null) return -1;
    if (x === y) return b.id - a.id;
    return (x < y ? -1 : 1) * sign;
  });
  return { items: filtered.slice(query.offset, query.offset + query.limit), total: filtered.length };
}

export const RATE_ROWS = [
  { name: "对账回写", rate: 0, ok: 0, fail: 3, color: "#6d5efc" },
  { name: "发票同步", rate: 0.62, ok: 18, fail: 11, color: "#3b82f6" },
  { name: "库存推送", rate: 0.84, ok: 42, fail: 8, color: "#22c55e" },
  { name: "邮件拉取", rate: 0.4, ok: 2, fail: 3, color: "#ff8a3d" },
  { name: "空跑样本", rate: 0, ok: 0, fail: 0, color: "#ec4899" },
];
