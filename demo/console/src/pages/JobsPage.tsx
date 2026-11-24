import { ProTable, type ProColumns } from "@ant-design/pro-components";
import { Empty, Popconfirm, Space, Tabs, Tag, Typography, message } from "antd";
import { useMemo, useState, type HTMLAttributes, type MouseEvent as ReactMouseEvent, type ThHTMLAttributes } from "react";
import { useSearchParams } from "react-router-dom";
import { DashFilterField, DashFilterPanel, FilterInput, FilterSelect } from "../components/DashFilterPanel";
import { listExecutions, type Execution, type ExecutionStatus } from "../mock/data";
import { useTableScrollY } from "../hooks/useTableScrollY";

const RESULT_OPTIONS = [
  { value: "running", label: "运行中" },
  { value: "succeeded", label: "成功" },
  { value: "failed", label: "失败" },
  { value: "stopped", label: "已停止" },
];

const STATUS: Record<ExecutionStatus, { text: string; color: string }> = {
  pending: { text: "待领取", color: "default" },
  running: { text: "运行中", color: "processing" },
  stopping: { text: "停止中", color: "warning" },
  succeeded: { text: "成功", color: "success" },
  failed: { text: "失败", color: "error" },
  stopped: { text: "已停止", color: "default" },
};

type Draft = { title: string; result: string; misTaskId: string };

const EMPTY_DRAFT: Draft = { title: "", result: "", misTaskId: "" };

const COLUMN_WIDTH = {
  title: 180,
  queue_name: 220,
  mis_task_id: 110,
  robot_name: 130,
  status: 96,
  created_at: 170,
  started_at: 170,
  finished_at: 170,
} as const;

const MIN_COL_W = 80;

type ColKey = keyof typeof COLUMN_WIDTH;

function ResizableTh({
  resizeWidth,
  onResizeWidth,
  children,
  ...rest
}: ThHTMLAttributes<HTMLTableCellElement> & {
  resizeWidth?: number;
  onResizeWidth?: (width: number) => void;
}) {
  if (!onResizeWidth || resizeWidth == null) return <th {...rest}>{children}</th>;
  const onMouseDown = (event: ReactMouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    const startX = event.clientX;
    const startW = resizeWidth;
    const move = (ev: MouseEvent) => onResizeWidth(Math.max(MIN_COL_W, startW + ev.clientX - startX));
    const up = () => {
      document.removeEventListener("mousemove", move);
      document.removeEventListener("mouseup", up);
      document.body.style.userSelect = "";
    };
    document.body.style.userSelect = "none";
    document.addEventListener("mousemove", move);
    document.addEventListener("mouseup", up);
  };
  return (
    <th {...rest}>
      {children}
      <span className="console-col-resizer" onMouseDown={onMouseDown} onClick={(event) => event.stopPropagation()} />
    </th>
  );
}

function showTotal(total: number, range: [number, number]) {
  return `显示第 ${range[0]} 到第 ${range[1]} 条记录，共 ${total} 条记录`;
}

export function JobsPage() {
  const [params, setParams] = useSearchParams();
  const record = params.get("record") ?? "regular";

  return (
    <div className="console-page">
      <Tabs
        className="console-page-tabs"
        activeKey={record}
        onChange={(key) => {
          const next = new URLSearchParams(params);
          next.set("record", key);
          setParams(next, { replace: true });
        }}
        items={[
          { key: "regular", label: "常规任务记录" },
          { key: "advanced", label: "高级任务记录" },
          { key: "api", label: "API执行记录" },
        ]}
      />
      {record === "api" ? (
        <ApiExecutions />
      ) : (
        <Empty description={record === "advanced" ? "这一页签留给高级任务。演示只填了 API 执行记录。" : "这一页签留给常规任务。演示只填了 API 执行记录。"} />
      )}
    </div>
  );
}

