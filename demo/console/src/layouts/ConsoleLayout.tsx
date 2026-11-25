import {
  ApartmentOutlined,
  AuditOutlined,
  BellOutlined,
  DashboardOutlined,
  DesktopOutlined,
  DownOutlined,
  FileSearchOutlined,
  HistoryOutlined,
  IdcardOutlined,
  LockOutlined,
  LogoutOutlined,
  MenuOutlined,
  MoonOutlined,
  SafetyOutlined,
  SettingOutlined,
  SkinOutlined,
  SunOutlined,
  TeamOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { ProLayout } from "@ant-design/pro-components";
import { Avatar, Breadcrumb, Drawer, Dropdown, Radio, Tag, Tooltip } from "antd";
import { useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { PRODUCT_LOGO } from "../brand";
import { clearSession } from "../lib/session";
import { brandTitle, headerLogoSrc, useSiteBrand } from "../lib/siteBrand";
import { getMenuTree, subscribeMenus, visibleMenus, type MenuNode } from "../mock/menus";
import { useThemeMode, type ThemeMode } from "../theme/ThemeRoot";
import { OPEN_LAYOUT_SETTINGS_EVENT } from "./layoutSettingsEvent";
import { usePageSlideDirection } from "./pageMotion";

const ICONS: Record<string, ReactNode> = {
  dashboard: <DashboardOutlined />,
  history: <HistoryOutlined />,
  setting: <SettingOutlined />,
  skin: <SkinOutlined />,
  menu: <MenuOutlined />,
  team: <TeamOutlined />,
  idcard: <IdcardOutlined />,
  safety: <SafetyOutlined />,
  apartment: <ApartmentOutlined />,
  "file-search": <FileSearchOutlined />,
  audit: <AuditOutlined />,
};

const LOCKED = new Set([
  "/jobs",
  "/system/menus",
  "/system/settings",
  "/settings/users",
  "/settings/roles",
  "/settings/permissions",
  "/settings/departments",
  "/logs/system",
]);

function toRoutes(nodes: MenuNode[]): { path: string; name: string; icon?: ReactNode; routes?: { path: string; name: string; icon?: ReactNode }[] }[] {
  return nodes.map((item) => ({
    path: item.redirect || item.path,
    name: item.name,
    icon: ICONS[item.icon],
    routes: item.children?.length ? toRoutes(item.children) : undefined,
  }));
}

function crumbsFor(pathname: string, nodes: MenuNode[], trail: { path: string; name: string }[] = []): { path: string; name: string }[] | null {
  for (const item of nodes) {
    const next = [...trail, { path: item.path, name: item.name }];
    if (item.path === pathname) return next;
    if (item.children) {
      const hit = crumbsFor(pathname, item.children, next);
      if (hit) return hit;
    }
  }
  return null;
}

function useNarrow() {
  return useSyncExternalStore(
    (onChange) => {
      const media = window.matchMedia("(max-width: 767.98px)");
      media.addEventListener("change", onChange);
      return () => media.removeEventListener("change", onChange);
    },
    () => window.matchMedia("(max-width: 767.98px)").matches,
    () => false,
  );
}

function HeaderLogo({ src, fallback, mobile }: { src: string | null; fallback: string | null; mobile: boolean }) {
  const [step, setStep] = useState<"src" | "fallback" | "mark">("src");
  useEffect(() => setStep("src"), [src, fallback]);
  const shown = step === "src" ? src : step === "fallback" ? fallback : null;
  const mark = shown ?? PRODUCT_LOGO;
  return (
    <img
      src={mark}
      alt=""
      style={{ height: mobile ? 26 : 28, maxWidth: mobile ? 120 : undefined, width: "auto", display: "block" }}
      onError={() => setStep(step === "src" && fallback && fallback !== src ? "fallback" : "mark")}
    />
  );
}

const THEME_OPTIONS: { value: ThemeMode; label: string; icon: ReactNode }[] = [
  { value: "light", label: "浅色", icon: <SunOutlined /> },
  { value: "dark", label: "深色", icon: <MoonOutlined /> },
  { value: "system", label: "跟随系统", icon: <DesktopOutlined /> },
];

export function ConsoleLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { mode, setMode, dark } = useThemeMode();
  const brand = useSiteBrand();
  const mobile = useNarrow();
  const [layoutOpen, setLayoutOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  useEffect(() => {
    const open = () => setLayoutOpen(true);
    window.addEventListener(OPEN_LAYOUT_SETTINGS_EVENT, open);
    return () => window.removeEventListener(OPEN_LAYOUT_SETTINGS_EVENT, open);
  }, []);
  useEffect(() => {
    const due = sessionStorage.getItem("demo-password-due");
    if ((due === "expired" || due === "reset") && location.pathname !== "/account/settings") {
      navigate("/account/settings", { replace: true });
    }
  }, [location.pathname, navigate]);
  useEffect(() => {
    if (!mobile) setAccountOpen(false);
  }, [mobile]);
  const menus = useSyncExternalStore(subscribeMenus, getMenuTree);
  const pageMotion = usePageSlideDirection(location.pathname, menus);
  const routes = toRoutes(visibleMenus(menus));
  const locked = LOCKED.has(location.pathname);
  const settings = location.pathname === "/system/settings";
  const current = THEME_OPTIONS.find((item) => item.value === mode) ?? THEME_OPTIONS[2];
  const TriggerIcon = mode === "system" ? SkinOutlined : mode === "dark" ? MoonOutlined : SunOutlined;
  const crumbs =
    crumbsFor(location.pathname, menus) ??
    (location.pathname === "/account/settings"
      ? [{ path: "/account/settings", name: "个人设置" }]
      : location.pathname === "/workers"
        ? [{ path: "/workers", name: "执行机" }]
        : [{ path: location.pathname, name: "未登记" }]);
  const title = brandTitle(brand);

  return (
    <>
    <ProLayout
      title={title}
      logo={<HeaderLogo src={headerLogoSrc(brand, dark, mobile)} fallback={brand.logo_url} mobile={mobile} />}
      headerTitleRender={(logo, heading) => (
        <div className="console-brand-lockup">
          {logo}
          {heading}
          {brand.site_tag ? <span className="console-brand-tag">{brand.site_tag}</span> : null}
        </div>
      )}
      layout="mix"
      navTheme={dark ? "realDark" : "light"}
      siderWidth={220}
      defaultCollapsed={false}
      disableMobile
      breakpoint={false}
      theme="light"
      fixSiderbar
      fixedHeader
      footerRender={false}
      location={{ pathname: location.pathname }}
      route={{ path: "/", routes }}
      menuItemRender={(item, dom) => {
        const path = item.path === "/jobs" ? "/jobs?record=api" : item.path || "/stats";
        if (/^https?:/i.test(path)) {
          return (
            <a href={path} target="_blank" rel="noreferrer">
              {dom}
            </a>
          );
        }
        return <Link to={path}>{dom}</Link>;
      }}
      subMenuItemRender={(item, dom) => <Link to={item.path || "/stats"}>{dom}</Link>}
      token={{
        bgLayout: dark ? "#000" : "#f5f5f5",
        header: {
          colorBgHeader: dark ? "rgba(31, 31, 31, 0.6)" : "#fff",
          colorBgScrollHeader: dark ? "rgba(31, 31, 31, 0.6)" : "#fff",
        },
        sider: dark
          ? {
              colorMenuBackground: "transparent",
              colorTextMenu: "rgba(255, 255, 255, 0.65)",
              colorTextMenuSelected: "#fff",
              colorBgMenuItemSelected: "#3b82f6",
              colorBgMenuItemHover: "rgba(255, 255, 255, 0.04)",
            }
          : {
              colorMenuBackground: "#fff",
              colorTextMenu: "rgba(0, 0, 0, 0.75)",
              colorTextMenuSelected: "#fff",
              colorBgMenuItemSelected: "#3b82f6",
            },
      }}
      actionsRender={() => {
        const bell = (
          <span key="bell" className="console-theme-toggle" role="img" aria-label="消息通知">
            <BellOutlined />
          </span>
        );
        if (mobile) return [bell];
        return [
          bell,
          <Dropdown
            key="theme"
            trigger={["click"]}
            placement="bottomRight"
            menu={{
              selectable: true,
              selectedKeys: [mode],
              items: THEME_OPTIONS.map((item) => ({
                key: item.value,
                icon: item.icon,
                label: item.label,
                extra: mode === item.value ? "✓" : undefined,
              })),
              onClick: ({ key }) => {
                if (key === "light" || key === "dark" || key === "system") setMode(key);
              },
            }}
          >
            <Tooltip title="主题设置">
              <span className="console-theme-toggle" role="button" aria-label={`主题：${current.label}`} tabIndex={0}>
                <TriggerIcon />
              </span>
            </Tooltip>
          </Dropdown>,
        ];
      }}
      avatarProps={{
        render: () =>
          mobile ? (
            <button type="button" className="console-account-btn" aria-label="账号" onClick={() => setAccountOpen(true)}>
              <Avatar size={28} icon={<UserOutlined />} className="console-user-trigger__avatar" />
              <MenuOutlined className="console-account-btn__icon" />
            </button>
          ) : (
          <Dropdown
            trigger={["click"]}
            placement="bottomRight"
            menu={{
              items: [
                { key: "who", icon: <UserOutlined />, label: "demo（demo）", disabled: true },
                { key: "account", icon: <SettingOutlined />, label: "个人设置" },
                { key: "password", icon: <LockOutlined />, label: "修改密码" },
                { type: "divider" },
                { key: "out", icon: <LogoutOutlined />, label: "退出登录" },
              ],
              onClick: ({ key }) => {
                if (key === "account") {
                  navigate("/account/settings");
                  return;
                }
                if (key === "password") {
                  navigate("/account/settings?open=password");
                  return;
                }
                if (key !== "out") return;
                clearSession();
                navigate("/login", { replace: true });
              },
            }}
          >
            <div className="console-user-trigger" role="button" tabIndex={0}>
              <Avatar size={28} icon={<UserOutlined />} className="console-user-trigger__avatar" />
              <span className="console-user-trigger__name">demo</span>
              <Tag className="console-user-trigger__role">管理员</Tag>
              <DownOutlined className="console-user-trigger__arrow" />
            </div>
          </Dropdown>
          ),
      }}
      contentStyle={{ display: "flex", flexDirection: "column", minHeight: 0, padding: 0 }}
    >
      <div className={["console-main-content", locked ? "is-lock" : "", settings ? "is-settings" : ""].filter(Boolean).join(" ")}>
        <Breadcrumb
          className="console-breadcrumb"
          items={crumbs.map((item, index) => ({
            title: index === crumbs.length - 1 ? item.name : <Link to={item.path}>{item.name}</Link>,
          }))}
        />
        <div className="console-page-stage">
          <div key={pageMotion.key} className={`console-page-motion is-${pageMotion.direction}`}>
            <Outlet />
          </div>
        </div>
      </div>
    </ProLayout>
      <Drawer
        rootClassName="console-account-menu"
        placement="right"
        open={mobile && accountOpen}
        onClose={() => setAccountOpen(false)}
        closable={false}
        title={null}
        styles={{ wrapper: { width: "min(80vw, 300px)" } }}
      >
        <div className="console-account-menu__name">demo</div>
        <div className="console-account-menu__role">管理员</div>
        <div className="console-account-menu__themes" role="group" aria-label="主题">
          {THEME_OPTIONS.map((item) => (
            <button
              key={item.value}
              type="button"
              className={mode === item.value ? "is-on" : ""}
              onClick={() => {
                setMode(item.value);
                setAccountOpen(false);
              }}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => {
            setAccountOpen(false);
            navigate("/account/settings");
          }}
        >
          个人设置
        </button>
        <button
          type="button"
          onClick={() => {
            setAccountOpen(false);
            navigate("/account/settings?open=password");
          }}
        >
          修改密码
        </button>
        <button
          type="button"
          onClick={() => {
            setAccountOpen(false);
            clearSession();
            navigate("/login", { replace: true });
          }}
        >
          退出登录
        </button>
      </Drawer>
      <Drawer title="主题与布局" open={layoutOpen} onClose={() => setLayoutOpen(false)} size={360}>
        <p>布局保持「混合」。侧栏不拆，顶栏保持固定。</p>
        <Radio.Group
          value={mode}
          onChange={(event) => setMode(event.target.value)}
          options={THEME_OPTIONS.map((item) => ({ value: item.value, label: item.label }))}
        />
      </Drawer>
    </>
  );
}
