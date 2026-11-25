import { ProConfigProvider } from "@ant-design/pro-components";
import { App, ConfigProvider, theme } from "antd";
import zhCN from "antd/locale/zh_CN";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

const FONT = '"IBM Plex Sans", "Noto Sans SC", system-ui, sans-serif';
const THEME_KEY = "demo-console-theme";
const BRAND_BLUE = "#3b82f6";

const lockPrimary: typeof theme.darkAlgorithm = (seed, mapped) =>
  ({
    ...(mapped ?? seed),
    colorPrimary: BRAND_BLUE,
    colorInfo: BRAND_BLUE,
    colorLink: BRAND_BLUE,
  }) as ReturnType<typeof theme.darkAlgorithm>;

export type ThemeMode = "light" | "dark" | "system";

function readMode(): ThemeMode {
  const saved = localStorage.getItem(THEME_KEY);
  if (saved === "light" || saved === "dark" || saved === "system") return saved;
  return "system";
}

const ThemeState = createContext<{
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  dark: boolean;
}>({
  mode: "system",
  setMode: () => undefined,
  dark: false,
});

function systemDark() {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function ThemeRoot({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(readMode);
  const [system, setSystem] = useState(systemDark);
  const dark = mode === "dark" || (mode === "system" && system);

  function setMode(next: ThemeMode) {
    setModeState(next);
    localStorage.setItem(THEME_KEY, next);
  }

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => setSystem(media.matches);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.consoleTheme = dark ? "dark" : "light";
    root.style.colorScheme = dark ? "dark" : "light";
  }, [dark]);

  const value = useMemo(() => ({ mode, setMode, dark }), [mode, dark]);

  return (
    <ThemeState.Provider value={value}>
      <ConfigProvider
        locale={zhCN}
        theme={{
          algorithm: dark ? [theme.darkAlgorithm, lockPrimary] : [theme.defaultAlgorithm, lockPrimary],
          token: {
            colorPrimary: BRAND_BLUE,
            colorInfo: BRAND_BLUE,
            colorLink: BRAND_BLUE,
            borderRadius: 6,
            fontFamily: FONT,
            colorBgLayout: dark ? "#000" : "#f5f5f5",
            colorBgContainer: dark ? "#141414" : "#ffffff",
            colorBgElevated: dark ? "#1f1f1f" : "#ffffff",
            colorText: dark ? "rgba(255, 255, 255, 0.85)" : "rgba(0, 0, 0, 0.88)",
            colorTextSecondary: dark ? "rgba(255, 255, 255, 0.45)" : "rgba(0, 0, 0, 0.45)",
            colorBorder: dark ? "#424242" : "#d9d9d9",
            colorBorderSecondary: dark ? "#303030" : "#f0f0f0",
          },
          components: {
            Menu: dark
              ? {
                  darkItemBg: "transparent",
                  darkSubMenuItemBg: "transparent",
                  darkItemColor: "rgba(255, 255, 255, 0.65)",
                  darkItemHoverColor: "rgba(255, 255, 255, 0.95)",
                  darkItemSelectedColor: "#fff",
                  darkItemSelectedBg: BRAND_BLUE,
                  itemColor: "rgba(255, 255, 255, 0.65)",
                  itemSelectedColor: "#fff",
                  itemSelectedBg: BRAND_BLUE,
                  itemHeight: 40,
                  iconMarginInlineEnd: 8,
                }
              : {
                  itemColor: "rgba(0, 0, 0, 0.75)",
                  itemSelectedColor: "#fff",
                  itemSelectedBg: BRAND_BLUE,
                  itemHeight: 40,
                  iconMarginInlineEnd: 8,
                },
          },
        }}
      >
        <ProConfigProvider dark={dark}>
          <App>{children}</App>
        </ProConfigProvider>
      </ConfigProvider>
    </ThemeState.Provider>
  );
}

export function useThemeMode() {
  return useContext(ThemeState);
}