function ApiExecutions() {
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [applied, setApplied] = useState<Draft>(EMPTY_DRAFT);
  const [widths, setWidths] = useState<Partial<Record<ColKey, number>>>({});
  const { ref, scrollY } = useTableScrollY();
  const widthOf = (key: ColKey) => widths[key] ?? COLUMN_WIDTH[key];
  const resize = (key: ColKey) => (next: number) => setWidths((prev) => ({ ...prev, [key]: next }));
  const headerOf = (key: ColKey) => () =>
    ({ resizeWidth: widthOf(key), onResizeWidth: resize(key) }) as HTMLAttributes<HTMLTableCellElement>;

  const columns = useMemo<ProColumns<Execution>[]>(
    () => [
      { title: "应用名称", dataIndex: "title", width: widthOf("title"), ellipsis: true, fixed: "left", onHeaderCell: headerOf("title") },
      {
        title: "队列项",
        dataIndex: "queue_name",
        width: widthOf("queue_name"),
        ellipsis: true,
        onHeaderCell: headerOf("queue_name"),
      },
      {
        title: "MIS_ID",
        dataIndex: "mis_task_id",
        width: widthOf("mis_task_id"),
        onHeaderCell: headerOf("mis_task_id"),
        render: (_, row) => (row.mis_task_id != null ? String(row.mis_task_id) : "—"),
      },
      {
        title: "执行机器人",
        dataIndex: "robot_name",
        width: widthOf("robot_name"),
        ellipsis: true,
        onHeaderCell: headerOf("robot_name"),
        render: (_, row) => row.robot_name ?? row.robot_id ?? "—",
      },
      {
        title: "执行结果",
        dataIndex: "status",
        width: widthOf("status"),
        onHeaderCell: headerOf("status"),
        render: (_, row) => <Tag color={STATUS[row.status].color}>{STATUS[row.status].text}</Tag>,
      },
      { title: "触发时间", dataIndex: "created_at", width: widthOf("created_at"), onHeaderCell: headerOf("created_at") },
      { title: "执行时间", dataIndex: "started_at", width: widthOf("started_at"), onHeaderCell: headerOf("started_at"), render: (_, row) => row.started_at ?? "—" },
      { title: "结束时间", dataIndex: "finished_at", width: widthOf("finished_at"), onHeaderCell: headerOf("finished_at"), render: (_, row) => row.finished_at ?? "—" },
      { title: "执行时长", width: 100, render: () => "—" },
      {
        title: "请求参数",
        dataIndex: "queue_info",
        width: 240,
        ellipsis: true,
        render: (_, row) => row.queue_info ?? "—",
      },
      {
        title: "操作",
        valueType: "option",
        width: 168,
        fixed: "right",
        render: (_, row) => (
          <Space size={16} className="console-row-actions">
            <Typography.Link>详情</Typography.Link>
            <Popconfirm title={`跳过派单 #${row.id}？`} okText="跳过" okButtonProps={{ danger: true }} onConfirm={() => message.success("已跳过")}>
              <Typography.Link style={{ color: "var(--ant-color-error)" }}>跳过</Typography.Link>
            </Popconfirm>
            <Popconfirm title="重试这条队列项？" okText="重试" onConfirm={() => message.success("已放回排队")}>
              <Typography.Link>重试</Typography.Link>
            </Popconfirm>
          </Space>
        ),
      },
    ],
    [widths],
  );

  return (
    <div className="console-executions-pane" ref={ref}>
      <DashFilterPanel
        hint="按应用名称、执行结果、MIS 任务号（均可模糊）筛选派单记录"
        onSearch={() => setApplied(draft)}
        onReset={() => {
          setDraft(EMPTY_DRAFT);
          setApplied(EMPTY_DRAFT);
        }}
      >
        <DashFilterField label="应用名称">
          <FilterInput
            className="dash-filter-input"
            placeholder="应用名称"
            value={draft.title}
            onChange={(event) => setDraft((prev) => ({ ...prev, title: event.target.value }))}
            onPressEnter={() => setApplied(draft)}
          />
        </DashFilterField>
        <DashFilterField label="执行结果">
          <FilterSelect
            className="dash-filter-select"
            placeholder="全部"
            options={RESULT_OPTIONS}
            value={draft.result || undefined}
            onChange={(value) => setDraft((prev) => ({ ...prev, result: String(value ?? "") }))}
          />
        </DashFilterField>
        <DashFilterField label="MIS_ID">
          <FilterInput
            className="dash-filter-input"
            placeholder="MIS 任务号（模糊）"
            value={draft.misTaskId}
            onChange={(event) => setDraft((prev) => ({ ...prev, misTaskId: event.target.value.replace(/\D/g, "") }))}
            onPressEnter={() => setApplied(draft)}
          />
        </DashFilterField>
      </DashFilterPanel>
      <ProTable<Execution>
        className="console-pro-table"
        headerTitle="API执行记录"
        rowKey="id"
        columns={columns}
        columnsState={{ defaultValue: { queue_name: { show: false } } }}
        search={false}
        cardBordered
        components={{ header: { cell: ResizableTh } }}
        options={{
          density: false,
          fullScreen: false,
          setting: true,
          reload: (_event, action) => {
            setWidths({});
            action?.reload?.();
          },
        }}
        params={applied}
        request={async (query) => {
          const current = query.current ?? 1;
          const pageSize = query.pageSize ?? 20;
          const { items, total } = listExecutions({
            title: applied.title,
            result: applied.result,
            misTaskId: applied.misTaskId,
            offset: (current - 1) * pageSize,
            limit: pageSize,
          });
          return { data: items, success: true, total };
        }}
        scroll={{ x: "max-content", y: scrollY }}
        pagination={{ defaultPageSize: 20, showSizeChanger: true, showTotal }}
        locale={{
          emptyText: (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="还没有 API 执行。高级任务的 webhook / 添加队列项建出队列项后，执行机领走开跑，每次执行在这里一行。"
            />
          ),
        }}
      />
    </div>
  );
}
