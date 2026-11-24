const KEY = "demo-console-session";

export function hasSession() {
  return sessionStorage.getItem(KEY) === "1";
}

export function saveSession() {
  sessionStorage.setItem(KEY, "1");
}

export function clearSession() {
  sessionStorage.removeItem(KEY);
}
