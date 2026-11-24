export const OPEN_LAYOUT_SETTINGS_EVENT = "console:open-layout-settings";

export function openLayoutSettings() {
  window.dispatchEvent(new Event(OPEN_LAYOUT_SETTINGS_EVENT));
}
