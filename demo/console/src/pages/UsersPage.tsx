import { ProTable, type ProColumns } from "@ant-design/pro-components";
import { App, Button, Drawer, Form, Input, Select, Space, Switch, Tag, Tooltip, Typography, type FormInstance } from "antd";
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { DashFilterField, DashFilterPanel, FilterInput, FilterSelect } from "../components/DashFilterPanel";
import { useTableScrollY } from "../hooks/useTableScrollY";
import { useTableDensity } from "../lib/tableDensity";

type RoleId = "viewer" | "operator" | "developer" | "admin";

const ROLES: { id: RoleId; label: string; description: string }[] = [
  { id: "viewer", label: "查看者", description: "只看列表和看板" },
  { id: "operator", label: "运维", description: "能跑任务、看日志" },
  { id: "developer", label: "开发者", description: "能改应用和凭证" },
  { id: "admin", label: "管理员", description: "能改用户、菜单和系统配置" },
];
const ROLE_LABEL = Object.fromEntries(ROLES.map((role) => [role.id, role.label])) as Record<RoleId, string>;

type UserRow = {
  id: string;
  username: string;
  display_name: string;
  email: string;
  role: RoleId;
  is_active: boolean;
  /** 管理员新建 / 重置后还没自己改过密码 */
  must_change_password?: boolean;
  /** 临时密码超过「登录安全」时限没改：账号锁定，只能再重置 */
  temp_password_locked?: boolean;
  temp_password_expires_at?: string | null;
  created_at: string;
  updated_at: string;
};

const SELF = "demo";

const INITIAL_ROWS: UserRow[] = [
  { id: "u-01", username: "demo", display_name: "demo", email: "demo@example.com", role: "admin", is_active: true, created_at: "2026-10-12T02:10:00Z", updated_at: "2026-11-20T08:30:00Z" },
  { id: "u-02", username: "ops", display_name: "运维甲", email: "ops@example.com", role: "operator", is_active: true, created_at: "2026-10-15T03:00:00Z", updated_at: "2026-11-18T06:00:00Z" },
  { id: "u-03", username: "dev", display_name: "开发乙", email: "dev@example.com", role: "developer", is_active: true, created_at: "2026-10-20T05:20:00Z", updated_at: "2026-11-22T09:10:00Z" },
  {
    id: "u-04",
    username: "view",
    display_name: "查看丙",
    email: "view@example.com",
    role: "viewer",
    is_active: false,
    created_at: "2026-11-01T01:00:00Z",
    updated_at: "2026-11-23T01:00:00Z",
  },
  {
    id: "u-05",
    username: "newbie",
    display_name: "新人丁",
    email: "newbie@example.com",
    role: "viewer",
    is_active: true,
    must_change_password: true,
    temp_password_expires_at: "2026-11-27T10:00:00Z",
    created_at: "2026-11-26T02:00:00Z",
    updated_at: "2026-11-26T02:00:00Z",
  },
  {
    id: "u-06",
    username: "late",
    display_name: "超时戊",
    email: "late@example.com",
    role: "operator",
    is_active: true,
    must_change_password: true,
    temp_password_locked: true,
    temp_password_expires_at: "2026-11-24T10:00:00Z",
    created_at: "2026-11-23T02:00:00Z",
    updated_at: "2026-11-23T02:00:00Z",
  },
];

type Filters = { username: string; display_name: string; email: string; role: string; is_active: boolean | undefined };
const EMPTY: Filters = { username: "", display_name: "", email: "", role: "", is_active: undefined };

type Mode = "create" | "edit" | "view";
type Session = { mode: Mode; row: UserRow | null };

type FormValues = {
  username: string;
  email: string;
  display_name: string;
  password?: string;
  role: RoleId;
  is_active: boolean;
};

const MODE_TITLE: Record<Mode, string> = { create: "新建用户", edit: "编辑用户", view: "用户详情" };

const USERNAME_RULES = [
  { required: true, whitespace: true, message: "请填写用户名" },
  { min: 2, max: 32, message: "用户名为 2–32 个字符" },
  { pattern: /^[A-Za-z0-9][A-Za-z0-9._-]*$/, message: "只能包含字母、数字、点、下划线和短横线，且以字母或数字开头" },
];

const EMAIL_RULES = [
  { required: true, whitespace: true, message: "请填写电子邮箱" },
  { type: "email" as const, message: "电子邮箱格式不正确" },
  { max: 254, message: "电子邮箱最长 254 个字符" },
];

