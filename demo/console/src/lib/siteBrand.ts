import { useEffect, useSyncExternalStore } from "react";
import { PRODUCT_NAME } from "../brand";

/** 登录页和顶栏共用的一份品牌。入口是系统配置「品牌标识」。 */

export type BrandSlot = "logo" | "logo_dark" | "logo_collapsed" | "favicon";

export type Brand = {
  logo_url: string | null;
  logo_dark_url: string | null;
  logo_collapsed_url: string | null;
  favicon_url: string | null;
  site_name: string;
  site_tag: string;
  logo_alt: string;
};

const EMPTY_BRAND: Brand = {
  logo_url: null,
  logo_dark_url: null,
  logo_collapsed_url: null,
  favicon_url: null,
  site_name: "",
  site_tag: "",
  logo_alt: "",
};

let brand: Brand = { ...EMPTY_BRAND };
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

export function getBrand(): Brand {
  return brand;
}

export function subscribeBrand(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function saveBrandText(next: Pick<Brand, "site_name" | "site_tag" | "logo_alt">) {
  brand = { ...brand, ...next };
  emit();
}

export function saveBrandSlot(slot: BrandSlot, url: string | null) {
  const key = slot === "logo" ? "logo_url" : slot === "logo_dark" ? "logo_dark_url" : slot === "logo_collapsed" ? "logo_collapsed_url" : "favicon_url";
  brand = { ...brand, [key]: url };
  emit();
}

export function brandTitle(value: Brand = brand) {
  return value.site_name || PRODUCT_NAME;
}

export function documentTitle(value: Brand = brand) {
  return value.logo_alt || value.site_name || PRODUCT_NAME;
}

/** 深色且没单独上传深色 Logo 时，只把 SVG 里的深色字转成浅色。位图转不了。 */
export function svgForDark(dataUrl: string | null): string | null {
  if (!dataUrl?.startsWith("data:image/svg+xml")) return null;
  const comma = dataUrl.indexOf(",");
  if (comma < 0) return null;
  const meta = dataUrl.slice(5, comma);
  const payload = dataUrl.slice(comma + 1);
  let text = "";
  try {
    text = meta.includes("base64") ? decodeBase64(payload) : decodeURIComponent(payload);
  } catch {
    return null;
  }
  const head = text.slice(0, 256).trim().toLowerCase();
  if (!(head.startsWith("<svg") || (head.startsWith("<?xml") && head.includes("<svg")))) return null;
  const next = lightenDarkSvg(text);
  if (!next) return null;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(next)}`;
}

export function headerLogoSrc(value: Brand, dark: boolean, mobile = false): string | null {
  if (!dark) return value.logo_url;
  if (value.logo_dark_url) return value.logo_dark_url;
  if (mobile) return value.logo_url;
  return svgForDark(value.logo_url) || value.logo_url;
}

export function useSiteBrand() {
  const current = useSyncExternalStore(subscribeBrand, getBrand);
  useEffect(() => {
    document.title = documentTitle(current);
    const href = current.favicon_url;
    let link = document.querySelector<HTMLLinkElement>("link[data-console-favicon]");
    if (!href) {
      link?.remove();
      return;
    }
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      link.dataset.consoleFavicon = "1";
      document.head.appendChild(link);
    }
    link.href = href;
  }, [current]);
  return current;
}

function decodeBase64(payload: string) {
  const bytes = Uint8Array.from(atob(payload), (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function lightenDarkSvg(src: string) {
  let out = "";
  let changed = false;
  for (const [before, color] of splitSvgColors(src)) {
    out += before;
    if (color && isDarkNeutral(color)) {
      out += "#F2F3F5";
      changed = true;
    } else {
      out += color;
    }
  }
  return changed ? out : null;
}

function splitSvgColors(src: string): Array<[string, string]> {
  const props = ["stop-color", "fill", "stroke", "color"];
  const out: Array<[string, string]> = [];
  let rest = src;
  while (rest) {
    let pos = -1;
    let prop = "";
    for (const item of props) {
      const index = rest.indexOf(item);
      if (index >= 0 && (pos < 0 || index < pos || (index === pos && item.length > prop.length))) {
        pos = index;
        prop = item;
      }
    }
    if (pos < 0) {
      out.push([rest, ""]);
      break;
    }
    const after = rest.slice(pos + prop.length);
    if (!(after.startsWith('="') || after.startsWith("='"))) {
      const skip = pos + prop.length;
      out.push([rest.slice(0, skip), ""]);
      rest = rest.slice(skip);
      continue;
    }
    const value = after.slice(2);
    const end = value.search(/["'; ]/);
    const stop = end < 0 ? value.length : end;
    out.push([rest.slice(0, pos + prop.length + 2), value.slice(0, stop)]);
    rest = value.slice(stop);
  }
  return out;
}

function isDarkNeutral(value: string) {
  const color = value.trim().toLowerCase();
  if (color === "black") return true;
  if (!color.startsWith("#")) return false;
  const hex = color.slice(1);
  const full = hex.length === 3 ? hex.split("").map((char) => char + char).join("") : hex;
  if (full.length !== 6 || /[^0-9a-f]/.test(full)) return false;
  const n = Number.parseInt(full, 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  return max < 140 && max - min < 40;
}
