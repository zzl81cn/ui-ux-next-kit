/** 系统配置里不跟品牌走的几份设置。登录安全和验证码按「服务器」记在这次打开里；列表刷新和界面动效只写当前浏览器。 */

export type SecuritySettings = {
  max_failures: number;
  lock_minutes: number;
  session_minutes: number;
  min_length: number;
  require_upper: boolean;
  require_lower: boolean;
  require_digit: boolean;
  require_special: boolean;
  rotation_enabled: boolean;
  rotation_days: number;
  temp_password_hours: number;
};

export const defaultSecurity: SecuritySettings = {
  max_failures: 5,
  lock_minutes: 60,
  session_minutes: 20160,
  min_length: 8,
  require_upper: true,
  require_lower: true,
  require_digit: true,
  require_special: true,
  rotation_enabled: true,
  rotation_days: 90,
  temp_password_hours: 8,
};

let security: SecuritySettings = { ...defaultSecurity };

export function loadSecurity(): SecuritySettings {
  return { ...security };
}

export function saveSecurity(next: SecuritySettings) {
  security = { ...next };
}

export type CaptchaNoise = "low" | "medium" | "high";

export type CaptchaSettings = {
  enabled: boolean;
  length: number;
  noise: CaptchaNoise;
  lines: number;
};

export const defaultCaptcha: CaptchaSettings = {
  enabled: true,
  length: 4,
  noise: "medium",
  lines: 2,
};

let captcha: CaptchaSettings = { ...defaultCaptcha };

export function loadCaptchaSettings(): CaptchaSettings {
  return { ...captcha };
}

export function saveCaptchaSettings(next: CaptchaSettings) {
  captcha = { ...next };
}

const REFRESH_KEY = "demo-list-refresh";

export type RefreshSettings = { enabled: boolean; intervalSec: number };

export const defaultRefresh: RefreshSettings = { enabled: true, intervalSec: 60 };

export function loadRefresh(): RefreshSettings {
  try {
    const raw = localStorage.getItem(REFRESH_KEY);
    if (!raw) return { ...defaultRefresh };
    const parsed = JSON.parse(raw) as Partial<RefreshSettings>;
    const interval = Number(parsed.intervalSec);
    return {
      enabled: parsed.enabled !== false,
      intervalSec: Number.isFinite(interval) ? Math.min(300, Math.max(3, Math.round(interval))) : defaultRefresh.intervalSec,
    };
  } catch {
    return { ...defaultRefresh };
  }
}

export function saveRefresh(next: RefreshSettings) {
  localStorage.setItem(REFRESH_KEY, JSON.stringify(next));
}

const MOTION_KEY = "demo-motion-delay";
const CARD_GAP_KEY = "demo-motion-card-gap";

/** chartDelayMs：图表进场延迟（0–2000，缺省 100）；cardGapMs：卡片依次进场间隔（0–200，缺省 70，0 = 不排队） */
export type MotionSettings = { chartDelayMs: number; cardGapMs: number };

export const defaultMotion: MotionSettings = { chartDelayMs: 100, cardGapMs: 70 };

function readNumber(key: string, fallback: number, min: number, max: number) {
  try {
    const raw = localStorage.getItem(key);
    if (raw == null || raw === "") return fallback;
    const parsed = Number(raw);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.min(max, Math.max(min, Math.round(parsed)));
  } catch {
    return fallback;
  }
}

export function loadMotion(): MotionSettings {
  return {
    chartDelayMs: readNumber(MOTION_KEY, defaultMotion.chartDelayMs, 0, 2000),
    cardGapMs: readNumber(CARD_GAP_KEY, defaultMotion.cardGapMs, 0, 200),
  };
}

export function saveMotion(next: MotionSettings) {
  localStorage.setItem(MOTION_KEY, String(next.chartDelayMs));
  localStorage.setItem(CARD_GAP_KEY, String(next.cardGapMs));
}

export type PublishStatus = {
  hint: string | null;
  updatedAt: string | null;
  envConfigured: boolean;
};

const emptyPublish: PublishStatus = { hint: null, updatedAt: null, envConfigured: false };

let publish: PublishStatus = { ...emptyPublish };

export function loadPublish(): PublishStatus {
  return { ...publish };
}

export function issuePublishToken(): { token: string; status: PublishStatus } {
  const token = `pub_${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2, 8)}`;
  publish = { hint: token.slice(-4), updatedAt: new Date().toISOString(), envConfigured: false };
  return { token, status: { ...publish } };
}

export function revokePublish(): PublishStatus {
  publish = { ...emptyPublish };
  return { ...publish };
}
