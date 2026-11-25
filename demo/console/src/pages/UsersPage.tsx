import { ProTable, type ProColumns } from "@ant-design/pro-components";
import { Tag, Typography, message } from "antd";
import { useMemo, useState } from "react";
import { DashFilterField, DashFilterPanel, FilterInput, FilterSelect } from "../components/DashFilterPanel";
import { useTableScrollY } from "../hooks/useTableScrollY";
import { useTableDensity } from "../lib/tableDensity";
import { showTotal } from "./listFormat";

type UserRow = {
  id: string;
  username: string;
  name: string;
  email: string;
  role: string;
  status: string;
};

const ROWS: UserRow[] = [
  { id: "u-01", username: "demo", name: "demo", email: "demo@example.com", role: "管理员", status: "启用" },
  { id: "u-02", username: "ops", name: "运维甲", email: "ops@example.com", role: "运维", status: "启用" },
  { id: "u-03", username: "dev", name: "开发乙", email: "dev@example.com", role: "开发者", status: "启用" },
  { id: "u-04", username: "view", name: "查看丙", email: "view@example.com", role: "查看者", status: "停用" },
];

const EMPTY = { username: "", name: "", email: "", role: "", status: "" };

export function UsersPage() {
  const [draft, setDraft] = useState(EMPTY);
  const [applied, setApplied] = useState(EMPTY);
  const { ref, scrollY } = useTableScrollY();
  const density = useTableDensity();
  const columns = useMemo<ProColumns<UserRow>[]>(
    () => [
      { title: "用户名", dataIndex: "username", width: 140 },
      { title: "显示名", dataIndex: "name", width: 140 },
      { title: "电子邮箱", dataIndex: "email", width: 220 },
      { title: "角色", dataIndex: "role", width: 120, render: (_, row) => <Tag>{row.role}</Tag> },
      { title: "状态", dataIndex: "status", width: 100 },
      {
        title: "操作",
        width: 120,
        fixed: "right",
        render: (_, row) => <Typography.Link onClick={() => message.info(`编辑 ${row.username}`)}>编辑</Typography.Link>,
      },
    ],
    [],
  );
  const rows = ROWS.filter((row) => {
    const username = applied.username.trim().toLowerCase();
    const name = applied.name.trim().toLowerCase();
    const email = applied.email.trim().toLowerCase();
    if (username && !row.username.toLowerCase().includes(username)) return false;
    if (name && !row.name.toLowerCase().includes(name)) return false;
    if (email && !row.email.toLowerCase().includes(email)) return false;
    if (applied.role && row.role !== applied.role) return false;
    if (applied.status && row.status !== applied.status) return false;
    return true;
  });

  return (
    <div className="console-executions-pane" ref={ref}>
      <DashFilterPanel
        hint="按用户名、显示名、电子邮箱、角色、状态筛选"
        onSearch={() => setApplied(draft)}
        onReset={() => {
          setDraft(EMPTY);
          setApplied(EMPTY);
        }}
      >
        <DashFilterField label="用户名">
          <FilterInput placeholder="用户名" value={draft.username} onChange={(event) => setDraft((prev) => ({ ...prev, username: event.target.value }))} onPressEnter={() => setApplied(draft)} />
        </DashFilterField>
        <DashFilterField label="显示名">
          <FilterInput placeholder="显示名" value={draft.name} onChange={(event) => setDraft((prev) => ({ ...prev, name: event.target.value }))} onPressEnter={() => setApplied(draft)} />
        </DashFilterField>
        <DashFilterField label="电子邮箱">
          <FilterInput placeholder="电子邮箱" value={draft.email} onChange={(event) => setDraft((prev) => ({ ...prev, email: event.target.value }))} onPressEnter={() => setApplied(draft)} />
        </DashFilterField>
        <DashFilterField label="角色">
          <FilterSelect
            placeholder="全部角色"
            options={["查看者", "运维", "开发者", "管理员"].map((item) => ({ value: item, label: item }))}
            value={draft.role || undefined}
            onChange={(value) => setDraft((prev) => ({ ...prev, role: String(value ?? "") }))}
          />
        </DashFilterField>
        <DashFilterField label="状态">
          <FilterSelect
            placeholder="全部状态"
            options={["启用", "停用"].map((item) => ({ value: item, label: item }))}
            value={draft.status || undefined}
            onChange={(value) => setDraft((prev) => ({ ...prev, status: String(value ?? "") }))}
          />
        </DashFilterField>
      </DashFilterPanel>
      <ProTable<UserRow>
        className="console-pro-table"
        headerTitle="用户"
        rowKey="id"
        columns={columns}
        dataSource={rows}
        search={false}
        cardBordered
        options={{ density: true, fullScreen: false, reload: true, setting: true }}
        size={density.size}
        onSizeChange={density.onSizeChange}
        scroll={{ x: "max-content", y: scrollY }}
        pagination={{ defaultPageSize: 20, showSizeChanger: true, showTotal }}
      />
    </div>
  );
}
