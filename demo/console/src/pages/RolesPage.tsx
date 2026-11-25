import { ProTable, type ProColumns } from "@ant-design/pro-components";
import { Tag } from "antd";
import { useMemo, useState } from "react";
import { DashFilterField, DashFilterPanel, FilterInput } from "../components/DashFilterPanel";
import { useTableScrollY } from "../hooks/useTableScrollY";
import { useTableDensity } from "../lib/tableDensity";
import { showTotal } from "./listFormat";

type RoleRow = {
  id: string;
  label: string;
  key: string;
  description: string;
  rank: string;
  covers: string;
};

const ROWS: RoleRow[] = [
  { id: "viewer", label: "查看者", key: "viewer", description: "只看列表和看板", rank: "1", covers: "查看者" },
  { id: "operator", label: "运维", key: "operator", description: "能跑任务、看日志", rank: "2", covers: "查看者、运维" },
  { id: "developer", label: "开发者", key: "developer", description: "能改应用和凭证", rank: "3", covers: "查看者、运维、开发者" },
  { id: "admin", label: "管理员", key: "admin", description: "能改用户、菜单和系统配置", rank: "4", covers: "查看者、运维、开发者、管理员" },
];

export function RolesPage() {
  const [draft, setDraft] = useState("");
  const [applied, setApplied] = useState("");
  const { ref, scrollY } = useTableScrollY();
  const density = useTableDensity();
  const columns = useMemo<ProColumns<RoleRow>[]>(
    () => [
      { title: "角色", dataIndex: "label", width: 120, render: (_, row) => <Tag>{row.label}</Tag> },
      { title: "标识", dataIndex: "key", width: 140 },
      { title: "说明", dataIndex: "description" },
      { title: "级别", dataIndex: "rank", width: 80 },
      { title: "包含", dataIndex: "covers", width: 280 },
      { title: "类型", width: 80, render: () => <Tag color="blue">内置</Tag> },
    ],
    [],
  );
  const needle = applied.trim().toLowerCase();
  const rows = ROWS.filter((row) => !needle || [row.label, row.key, row.description, row.covers].join(" ").toLowerCase().includes(needle));

  return (
    <div className="console-executions-pane" ref={ref}>
      <DashFilterPanel
        hint="内置四级；高级包含低级"
        onSearch={() => setApplied(draft)}
        onReset={() => {
          setDraft("");
          setApplied("");
        }}
      >
        <DashFilterField label="关键字">
          <FilterInput placeholder="角色 / 标识 / 说明" value={draft} onChange={(event) => setDraft(event.target.value)} onPressEnter={() => setApplied(draft)} />
        </DashFilterField>
      </DashFilterPanel>
      <ProTable<RoleRow>
        className="console-pro-table"
        headerTitle="角色"
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