const DISPLAY_NAME_RULES = [
  { required: true, whitespace: true, message: "请填写显示名" },
  { max: 64, message: "显示名最长 64 个字符" },
];

function passwordRules(required: boolean) {
  return [
    ...(required ? [{ required: true, message: "请填写初始密码" }] : []),
    {
      validator: async (_: unknown, value: string | undefined) => {
        const password = value ?? "";
        if (!password) return;
        // 管理员给的是临时密码，用户首登会被强制改密，复杂度在那一步按「登录安全」校验
        if (!password.trim()) throw new Error("密码不能全是空格");
        if (new TextEncoder().encode(password).length > 72) throw new Error("密码最长 72 字节");
      },
    },
  ];
}

const fmtTime = (iso?: string | null) => (iso ? new Date(iso).toLocaleString("zh-CN", { hour12: false }) : "—");

function matches(value: string, query: string) {
  const needle = query.trim().toLowerCase();
  return !needle || value.toLowerCase().includes(needle);
}

function draftOf(session: Session): FormValues {
  if (session.mode === "create" || !session.row) {
    return { username: "", email: "", display_name: "", password: "", role: "viewer", is_active: true };
  }
  const { row } = session;
  return { username: row.username, email: row.email, display_name: row.display_name, role: row.role, is_active: row.is_active, password: "" };
}

