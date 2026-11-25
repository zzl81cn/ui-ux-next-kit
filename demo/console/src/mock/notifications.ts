import { useSyncExternalStore } from "react";

/** 消息通知的演示数据。类型键、标签文案和颜色见 components/NotificationBell 里的 TYPE_TAGS。 */
export type NoticeRecord = {
  id: string;
  type: string;
  title: string;
  body?: string;
  /** 有链接：点一条先标已读，再关面板跳过去。没有：面板留着。 */
  link?: string;
  read: boolean;
  at: number;
};

const MIN = 60_000;
const HOUR = 60 * MIN;
const now = Date.now();

function seed(): NoticeRecord[] {
  const base: { type: string; title: string; body?: string; link?: string; read: boolean; ago: number }[] = [
    { type: "job.failed", title: "发票同步 运行失败", body: "第 3 步「提交表单」超时，已重试 2 次。", link: "/jobs?record=api", read: false, ago: 30_000 },
    { type: "job.succeeded", title: "月度对账 运行完成", body: "共处理 128 条，全部成功。", link: "/jobs?record=api", read: false, ago: 12 * MIN },
    { type: "app.owner_in", title: "你成为「报销自动化」的归属人", body: "原归属人：值班。", read: false, ago: 55 * MIN },
    { type: "runner.published", title: "运行包 v1.4.2 已发布", body: "适用于全部在线执行机。", link: "/workers", read: false, ago: 3 * HOUR },
    { type: "app.member_added", title: "你被加入「采购对单」", body: "角色：协作者。", read: false, ago: 5 * HOUR },
    { type: "job.expired", title: "夜间巡检 已过期", body: "排队超过 24 小时，系统已取消。", read: true, ago: 9 * HOUR },
    { type: "job.succeeded", title: "客户回款核销 运行完成", read: true, ago: 22 * HOUR },
    { type: "app.owner_out", title: "你不再是「差旅申请」的归属人", body: "新归属人：夜班。", read: true, ago: 30 * HOUR },
    { type: "job.failed", title: "库存盘点 运行失败", body: "登录态失效，请重新授权。", link: "/jobs?record=api", read: true, ago: 2 * 24 * HOUR },
    { type: "runner.published", title: "运行包 v1.4.1 已发布", read: true, ago: 3 * 24 * HOUR },
    { type: "job.succeeded", title: "日报汇总 运行完成", read: true, ago: 4 * 24 * HOUR },
    { type: "job.expired", title: "周报导出 已过期", read: true, ago: 5 * 24 * HOUR },
    { type: "app.member_added", title: "你被加入「合同归档」", read: true, ago: 6 * 24 * HOUR },
    { type: "job.failed", title: "工资条发送 运行失败", body: "收件人列表为空。", read: true, ago: 7 * 24 * HOUR },
    { type: "job.succeeded", title: "月度对账 运行完成", read: true, ago: 8 * 24 * HOUR },
    { type: "app.owner_in", title: "你成为「库存盘点」的归属人", read: true, ago: 9 * 24 * HOUR },
    { type: "job.succeeded", title: "发票同步 运行完成", read: true, ago: 10 * 24 * HOUR },
    { type: "runner.published", title: "运行包 v1.4.0 已发布", read: true, ago: 11 * 24 * HOUR },
    { type: "job.failed", title: "采购对单 运行失败", read: true, ago: 12 * 24 * HOUR },
    { type: "job.expired", title: "对账任务 已过期", read: true, ago: 13 * 24 * HOUR },
    { type: "job.succeeded", title: "客户回款核销 运行完成", read: true, ago: 14 * 24 * HOUR },
    { type: "app.member_added", title: "你被加入「报销自动化」", read: true, ago: 15 * 24 * HOUR },
    { type: "legacy.notice", title: "系统维护通知（未知类型不画标签）", body: "不认识的类型键只画标题，不报错。", read: true, ago: 16 * 24 * HOUR },
    { type: "job.succeeded", title: "日报汇总 运行完成", read: true, ago: 17 * 24 * HOUR },
  ];
  return base.map((row, index) => ({ id: `n-${index}`, type: row.type, title: row.title, body: row.body, link: row.link, read: row.read, at: now - row.ago }));
}

let items: NoticeRecord[] = seed();
let version = 0;
const listeners = new Set<() => void>();

function emit() {
  version += 1;
  listeners.forEach((fn) => fn());
}

export function subscribeNotices(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** 只拉计数，不拉列表。 */
export function fetchUnreadCount(): number {
  return items.filter((item) => !item.read).length;
}

/** 每页 20 条，打开时现拉。 */
export function fetchNotices(offset: number, limit = 20): { rows: NoticeRecord[]; hasMore: boolean } {
  const rows = items.slice(offset, offset + limit).map((item) => ({ ...item }));
  return { rows, hasMore: offset + limit < items.length };
}

export function markNoticeRead(id: string) {
  items = items.map((item) => (item.id === id ? { ...item, read: true } : item));
  emit();
}

export function markAllNoticesRead() {
  items = items.map((item) => ({ ...item, read: true }));
  emit();
}

export function clearNotices() {
  items = [];
  emit();
}

export function useNoticeVersion() {
  return useSyncExternalStore(subscribeNotices, () => version);
}
