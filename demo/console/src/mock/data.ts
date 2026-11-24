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
  const noise = Array.from({ length: dots }, (_, index) => {
    const x = (index * 37) % width;
    const y = (index * 17) % 40;
    return `<circle cx="${x}" cy="${y}" r="1" fill="#98a2b3"/>`;
  }).join("");
  const rules = Array.from({ length: lines }, (_, index) => {
    const y = 6 + index * 4;
    return `<line x1="0" y1="${y}" x2="${width}" y2="${40 - y}" stroke="#d0d5dd" stroke-width="1"/>`;
  }).join("");
  const id = `cap-${Date.now()}-${code}`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="40" data-lines="${lines}" data-noise="${look.noise}">
    <rect width="${width}" height="40" fill="#f5f5f5"/>
    ${rules}
    ${noise}
    <text x="10" y="27" font-family="ui-monospace,monospace" font-size="20" font-weight="700" fill="#1b1f24" letter-spacing="3">${code}</text>
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

export function listExecutions(query: {
  title?: string;
  result?: string;
  misTaskId?: string;
  offset: number;
  limit: number;
}): { items: Execution[]; total: number } {
  const title = query.title?.trim().toLowerCase() ?? "";
  const mis = query.misTaskId?.trim() ?? "";
  const filtered = executions.filter((row) => {
    if (title && !row.title.toLowerCase().includes(title)) return false;
    if (query.result && row.status !== query.result) return false;
    if (mis && !String(row.mis_task_id ?? "").includes(mis)) return false;
    return true;
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