export function UsersPage() {
  const { message, modal } = App.useApp();
  const [rows, setRows] = useState<UserRow[]>(INITIAL_ROWS);
  const [draft, setDraft] = useState<Filters>(EMPTY);
  const [applied, setApplied] = useState<Filters>(EMPTY);
  const [session, setSession] = useState<Session | null>(null);
  const [saving, setSaving] = useState(false);
  const shown = useRef<Session | null>(null);
  const [form] = Form.useForm<FormValues>();
  const { ref, scrollY } = useTableScrollY();
  const density = useTableDensity();

  if (session) shown.current = session;
  const view = session ?? shown.current;

  const open = (mode: Mode, row?: UserRow) => setSession({ mode, row: row ?? null });
  const close = () => setSession(null);

  const toggleActive = (row: UserRow, active: boolean) => {
    setRows((current) => current.map((item) => (item.id === row.id ? { ...item, is_active: active } : item)));
    setSession((current) => (current?.row?.id === row.id ? { ...current, row: { ...current.row, is_active: active } } : current));
    if (session?.row?.id === row.id) form.setFieldValue("is_active", active);
    message.success(active ? "已启用" : "已禁用");
  };

  const confirmDelete = (row: UserRow) => {
    modal.confirm({
      title: "删除用户",
      content: `删除「${row.display_name}（${row.username}）」？删除后该账号无法再登录。`,
      okText: "删除",
      cancelText: "取消",
      okButtonProps: { danger: true },
      onOk: () => {
        setRows((current) => current.filter((item) => item.id !== row.id));
        setSession((current) => (current?.row?.id === row.id ? null : current));
        message.success("已删除");
      },
    });
  };

  const submit = async () => {
    if (!session || session.mode === "view") return;
    let values: FormValues;
    try {
      values = await form.validateFields();
    } catch {
      return; // 校验没过，错误提示已经挂在字段下面
    }
    setSaving(true);
    await new Promise((resolve) => window.setTimeout(resolve, 300));
    const now = new Date().toISOString();
    const hasPassword = Boolean(values.password?.trim());
    const tempExpires = new Date(Date.now() + 8 * 3600_000).toISOString();
    if (session.mode === "create") {
      if (rows.some((item) => item.username.toLowerCase() === values.username.trim().toLowerCase())) {
        setSaving(false);
        form.setFields([{ name: "username", errors: ["用户名已存在"] }]);
        return;
      }
      setRows((current) => [
        {
          id: `u-${Date.now()}`,
          username: values.username.trim(),
          display_name: values.display_name.trim(),
          email: values.email.trim(),
          role: values.role,
          is_active: true,
          must_change_password: true,
          temp_password_expires_at: tempExpires,
          created_at: now,
          updated_at: now,
        },
        ...current,
      ]);
      message.success("用户已创建");
    } else if (session.row) {
      const id = session.row.id;
      setRows((current) =>
        current.map((item) =>
          item.id === id
            ? {
                ...item,
                display_name: values.display_name.trim(),
                email: values.email.trim(),
                role: values.role,
                is_active: values.is_active,
                // 重置密码：重新计时，也解开因超时造成的锁定
                ...(hasPassword ? { must_change_password: true, temp_password_locked: false, temp_password_expires_at: tempExpires } : null),
                updated_at: now,
              }
            : item,
        ),
      );
      message.success("已保存");
    }
    setSaving(false);
    close();
  };

  const columns = useMemo<ProColumns<UserRow>[]>(
    () => [
      { title: "用户名", dataIndex: "username", width: 140 },
      { title: "显示名", dataIndex: "display_name", width: 140 },
      { title: "电子邮箱", dataIndex: "email", width: 220, render: (_, row) => row.email || "—" },
      { title: "角色", dataIndex: "role", width: 100, render: (_, row) => <Tag>{ROLE_LABEL[row.role]}</Tag> },
      {
        title: "状态",
        dataIndex: "is_active",
        width: 170,
        render: (_, row) => {
          const self = row.username === SELF;
          const expires = row.temp_password_expires_at ? fmtTime(row.temp_password_expires_at) : "";
          return (
            <Space size={6}>
              <Switch
                checked={row.is_active}
                disabled={self}
                title={self ? "不能停用当前登录账号" : row.is_active ? "禁用" : "启用"}
                onChange={(checked) => toggleActive(row, checked)}
              />
              {row.temp_password_locked ? (
                <Tooltip title="临时密码超时未改，账号已锁定。在「编辑」里重置密码解锁。">
                  <Tag color="red">已锁定</Tag>
                </Tooltip>
              ) : row.must_change_password ? (
                <Tooltip title={expires ? `须在 ${expires} 前登录并改密，否则锁定` : "须登录并改密"}>
                  <Tag color="orange">待改密</Tag>
                </Tooltip>
              ) : null}
            </Space>
          );
        },
      },
      {
        title: "操作",
        width: 168,
        fixed: "right",
        render: (_, row) => {
          const self = row.username === SELF;
          return (
            <Space size={16} className="console-row-actions">
              <Button type="link" size="small" onClick={() => open("view", row)}>
                查看
              </Button>
              <Button type="link" size="small" onClick={() => open("edit", row)}>
                编辑
              </Button>
              <Button type="link" size="small" danger disabled={self} title={self ? "不能删除当前登录账号" : undefined} onClick={() => confirmDelete(row)}>
                删除
              </Button>
            </Space>
          );
        },
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [session],
  );

  const filtering =
    applied.username.trim() !== "" || applied.display_name.trim() !== "" || applied.email.trim() !== "" || applied.role !== "" || applied.is_active !== undefined;
  const filtered = rows.filter((row) => {
    if (!matches(row.username, applied.username)) return false;
    if (!matches(row.display_name, applied.display_name)) return false;
    if (!matches(row.email, applied.email)) return false;
    if (applied.role && row.role !== applied.role) return false;
    if (applied.is_active !== undefined && row.is_active !== applied.is_active) return false;
    return true;
  });
  const search = () => setApplied(draft);
  const mode = view?.mode;

  return (
    <div className="console-executions-pane" ref={ref}>
      <Typography.Paragraph type="secondary" style={{ margin: 0 }}>
        控制台账号；角色在此指定
      </Typography.Paragraph>
      <DashFilterPanel
        hint="角色说明与能力矩阵见「角色管理」「权限管理」"
        onSearch={search}
        onReset={() => {
          setDraft(EMPTY);
          setApplied(EMPTY);
        }}
      >
        <DashFilterField label="用户名">
          <FilterInput placeholder="用户名" value={draft.username} onChange={(event) => setDraft((prev) => ({ ...prev, username: event.target.value }))} onPressEnter={search} />
        </DashFilterField>
        <DashFilterField label="显示名">
          <FilterInput placeholder="显示名" value={draft.display_name} onChange={(event) => setDraft((prev) => ({ ...prev, display_name: event.target.value }))} onPressEnter={search} />
        </DashFilterField>
        <DashFilterField label="电子邮箱">
          <FilterInput placeholder="电子邮箱" value={draft.email} onChange={(event) => setDraft((prev) => ({ ...prev, email: event.target.value }))} onPressEnter={search} />
        </DashFilterField>
        <DashFilterField label="角色">
          <FilterSelect
            placeholder="全部角色"
            options={ROLES.map((role) => ({ value: role.id, label: role.label }))}
            value={draft.role || undefined}
            onChange={(value) => setDraft((prev) => ({ ...prev, role: String(value ?? "") }))}
          />
        </DashFilterField>
        <DashFilterField label="状态">
          <FilterSelect
            placeholder="全部状态"
            options={[
              { value: true, label: "启用" },
              { value: false, label: "禁用" },
            ]}
            value={draft.is_active}
            onChange={(value) => setDraft((prev) => ({ ...prev, is_active: typeof value === "boolean" ? value : undefined }))}
          />
        </DashFilterField>
      </DashFilterPanel>
      <ProTable<UserRow>
        className="console-pro-table"
        headerTitle="用户"
        rowKey="id"
        columns={columns}
        dataSource={filtered}
        search={false}
        cardBordered
        options={{ density: true, fullScreen: false, reload: true, setting: false }}
        toolBarRender={() => [
          <Button key="add" type="primary" onClick={() => open("create")}>
            新建用户
          </Button>,
        ]}
        size={density.size}
        onSizeChange={density.onSizeChange}
        tableLayout="fixed"
        scroll={{ x: 938, y: scrollY }}
        pagination={false}
        locale={{ emptyText: filtering ? "没有符合条件的用户。清空筛选或换条件再试。" : "还没有控制台用户。点「新建用户」添加账号。" }}
      />
      <Drawer
        title={mode ? MODE_TITLE[mode] : "用户"}
        size={480}
        open={session !== null}
        onClose={close}
        destroyOnHidden
        afterOpenChange={(opened) => {
          if (!opened) form.resetFields();
        }}
        extra={
          mode === "view" ? (
            <Space>
              <Button onClick={close}>关闭</Button>
              <Button type="primary" onClick={() => view?.row && open("edit", view.row)}>
                编辑
              </Button>
            </Space>
          ) : (
            <Space>
              <Button onClick={close}>取消</Button>
              <Button type="primary" loading={saving} onClick={() => void submit()}>
                {mode === "create" ? "创建" : "保存"}
              </Button>
            </Space>
          )
        }
      >
        {view ? <UserAccountForm key={`${view.mode}-${view.row?.id ?? "new"}`} form={form} session={view} /> : null}
      </Drawer>
    </div>
  );
}

function UserAccountForm({ form, session }: { form: FormInstance<FormValues>; session: Session }) {
  const { mode, row } = session;
  const readOnly = mode === "view";
  // 表单实例在页面上只有一个，关掉再开会带着上一次的值。每次挂载先用这一行的值盖掉，再清掉校验提示
  useLayoutEffect(() => {
    form.resetFields();
    form.setFieldsValue(draftOf(session));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form]);
  return (
    <Form form={form} layout="vertical" disabled={readOnly} initialValues={draftOf(session)}>
      <Form.Item name="username" label="用户名" rules={mode === "create" ? USERNAME_RULES : undefined}>
        <Input autoComplete="off" disabled={mode !== "create"} placeholder="字母或数字开头，2–32 位" />
      </Form.Item>
      <Form.Item name="email" label="电子邮箱" rules={readOnly ? undefined : EMAIL_RULES}>
        <Input autoComplete="email" placeholder="name@example.com" maxLength={254} />
      </Form.Item>
      <Form.Item name="display_name" label="显示名" rules={readOnly ? undefined : DISPLAY_NAME_RULES}>
        <Input maxLength={64} />
      </Form.Item>
      <Form.Item name="role" label="角色" rules={readOnly ? undefined : [{ required: true, message: "请选择角色" }]}>
        <Select options={ROLES.map((role) => ({ value: role.id, label: `${role.label} — ${role.description}` }))} />
      </Form.Item>
      {mode !== "create" ? (
        <Form.Item name="is_active" label="启用" valuePropName="checked">
          <Switch />
        </Form.Item>
      ) : null}
      {mode === "create" ? (
        <Form.Item
          name="password"
          label="初始密码"
          extra="临时密码，可设简单密码。用户须在「登录安全」设定的时限内（默认 8 小时）登录并改密，超时账号锁定，需管理员再次重置"
          rules={passwordRules(true)}
        >
          <Input.Password autoComplete="new-password" />
        </Form.Item>
      ) : null}
      {mode === "edit" ? (
        <Form.Item
          name="password"
          label="重置密码（留空不改）"
          extra="可设简单密码。重置后用户须在时限内（默认 8 小时）登录并改密，超时账号锁定，需再次重置"
          rules={passwordRules(false)}
        >
          <Input.Password autoComplete="new-password" />
        </Form.Item>
      ) : null}
      {mode === "view" && row ? (
        <>
          <Form.Item label="创建时间">
            <Input value={fmtTime(row.created_at)} />
          </Form.Item>
          <Form.Item label="更新时间">
            <Input value={fmtTime(row.updated_at)} />
          </Form.Item>
        </>
      ) : null}
    </Form>
  );
}
