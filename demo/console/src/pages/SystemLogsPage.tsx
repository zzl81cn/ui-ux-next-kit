import { CopyOutlined } from "@ant-design/icons";
import { ProTable, type ProColumns } from "@ant-design/pro-components";
import { Button, DatePicker, Drawer, Dropdown, Switch, Tabs, Tag, Typography, message } from "antd";
import dayjs, { type Dayjs } from "dayjs";
import { useMemo, useState } from "react";
import { DashFilterField, DashFilterPanel, FilterInput, FilterSelect } from "../components/DashFilterPanel";
import { useTableScrollY } from "../hooks/useTableScrollY";
import { useTableDensity } from "../lib/tableDensity";
import { LOG_ROWS, LOG_TABS, type LogRow } from "../mock/logs";
import { useThemeMode } from "../theme/ThemeRoot";
import { showTotal } from "./listFormat";

type Draft = {
  keyword: string;
  role: string;
  range: [Dayjs, Dayjs];
  failedOnly: boolean;
};

function emptyDraft(): Draft {
  return { keyword: "", role: "", range: [dayjs().subtract(30, "day"), dayjs()], failedOnly: false };
}

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    message.success("已复制完整日志");
  } catch {
    message.error("复制失败");
  }
}

export function SystemLogsPage() {
  const [tab, setTab] = useState<(typeof LOG_TABS)[number]>("全部类型");
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [applied, setApplied] = useState<Draft>(emptyDraft);
  const [current, setCurrent] = useState<LogRow | null>(null);
  const { ref, scrollY } = useTableScrollY();
  const density = useTableDensity();
  const { dark } = useThemeMode();

  const rows = useMemo(() => {
    const keyword = applied.keyword.trim().toLowerCase();
    const [start, end] = applied.range;
    return LOG_ROWS.filter((row) => {
      if (tab !== "全部类型" && row.category !== tab) return false;
      if (applied.role && row.role !== applied.role) return false;
      if (applied.failedOnly && row.success !== false) return false;
      const when = dayjs(row.at);
      if (when.isBefore(start.startOf("day")) || when.isAfter(end.endOf("day"))) return false;
      if (!keyword) return true;
      return [row.actor, row.title, row.action, row.objectId, row.objectType].join(" ").toLowerCase().includes(keyword);
    });
  }, [applied, tab]);

  const columns: ProColumns<LogRow>[] = [
    {
      title: "摘要",
      width: 200,
      fixed: "left",
      render: (_, row) => (
        <span>
          {row.title || row.action} {row.success === false ? <Tag color="error">失败</Tag> : null}
        </span>
      ),
    },
    { title: "类型", width: 96, render: (_, row) => <Tag>{row.category}</Tag> },
    { title: "动作", dataIndex: "action", width: 120, render: (_, row) => row.action || "—" },
    { title: "时间", dataIndex: "at", width: 170 },
    { title: "操作者", dataIndex: "actor", width: 100 },
    { title: "IP", dataIndex: "ip", width: 120, render: (_, row) => row.ip || "—" },
    {
      title: "对象",
      width: 160,
      ellipsis: true,
      render: (_, row) => (row.objectId ? <span style={{ fontFamily: "ui-monospace, monospace", fontSize: 12 }}>{row.objectId}</span> : "—"),
    },
    {
      title: "操作",
      width: 80,
      fixed: "right",
      render: (_, row) => <Typography.Link onClick={() => setCurrent(row)}>详情</Typography.Link>,
    },
  ];

  function exportCsv() {
    if (!applied.range) {
      message.warning("请先选择日期并查询，再导出");
      return;
    }
    const header = ["摘要", "类型", "动作", "时间", "操作者", "IP", "对象"];
    const body = rows.map((row) => [row.title, row.category, row.action, row.at, row.actor, row.ip, row.objectId].join(","));
    const blob = new Blob([[header.join(","), ...body].join("\n")], { type: "text/csv;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `audit-logs-${dayjs().format("YYYY-MM-DD")}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  return (
    <div className="console-page">
      <Typography.Paragraph type="secondary" style={{ margin: 0 }}>
        系统日志 · 登录与控制台写操作
      </Typography.Paragraph>
      <Tabs className="console-page-tabs" activeKey={tab} onChange={(key) => setTab(key as (typeof LOG_TABS)[number])} items={LOG_TABS.map((item) => ({ key: item, label: item }))} />
      <div className="console-executions-pane" ref={ref}>
        <DashFilterPanel
          hint="按关键字、角色、时间筛选；默认近 30 天"
          onSearch={() => setApplied({ ...draft, range: [draft.range[0], draft.range[1]] })}
          onReset={() => {
            const next = emptyDraft();
            setDraft(next);
            setApplied(next);
          }}
        >
          <DashFilterField label="关键字">
            <FilterInput placeholder="操作者 / 摘要 / 对象" value={draft.keyword} onChange={(event) => setDraft((prev) => ({ ...prev, keyword: event.target.value }))} onPressEnter={() => setApplied(draft)} />
          </DashFilterField>
          <DashFilterField label="角色">
            <FilterSelect
              placeholder="全部角色"
              options={["查看者", "运维", "开发者", "管理员"].map((item) => ({ value: item, label: item }))}
              value={draft.role || undefined}
              onChange={(value) => setDraft((prev) => ({ ...prev, role: String(value ?? "") }))}
            />
          </DashFilterField>
          <DashFilterField label="时间范围">
            <DatePicker.RangePicker
              allowClear={false}
              value={draft.range}
              onChange={(value) => {
                const start = value?.[0];
                const end = value?.[1];
                if (start && end) setDraft((prev) => ({ ...prev, range: [start, end] }));
              }}
            />
          </DashFilterField>
          <label className="dash-filter-inline">
            <span>只看失败</span>
            <Switch checked={draft.failedOnly} onChange={(value) => setDraft((prev) => ({ ...prev, failedOnly: value }))} />
          </label>
        </DashFilterPanel>
        <ProTable<LogRow>
          className="console-pro-table"
          headerTitle="记录"
          rowKey="id"
          columns={columns}
          dataSource={rows}
          search={false}
          cardBordered
          options={false}
          size={density.size}
          toolBarRender={() => [
            <Button key="export" onClick={exportCsv}>
              导出
            </Button>,
          ]}
          scroll={{ x: "max-content", y: scrollY }}
          pagination={{ defaultPageSize: 20, showSizeChanger: true, showTotal }}
          locale={{ emptyText: "这段时间没有审计记录。放宽时间或换类型再查。" }}
        />
      </div>
      <LogDrawer row={current} dark={dark} onClose={() => setCurrent(null)} />
    </div>
  );
}

function LogDrawer({ row, dark, onClose }: { row: LogRow | null; dark: boolean; onClose: () => void }) {
  const title = row ? row.title || row.action : "";
  const pill = row?.success === false ? "失败" : row?.success === true ? "成功" : "已记录";
  const color = row?.success === false ? "#ff4d4f" : "#52c41a";
  const fields = row
    ? [
        ["时间", dayjs(row.at).toDate().toLocaleString("zh-CN", { hour12: false })],
        ["操作者", row.actor],
        ["动作", row.action || "—"],
        ["动作键", row.actionKey],
        ["对象类型", row.objectType || "—"],
        ["对象 ID", row.objectId || "—"],
        ["来源 IP", row.ip || "—"],
        ["日志 ID", row.id],
        ...Object.entries(row.extra),
      ]
    : [];

  return (
    <Drawer
      size={400}
      open={Boolean(row)}
      onClose={onClose}
      closable={false}
      styles={{ body: { padding: 0, background: dark ? "#141414" : "#f5f5f5" } }}
      footer={
        <div className="drawer-split-footer">
          <Button onClick={onClose}>关闭</Button>
          <Button type="primary" onClick={() => row && void copyText(JSON.stringify(row, null, 2))}>
            复制完整日志
          </Button>
        </div>
      }
    >
      {row ? (
        <div className="log-drawer">
          <div className="log-drawer__top">
            <div>
              <p className="log-drawer__eyebrow">{row.category}</p>
              <h2 className="log-drawer__title">{title}</h2>
            </div>
            <Dropdown
              trigger={["click"]}
              menu={{
                items: [
                  { key: "json", label: "复制 JSON" },
                  { key: "id", label: "复制日志 ID" },
                ],
                onClick: ({ key }) => void copyText(key === "id" ? row.id : JSON.stringify(row, null, 2)),
              }}
            >
              <button type="button" className="log-drawer__copy" aria-label="复制">
                <CopyOutlined />
              </button>
            </Dropdown>
          </div>
          <div className="log-drawer__status">
            <div className="log-drawer__who">
              <b>{row.actor}</b>
              <span>{row.ip || "—"}</span>
            </div>
            <span className="log-drawer__pill" style={{ background: color }}>
              {pill}
            </span>
            {row.ua ? <p className="log-drawer__ua">{row.ua}</p> : null}
          </div>
          <p className="log-drawer__section">日志详情</p>
          {fields.map(([label, value]) => (
            <div className="log-drawer__row" key={label}>
              <span>{label}</span>
              <b>{value}</b>
            </div>
          ))}
        </div>
      ) : null}
    </Drawer>
  );
}
