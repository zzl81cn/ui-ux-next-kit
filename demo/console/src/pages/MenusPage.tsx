import { PageHelpTip } from "../components/PageHelpTip";
import {
  ApartmentOutlined,
  AuditOutlined,
  DashboardOutlined,
  FileSearchOutlined,
  HistoryOutlined,
  IdcardOutlined,
  MenuOutlined,
  PlusOutlined,
  ReloadOutlined,
  SafetyOutlined,
  SettingOutlined,
  SkinOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import { ProTable, type ProColumns } from "@ant-design/pro-components";
import { Button, Drawer, Form, Input, InputNumber, Modal, Radio, Select, Space, Switch, Tag, Typography, message } from "antd";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { DashFilterField, DashFilterPanel, FilterInput, FilterSelect } from "../components/DashFilterPanel";
import { useTableScrollY } from "../hooks/useTableScrollY";
import { useTableDensity } from "../lib/tableDensity";
import {
  MENU_PAGES,
  countMenus,
  descendantIds,
  filterMenus,
  getMenuTree,
  insertMenu,
  parentIds,
  parentOptions,
  patchMenu,
  removeMenu,
  subscribeMenus,
  type MenuNode,
  type MenuQuery,
  type MenuRole,
  type MenuType,
} from "../mock/menus";

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

const TYPE_LABEL: Record<MenuType, string> = { dir: "目录", menu: "菜单", link: "链接" };
const ROLE_LABEL: Record<MenuRole, string> = { viewer: "查看者", operator: "运维", developer: "开发者", admin: "管理员" };
const EMPTY: MenuQuery = { name: "", status: "", visible: "" };

type Editor = { mode: "create" | "edit"; parentId: string | null; current: MenuNode | null };

function blank(type: MenuType): MenuNode {
  return {
    id: `menu-${Date.now()}`,
    key: `custom.${Date.now()}`,
    name: "",
    type,
    path: "",
    icon: type === "link" ? "audit" : "menu",
    sort: 10,
    enabled: true,
    visible: true,
    builtin: false,
    minRole: "viewer",
    badge: "",
    redirect: "",
    children: type === "dir" ? [] : undefined,
  };
}

export function MenusPage() {
  const tree = useSyncTree();
  const [draft, setDraft] = useState(EMPTY);
  const [applied, setApplied] = useState(EMPTY);
  const [expanded, setExpanded] = useState<string[]>(() => parentIds(getMenuTree()));
  const [editor, setEditor] = useState<Editor | null>(null);
  const [pending, setPending] = useState("");
  const { ref, scrollY } = useTableScrollY();
  const density = useTableDensity();
  const view = useMemo(() => filterMenus(tree, applied), [tree, applied]);

  useEffect(() => {
    setExpanded(parentIds(filterMenus(getMenuTree(), applied)));
  }, [applied]);

  function toggle(row: MenuNode, field: "enabled" | "visible", value: boolean) {
    if (row.path === "/system/menus") return;
    setPending(`${row.id}:${field}`);
    window.setTimeout(() => {
      patchMenu(row.id, { [field]: value });
      setPending("");
      message.success(field === "enabled" ? (value ? "已启用" : "已停用") : value ? "已显示" : "已隐藏");
    }, 200);
  }

  function askDelete(row: MenuNode) {
    if (row.children?.length) {
      message.warning("请先删除或移走子菜单");
      return;
    }
  }

  const columns: ProColumns<MenuNode>[] = [
    {
      title: "菜单名称",
      dataIndex: "name",
      width: 180,
      fixed: "left",
      render: (_, row) => (
        <Space size={8}>
          <b>{row.name}</b>
          {row.builtin ? <Tag color="blue">内置</Tag> : null}
        </Space>
      ),
    },
    { title: "类型", width: 88, render: (_, row) => <Tag>{TYPE_LABEL[row.type]}</Tag> },
    { title: "图标", width: 72, render: (_, row) => ICONS[row.icon] ?? "—" },
    { title: "路由", dataIndex: "path", width: 320, ellipsis: true, render: (_, row) => row.path || "—" },
    {
      title: "状态",
      width: 96,
      render: (_, row) => (
        <span onClick={(event) => event.stopPropagation()}>
          <Switch
            checked={row.enabled}
            checkedChildren="启用"
            unCheckedChildren="停用"
            disabled={row.path === "/system/menus"}
            loading={pending === `${row.id}:enabled`}
            onChange={(value) => toggle(row, "enabled", value)}
          />
        </span>
      ),
    },
    {
      title: "显示",
      width: 96,
      render: (_, row) => (
        <span onClick={(event) => event.stopPropagation()}>
          <Switch
            checked={row.visible}
            checkedChildren="显示"
            unCheckedChildren="隐藏"
            disabled={row.path === "/system/menus"}
            loading={pending === `${row.id}:visible`}
            onChange={(value) => toggle(row, "visible", value)}
          />
        </span>
      ),
    },
    {
      title: "操作",
      width: 168,
      fixed: "right",
      render: (_, row) => (
        <Space size={16} className="console-row-actions" onClick={(event) => event.stopPropagation()}>
          {row.type !== "link" ? (
            <Typography.Link
              onClick={() =>
                setEditor({
                  mode: "create",
                  parentId: row.id,
                  current: blank(MENU_PAGES.some((page) => !usedPaths(tree, "").has(page.path)) ? "menu" : "link"),
                })
              }
            >
              新增
            </Typography.Link>
          ) : null}
          <Typography.Link onClick={() => setEditor({ mode: "edit", parentId: null, current: row })}>编辑</Typography.Link>
          {row.path !== "/system/menus" && !row.builtin ? (
            <Typography.Link
              style={{ color: "var(--ant-color-error)" }}
              onClick={() => {
                askDelete(row);
                if (row.children?.length) return;
                Modal.confirm({
                  title: "删除菜单",
                  content: `删除「${row.name}」？`,
                  okText: "删除",
                  okButtonProps: { danger: true },
                  onOk: () => {
                    removeMenu(row.id);
                    message.success("已删除");
                  },
                });
              }}
            >
              删除
            </Typography.Link>
          ) : null}
        </Space>
      ),
    },
  ];

  return (
    <div className="console-executions-pane" ref={ref}>
      <Typography.Paragraph type="secondary" style={{ margin: 0 }}>
        目录、页面和链接。内置页面的路由不能改。
      </Typography.Paragraph>
      <DashFilterPanel
        hint="按名称、启用状态、侧栏显示筛选；有界树表，不分页"
        onSearch={() => setApplied(draft)}
        onReset={() => {
          setDraft(EMPTY);
          setApplied(EMPTY);
        }}
      >
        <DashFilterField label="菜单名称">
          <FilterInput placeholder="菜单名称" value={draft.name} onChange={(event) => setDraft((prev) => ({ ...prev, name: event.target.value }))} onPressEnter={() => setApplied(draft)} />
        </DashFilterField>
        <DashFilterField label="状态">
          <FilterSelect
            placeholder="全部状态"
            options={[
              { value: "on", label: "启用" },
              { value: "off", label: "停用" },
            ]}
            value={draft.status || undefined}
            onChange={(value) => setDraft((prev) => ({ ...prev, status: String(value ?? "") }))}
          />
        </DashFilterField>
        <DashFilterField label="显示">
          <FilterSelect
            placeholder="全部显示"
            options={[
              { value: "show", label: "显示" },
              { value: "hide", label: "隐藏" },
            ]}
            value={draft.visible || undefined}
            onChange={(value) => setDraft((prev) => ({ ...prev, visible: String(value ?? "") }))}
          />
        </DashFilterField>
      </DashFilterPanel>
      <ProTable<MenuNode>
        className="console-pro-table"
        headerTitle={
          <span style={{ display: "inline-flex", alignItems: "center" }}>
            {`菜单（${countMenus(view)}）`}
            <PageHelpTip title="菜单怎么用">
              菜单树决定侧栏显示哪些入口。目录下可以放子菜单，隐藏的菜单不在侧栏出现，但路由仍然可以访问。
            </PageHelpTip>
          </span>
        }
        rowKey="id"
        columns={columns}
        dataSource={view}
        search={false}
        cardBordered
        options={{ density: true, fullScreen: false, reload: true, setting: false }}
        size={density.size}
        onSizeChange={density.onSizeChange}
        pagination={false}
        scroll={{ x: 1068, y: scrollY }}
        expandable={{ expandedRowKeys: expanded, onExpandedRowsChange: (keys) => setExpanded(keys.map(String)) }}
        toolBarRender={() => [
          <Button key="open" onClick={() => setExpanded(parentIds(view))}>
            展开
          </Button>,
          <Button key="close" onClick={() => setExpanded([])}>
            收起
          </Button>,
          <Button key="add" type="primary" icon={<PlusOutlined />} onClick={() => setEditor({ mode: "create", parentId: null, current: blank("dir") })}>
            新建菜单
          </Button>,
          <Button key="reload" icon={<ReloadOutlined />} onClick={() => message.success("已刷新")} />,
        ]}
        locale={{
          emptyText: applied.name || applied.status || applied.visible ? "没有符合条件的菜单。清空筛选或换关键字再试。" : "还没有菜单。点「新建菜单」添加目录、页面或链接。",
        }}
      />
      <MenuDrawer editor={editor} tree={tree} onClose={() => setEditor(null)} />
    </div>
  );
}

function useSyncTree() {
  const [tree, setTree] = useState(getMenuTree);
  useEffect(() => subscribeMenus(() => setTree(getMenuTree())), []);
  return tree;
}

function usedPaths(nodes: MenuNode[], exceptId: string) {
  const paths = new Set<string>();
  const walk = (list: MenuNode[]) => {
    for (const item of list) {
      if (item.id !== exceptId && item.path) paths.add(item.path);
      if (item.children) walk(item.children);
    }
  };
  walk(nodes);
  return paths;
}

function MenuDrawer({ editor, tree, onClose }: { editor: Editor | null; tree: MenuNode[]; onClose: () => void }) {
  const current = editor?.current;
  const locked = current?.path === "/system/menus";
  const exclude = current ? descendantIds(tree, current.id) : new Set<string>();
  const [form] = Form.useForm();
  const type = Form.useWatch("type", form) as MenuType | undefined;

  useEffect(() => {
    if (!editor?.current) return;
    const row = editor.current;
    form.setFieldsValue({
      parentId: editor.mode === "create" ? editor.parentId ?? "" : "",
      name: editor.mode === "edit" ? row.name : "",
      type: row.type,
      page: row.type === "menu" ? row.path : undefined,
      link: row.type === "link" ? row.path : "",
      path: row.path,
      redirect: row.redirect,
      sort: row.sort,
      icon: row.icon,
      badge: row.badge,
      minRole: row.minRole,
      hidden: !row.visible,
      enabled: row.enabled ? "on" : "off",
      shown: row.visible ? "show" : "hide",
    });
  }, [editor, form]);

  return (
    <Drawer
      size={480}
      title={editor?.mode === "edit" ? "编辑菜单" : "新建菜单"}
      open={Boolean(editor)}
      onClose={onClose}
      destroyOnHidden
      footer={
        <div className="drawer-split-footer">
          <Button onClick={onClose}>取消</Button>
          <Button type="primary" onClick={() => form.submit()}>
            保存
          </Button>
        </div>
      }
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={(values) => {
          if (!current || !editor) return;
          if (!String(values.name ?? "").trim()) {
            message.error("请填写菜单名称");
            return;
          }
          const nextType = (editor.mode === "edit" ? current.type : values.type) as MenuType;
          const path = nextType === "menu" ? String(values.page ?? current.path) : nextType === "link" ? String(values.link ?? "").trim() : current.path || "/system";
          const enabled = locked ? true : values.enabled === "on";
          const visible = locked ? true : values.shown === "show" && !values.hidden;
          const saved: MenuNode = {
            ...current,
            name: String(values.name).trim(),
            type: nextType,
            path,
            icon: values.icon || current.icon,
            sort: Number(values.sort) || 0,
            enabled,
            visible,
            minRole: values.minRole,
            badge: String(values.badge ?? "").slice(0, 8),
            redirect: nextType === "dir" ? "" : String(values.redirect ?? "").slice(0, 200),
          };
          if (editor.mode === "edit") patchMenu(current.id, saved);
          else insertMenu(values.parentId || null, saved);
          message.success(editor.mode === "edit" ? "已保存" : "已添加菜单");
          onClose();
        }}
      >
        <Form.Item name="parentId" label="上级菜单">
          <Select options={parentOptions(exclude)} disabled={editor?.mode === "edit"} />
        </Form.Item>
        <Form.Item name="name" label="菜单名称" rules={[{ required: true, message: "请填写菜单名称" }]}>
          <Input maxLength={32} placeholder="如 菜单管理" />
        </Form.Item>
        <Form.Item name="type" label="菜单类型">
          <Radio.Group disabled={editor?.mode === "edit"} optionType="button" options={[{ value: "dir", label: "目录" }, { value: "menu", label: "菜单" }, { value: "link", label: "链接" }]} />
        </Form.Item>
        {type === "menu" ? (
          <Form.Item name="page" label="选择页面" extra={current?.builtin ? "内置页面的路由不能改" : "只能挂系统里已经有的页面"} rules={editor?.mode === "create" ? [{ required: true, message: "请选择页面" }] : undefined}>
            <Select
              disabled={editor?.mode === "edit"}
              options={MENU_PAGES.filter((page) => editor?.mode === "edit" || !usedPaths(tree, current?.id ?? "").has(page.path)).map((page) => ({
                value: page.path,
                label: page.label,
              }))}
            />
          </Form.Item>
        ) : null}
        {type === "link" ? (
          <Form.Item name="link" label="链接" extra="站内以 / 开头，外链以 http:// 或 https:// 开头" rules={[{ required: true, message: "请填写链接" }]}>
            <Input placeholder="https:// 或 /path" />
          </Form.Item>
        ) : null}
        {type === "menu" ? (
          <Form.Item name="path" label="路由">
            <Input readOnly />
          </Form.Item>
        ) : null}
        {type !== "dir" ? (
          <Form.Item name="redirect" label="重定向" extra="填写后，点击菜单会打开这个地址">
            <Input maxLength={200} />
          </Form.Item>
        ) : null}
        <Form.Item name="sort" label="显示排序">
          <InputNumber min={0} max={9999} style={{ width: "100%" }} />
        </Form.Item>
        <Form.Item name="icon" label="图标">
          <Select
            allowClear
            options={Object.keys(ICONS).map((key) => ({ value: key, label: <Space>{ICONS[key]}{key}</Space> }))}
          />
        </Form.Item>
        <Form.Item name="badge" label="角标">
          <Input maxLength={8} placeholder="如 NEW" />
        </Form.Item>
        <Form.Item name="minRole" label="最低角色" extra="达到该角色及以上才能看到。管理员始终可见。">
          <Radio.Group optionType="button" options={(Object.keys(ROLE_LABEL) as MenuRole[]).map((key) => ({ value: key, label: ROLE_LABEL[key] }))} />
        </Form.Item>
        <Form.Item name="hidden" label="侧栏隐藏" valuePropName="checked" extra="仍可打开地址，只是不出现在侧栏">
          <Switch />
        </Form.Item>
        <Form.Item name="enabled" label="是否启用" extra={locked ? "菜单管理保持启用并显示，避免无法再改菜单。" : undefined}>
          <Radio.Group disabled={locked} optionType="button" options={[{ value: "on", label: "启用" }, { value: "off", label: "停用" }]} />
        </Form.Item>
        <Form.Item name="shown" label="是否显示">
          <Radio.Group disabled={locked} optionType="button" options={[{ value: "show", label: "显示" }, { value: "hide", label: "隐藏" }]} />
        </Form.Item>
        {editor?.mode === "edit" && current ? <Typography.Text type="secondary">标识 {current.key}</Typography.Text> : null}
      </Form>
    </Drawer>
  );
}
