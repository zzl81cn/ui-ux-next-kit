export type MenuType = "dir" | "menu" | "link";
export type MenuRole = "viewer" | "operator" | "developer" | "admin";

export type MenuNode = {
  id: string;
  key: string;
  name: string;
  type: MenuType;
  path: string;
  icon: string;
  sort: number;
  enabled: boolean;
  visible: boolean;
  builtin: boolean;
  minRole: MenuRole;
  badge: string;
  redirect: string;
  children?: MenuNode[];
};

export const MENU_PAGES = [
  { path: "/stats", label: "数据统计" },
  { path: "/jobs", label: "执行记录" },
  { path: "/system/settings", label: "系统配置" },
  { path: "/system/menus", label: "菜单管理" },
  { path: "/settings/users", label: "用户管理" },
  { path: "/settings/roles", label: "角色管理" },
  { path: "/settings/permissions", label: "权限管理" },
  { path: "/settings/departments", label: "部门管理" },
  { path: "/logs/system", label: "系统日志" },
  { path: "/account/settings", label: "个人设置" },
];

function node(
  partial: Omit<MenuNode, "enabled" | "visible" | "builtin" | "minRole" | "badge" | "redirect" | "children"> &
    Partial<Pick<MenuNode, "enabled" | "visible" | "builtin" | "minRole" | "badge" | "redirect" | "children">>,
): MenuNode {
  return {
    enabled: true,
    visible: true,
    builtin: true,
    minRole: "viewer",
    badge: "",
    redirect: "",
    ...partial,
  };
}

function seed(): MenuNode[] {
  return [
    node({ id: "stats", key: "stats", name: "数据统计", type: "menu", path: "/stats", icon: "dashboard", sort: 10 }),
    node({ id: "jobs", key: "jobs", name: "执行记录", type: "menu", path: "/jobs", icon: "history", sort: 20 }),
    node({
      id: "system",
      key: "system",
      name: "系统设置",
      type: "dir",
      path: "/system",
      icon: "setting",
      sort: 30,
      children: [
        node({ id: "system-settings", key: "system.settings", name: "系统配置", type: "menu", path: "/system/settings", icon: "skin", sort: 10 }),
        node({
          id: "system-menus",
          key: "system.menus",
          name: "菜单管理",
          type: "menu",
          path: "/system/menus",
          icon: "menu",
          sort: 20,
          minRole: "admin",
        }),
        node({ id: "users", key: "users", name: "用户管理", type: "menu", path: "/settings/users", icon: "team", sort: 30 }),
        node({ id: "roles", key: "roles", name: "角色管理", type: "menu", path: "/settings/roles", icon: "idcard", sort: 40 }),
        node({ id: "permissions", key: "permissions", name: "权限管理", type: "menu", path: "/settings/permissions", icon: "safety", sort: 50 }),
        node({ id: "departments", key: "departments", name: "部门管理", type: "menu", path: "/settings/departments", icon: "apartment", sort: 60 }),
      ],
    }),
    node({
      id: "logs",
      key: "logs",
      name: "日志管理",
      type: "dir",
      path: "/logs",
      icon: "file-search",
      sort: 40,
      children: [
        node({ id: "logs-system", key: "logs.system", name: "系统日志", type: "menu", path: "/logs/system", icon: "audit", sort: 10 }),
      ],
    }),
  ];
}

let tree = seed();
const listeners = new Set<() => void>();

function commit(next: MenuNode[]) {
  tree = next;
  listeners.forEach((listener) => listener());
}

export function getMenuTree() {
  return tree;
}

export function subscribeMenus(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function countMenus(nodes: MenuNode[]): number {
  return nodes.reduce((sum, item) => sum + 1 + countMenus(item.children ?? []), 0);
}

export function sortMenus(nodes: MenuNode[]): MenuNode[] {
  return [...nodes]
    .sort((a, b) => a.sort - b.sort || a.name.localeCompare(b.name, "zh"))
    .map((item) => ({ ...item, children: item.children ? sortMenus(item.children) : undefined }));
}

function mapTree(nodes: MenuNode[], id: string, update: (node: MenuNode) => MenuNode): MenuNode[] {
  return nodes.map((item) => {
    if (item.id === id) return update(item);
    if (!item.children) return item;
    return { ...item, children: mapTree(item.children, id, update) };
  });
}

function removeFrom(nodes: MenuNode[], id: string): MenuNode[] {
  return nodes
    .filter((item) => item.id !== id)
    .map((item) => ({ ...item, children: item.children ? removeFrom(item.children, id) : undefined }));
}

export function findMenu(nodes: MenuNode[], id: string): MenuNode | null {
  for (const item of nodes) {
    if (item.id === id) return item;
    if (item.children) {
      const hit = findMenu(item.children, id);
      if (hit) return hit;
    }
  }
  return null;
}

export function descendantIds(nodes: MenuNode[], id: string): Set<string> {
  const node = findMenu(nodes, id);
  const ids = new Set<string>();
  const walk = (item: MenuNode) => {
    ids.add(item.id);
    item.children?.forEach(walk);
  };
  if (node) walk(node);
  return ids;
}

export function patchMenu(id: string, patch: Partial<MenuNode>) {
  commit(mapTree(tree, id, (item) => ({ ...item, ...patch, children: item.children })));
}

export function removeMenu(id: string) {
  commit(removeFrom(tree, id));
}

export function insertMenu(parentId: string | null, item: MenuNode) {
  if (!parentId) {
    commit(sortMenus([...tree, item]));
    return;
  }
  commit(
    mapTree(tree, parentId, (node) => ({
      ...node,
      children: sortMenus([...(node.children ?? []), item]),
    })),
  );
}

export function parentOptions(exclude: Set<string>) {
  const options: { value: string; label: string }[] = [{ value: "", label: "顶级" }];
  const walk = (nodes: MenuNode[], prefix: string) => {
    for (const item of sortMenus(nodes)) {
      if (item.type === "link" || exclude.has(item.id)) continue;
      const label = prefix ? `${prefix} / ${item.name}` : item.name;
      options.push({ value: item.id, label });
      if (item.children) walk(item.children, label);
    }
  };
  walk(tree, "");
  return options;
}

export type MenuQuery = { name: string; status: string; visible: string };

export function filterMenus(nodes: MenuNode[], query: MenuQuery): MenuNode[] {
  const name = query.name.trim().toLowerCase();
  const out: MenuNode[] = [];
  for (const item of sortMenus(nodes)) {
    const children = item.children ? filterMenus(item.children, query) : [];
    const self =
      (!name || item.name.toLowerCase().includes(name)) &&
      (!query.status || (query.status === "on") === item.enabled) &&
      (!query.visible || (query.visible === "show") === item.visible);
    if (self || children.length) {
      out.push({ ...item, children: children.length ? children : undefined });
    }
  }
  return out;
}

export function parentIds(nodes: MenuNode[]): string[] {
  const ids: string[] = [];
  const walk = (list: MenuNode[]) => {
    for (const item of list) {
      if (item.children?.length) {
        ids.push(item.id);
        walk(item.children);
      }
    }
  };
  walk(nodes);
  return ids;
}

export function visibleMenus(nodes: MenuNode[]): MenuNode[] {
  return sortMenus(nodes)
    .filter((item) => item.enabled && item.visible)
    .map((item) => ({ ...item, children: item.children ? visibleMenus(item.children) : undefined }))
    .filter((item) => item.type !== "dir" || (item.children?.length ?? 0) > 0);
}
