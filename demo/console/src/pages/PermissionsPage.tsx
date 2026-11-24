import { CheckOutlined } from "@ant-design/icons";
import { ProTable, type ProColumns } from "@ant-design/pro-components";
import { useMemo, useState } from "react";
import { DashFilterField, DashFilterPanel, FilterInput, FilterSelect } from "../components/DashFilterPanel";
import { useTableScrollY } from "../hooks/useTableScrollY";
import { showTotal } from "./listFormat";

const ROLES = ["查看者", "运维", "开发者", "管理员"] as const;
const RANK: Record<(typeof ROLES)[number], number> = { 查看者: 1, 运维: 2, 开发者: 3, 管理员: 4 };

type PermRow = { id: string; group: string; label: string; min: (typeof ROLES)[number] };

const ROWS: PermRow[] = [
  { id: "user.read", group: "用户", label: "查看用户", min: "查看者" },
  { id: "user.write", group: "用户", label: "编辑用户", min: "管理员" },
  { id: "menu.write", group: "菜单", label: "管理菜单", min: "管理员" },
  { id: "log.read", group: "日志", label: "查看日志", min: "运维" },
  { id: "dept.write", group: "部门", label: "管理部门", min: "管理员" },
  { id: "settings.write", group: "系统配置", label: "修改系统配置", min: "管理员" },
];

const EMPTY = { keyword: "", group: "", min: "" };

export function PermissionsPage() {
  const [draft, setDraft] = useState(EMPTY);
  const [applied, setApplied] = useState(EMPTY);
  const { ref, scrollY } = useTableScrollY();
  const columns = useMemo<ProColumns<PermRow>[]>(
    () => [
      { title: "分组", dataIndex: "group", width: 120 },
      { title: "权限", dataIndex: "label", width: 180 },
      { title: "标识", dataIndex: "id", width: 160 },
      { title: "最低角色", dataIndex: "min", width: 120 },
      ...ROLES.map(
        (role): ProColumns<PermRow> => ({
          title: role,
          width: 90,
          render: (_, row) => (RANK[role] >= RANK[row.min] ? <CheckOutlined /> : "—"),
        }),
      ),
    ],
    [],
  );
  const rows = ROWS.filter((row) => {
    if (applied.group && row.group !== applied.group) return false;
    if (applied.min && row.min !== applied.min) return false;
    const keyword = applied.keyword.trim().toLowerCase();
    if (keyword && ![row.id, row.group, row.label, row.min].join(" ").toLowerCase().includes(keyword)) return false;
    return true;
  });

  return (
    <div className="console-executions-pane" ref={ref}>
      <DashFilterPanel
        hint="只读矩阵。达到最低角色及以上的列打勾"
        onSearch={() => setApplied(draft)}
        onReset={() => {
          setDraft(EMPTY);
          setApplied(EMPTY);
        }}
      >
        <DashFilterField label="关键字">
          <FilterInput placeholder="权限 / 标识 / 分组" value={draft.keyword} onChange={(event) => setDraft((prev) => ({ ...prev, keyword: event.target.value }))} onPressEnter={() => setApplied(draft)} />
        </DashFilterField>
        <DashFilterField label="分组">
          <FilterSelect
            placeholder="全部分组"
            options={[...new Set(ROWS.map((row) => row.group))].map((item) => ({ value: item, label: item }))}
            value={draft.group || undefined}
            onChange={(value) => setDraft((prev) => ({ ...prev, group: String(value ?? "") }))}
          />
        </DashFilterField>
        <DashFilterField label="最低角色">
          <FilterSelect
            placeholder="全部角色"
            options={ROLES.map((item) => ({ value: item, label: item }))}
            value={draft.min || undefined}
            onChange={(value) => setDraft((prev) => ({ ...prev, min: String(value ?? "") }))}
          />
        </DashFilterField>
      </DashFilterPanel>
      <ProTable<PermRow>
        className="console-pro-table"
        headerTitle="权限"
        rowKey="id"
        columns={columns}
        dataSource={rows}
        search={false}
        cardBordered
        options={{ density: false, fullScreen: false, reload: true, setting: true }}
        scroll={{ x: "max-content", y: scrollY }}
        pagination={{ defaultPageSize: 20, showSizeChanger: true, showTotal }}
      />
    </div>
  );
}
