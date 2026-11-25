import { useSyncExternalStore } from "react";
import type { RobotMemberAvatarItem } from "../components/RobotMemberAvatars";

export type RobotRecord = RobotMemberAvatarItem;

export const ROBOTS: RobotRecord[] = [
  { id: "a-run", name: "甲机", online: true, running: true, username: "jia", host_ip: "10.1.0.8", owner: "值班", remark: "正在开票" },
  { id: "b-yi", name: "执行乙", online: true, running: false, username: "yi", host_ip: "10.1.0.9", owner: "值班" },
  { id: "c-fa", name: "发票同步", online: true, running: false, username: "fa", host_ip: "10.1.0.10" },
  { id: "d-ops", name: "ops01@desk", online: true, running: false, username: "ops01", host_ip: "10.1.0.11" },
  { id: "e-bing", name: "丙", online: true, running: false },
  { id: "f-ding", name: "丁", online: true, running: false },
  { id: "g-wu", name: "戊", online: true, running: false },
  { id: "h-off", name: "离线庚", online: false, running: false, username: "geng", host_ip: "10.1.0.20", owner: "夜班" },
  { id: "i-01", name: "执行01", online: true, running: false, username: "bot01", host_ip: "10.1.1.1" },
  { id: "i-02", name: "执行02", online: true, running: false, username: "bot02", host_ip: "10.1.1.2" },
  { id: "i-03", name: "执行03", online: false, running: false, username: "bot03", host_ip: "10.1.1.3" },
  { id: "i-04", name: "执行04", online: true, running: false, username: "bot04", host_ip: "10.1.1.4" },
  { id: "i-05", name: "执行05", online: true, running: false, username: "bot05", host_ip: "10.1.1.5" },
  { id: "i-06", name: "执行06", online: false, running: false, username: "bot06", host_ip: "10.1.1.6" },
  { id: "i-07", name: "执行07", online: true, running: false, username: "bot07", host_ip: "10.1.1.7" },
];

export type RobotGroup = { id: string; name: string; robot_ids: string[] };

export const ROBOT_GROUPS: RobotGroup[] = [
  { id: "g-bill", name: "开票组", robot_ids: ["a-run", "b-yi", "c-fa", "d-ops", "e-bing", "f-ding", "g-wu", "h-off"] },
  { id: "g-empty", name: "空组", robot_ids: [] },
  { id: "g-spare", name: "备用组", robot_ids: ["h-off", "gone-01"] },
];

type Phase = "pending" | "ready" | "error";

type RobotState = { phase: Phase; robots: RobotRecord[] };

let state: RobotState = { phase: "pending", robots: [] };
const listeners = new Set<() => void>();
let pollTimer = 0;
let focusBound = false;

function emit() {
  listeners.forEach((listener) => listener());
}

function load(): Promise<RobotRecord[]> {
  return new Promise((resolve, reject) => {
    window.setTimeout(() => {
      if (sessionStorage.getItem("demo-robots-fail") === "1") {
        reject(new Error("fail"));
        return;
      }
      resolve(ROBOTS);
    }, 280);
  });
}

async function pull(attempt = 0) {
  try {
    const next = await load();
    state = { phase: "ready", robots: next };
    emit();
  } catch {
    if (attempt < 1) {
      await pull(attempt + 1);
      return;
    }
    if (state.robots.length === 0) {
      state = { phase: "error", robots: [] };
      emit();
    }
  }
}

function onFocus() {
  void pull();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1) {
    void pull();
    pollTimer = window.setInterval(() => void pull(), 15_000);
    window.addEventListener("focus", onFocus);
    focusBound = true;
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      window.clearInterval(pollTimer);
      if (focusBound) window.removeEventListener("focus", onFocus);
      focusBound = false;
    }
  };
}

function getState() {
  return state;
}

export function useRobots() {
  return useSyncExternalStore(subscribe, getState);
}

/** 运行中在前，其余按中文名。顶栏只拿在线的。 */
export function sortOnline(a: RobotRecord, b: RobotRecord) {
  const running = Number(Boolean(b.running)) - Number(Boolean(a.running));
  if (running !== 0) return running;
  return a.name.localeCompare(b.name, "zh");
}

/** 运行中、在线空闲、离线，同档按名。 */
export function sortRobotMembers(a: RobotRecord, b: RobotRecord) {
  const rank = (robot: RobotRecord) => (!robot.online ? 0 : robot.running ? 2 : 1);
  const delta = rank(b) - rank(a);
  if (delta !== 0) return delta;
  return a.name.localeCompare(b.name, "zh");
}

export function membersOf(ids: string[], robots: RobotRecord[]): RobotRecord[] {
  const byId = new Map(robots.map((robot) => [robot.id, robot]));
  return ids.map((id) => byId.get(id) ?? { id, name: id, online: false, running: false });
}
