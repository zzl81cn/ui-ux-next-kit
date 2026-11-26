import dayjs from "dayjs";

/** 当前任务的七种示例状态，用来逐个对照文案。 */
export type TaskState = "idle" | "stopped" | "running" | "wlerror" | "pending" | "unfinished" | "abnormal" | "error";

export const TASK_STATE_OPTIONS: { value: TaskState; label: string }[] = [
  { value: "idle", label: "空闲" },
  { value: "stopped", label: "空闲 · 自动续跑已停" },
  { value: "running", label: "有派单在跑" },
  { value: "wlerror", label: "有派单在跑 · 白名单列读失败" },
  { value: "pending", label: "已派单 · 进度未回写" },
  { value: "unfinished", label: "未完成批次 · 执行器空闲" },
  { value: "abnormal", label: "异常批次 · 本批已停" },
  { value: "error", label: "派单报错" },
];

export function isTaskState(value: string | null): value is TaskState {
  return TASK_STATE_OPTIONS.some((item) => item.value === value);
}

/** 进度条的数。总数 = 批次总户数；未结 = 排队 + 运行中；running 是未结里执行机正在跑的那几户（只在真在跑时画成一小段） */
export type TaskCounts = { total: number; done: number; failed: number; skipped: number; queued: number; running?: number };

export const TASK_COUNTS: Record<"running" | "unfinished" | "abnormal", TaskCounts> = {
  running: { total: 120, done: 70, failed: 3, skipped: 5, queued: 42, running: 1 },
  unfinished: { total: 120, done: 88, failed: 0, skipped: 4, queued: 28 },
  abnormal: { total: 120, done: 62, failed: 14, skipped: 5, queued: 39 },
};

/** 有白名单数据时的标签数（和为总数）：待跑 / 有数据 / 无数据 / 无权限 / 已落字 */
export const WHITELIST = { todo: 32, hasData: 70, noData: 14, noAuth: 4, written: 84 };

export const TASK_BATCH = {
  id: 1042,
  app: "发票同步",
  misId: 3021,
  round: 2,
  area: "区域 2 / 5",
  robot: "执行机-01",
  pack: "v1.4.2" as string | null,
  doing: "填写「增值税申报表」第 3 页的纳税人信息，页面加载较慢，已等待 8 秒后重试，请稍候。",
};

/** 「正在运行」：执行记录里在跑的条数和最久一条 */
export const RUNNING_RECORDS: Record<TaskState, { count: number; longest: string | null }> = {
  idle: { count: 0, longest: null },
  stopped: { count: 0, longest: null },
  running: { count: 3, longest: "42 分钟" },
  wlerror: { count: 3, longest: "42 分钟" },
  pending: { count: 1, longest: "1 分钟" },
  unfinished: { count: 0, longest: null },
  abnormal: { count: 0, longest: null },
  error: { count: 0, longest: null },
};

/** 健康小卡的示例数据 */
export const FAIL_QUEUES = [
  { name: "发票同步", failed: 2 },
  { name: "邮件拉取", failed: 1 },
];
export const QUEUED_COUNT = 8;
export const QUEUED_PENDING_EFFECT = 2;

export type BatchStatus = "running" | "unfinished" | "done" | "abnormal" | "stopped";
export type BatchRow = { id: number; app: string; at: string | null; mis: number | null; status: BatchStatus };

export function sampleBatches(): BatchRow[] {
  const at = (minutes: number) => dayjs().subtract(minutes, "minute").format("YYYY-MM-DDTHH:mm");
  const apps = ["发票同步", "库存推送", "邮件拉取", "对账回写", "发票同步", "库存推送", "对账回写", "邮件拉取"];
  const status: BatchStatus[] = ["running", "unfinished", "done", "abnormal", "done", "stopped", "done", "done"];
  const total = 15;
  return Array.from({ length: total }, (_, index) => ({
    id: 1042 - index,
    app: apps[index % apps.length],
    at: index === 5 ? null : at(20 + index * 190),
    mis: index === 6 ? null : 3021 - index * 3,
    status: status[index % status.length] === "running" && index > 0 ? ("done" as BatchStatus) : status[index % status.length],
  }));
}

export type QueueRow = { name: string; total: number; done: number; running: number; queued: number; failed: number };

export function sampleQueues(): QueueRow[] {
  return [
    { name: "对账回写", total: 18, done: 18, running: 0, queued: 0, failed: 0 },
    { name: "库存推送", total: 25, done: 21, running: 1, queued: 3, failed: 0 },
    { name: "邮件拉取", total: 12, done: 11, running: 0, queued: 0, failed: 1 },
    { name: "发票同步", total: 40, done: 32, running: 1, queued: 5, failed: 2 },
    { name: "空跑样本", total: 0, done: 0, running: 0, queued: 0, failed: 0 },
  ];
}

/** 待办里的失败执行（标题是应用名，没有原因写「执行失败」） */
export const TODO_FAILED = [
  { id: "f1", app: "发票同步", reason: "第 3 步「提交表单」超时" },
  { id: "f2", app: "邮件拉取", reason: "" },
  { id: "f3", app: "对账回写", reason: "登录态失效" },
  { id: "f4", app: "库存推送", reason: "上游缺件" },
];
