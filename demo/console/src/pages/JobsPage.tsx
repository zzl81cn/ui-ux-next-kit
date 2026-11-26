import { ProTable, type ProColumns } from "@ant-design/pro-components";
import { Alert, DatePicker, Descriptions, Drawer, Empty, Popconfirm, Space, Tabs, Tag, Typography, message } from "antd";
import dayjs, { type Dayjs } from "dayjs";
import { useMemo, useState, type HTMLAttributes } from "react";
import { useSearchParams } from "react-router-dom";
import { DashFilterField, DashFilterPanel, FilterInput, FilterSelect } from "../components/DashFilterPanel";
import { ResizableTh } from "../components/ResizableTh";
import { listExecutions, queueIdOf, type DayRange, type Execution, type ExecutionSortField, type ExecutionStatus } from "../mock/data";
import { useTableScrollY } from "../hooks/useTableScrollY";
import { useTableDensity } from "../lib/tableDensity";

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

type DateRange = [Dayjs, Dayjs] | null;

type Draft = {
  title: string;
  result: string;
  robot: string;
  created: DateRange;
  started: DateRange;
  finished: DateRange;
  misTaskId: string;
};

const EMPTY_DRAFT: Draft = { title: "", result: "", robot: "", created: null, started: null, finished: null, misTaskId: "" };

// 日历只选日期。开始日按北京时间 00:00:00，结束日按 23:59:59，两端都含，空着不限
const toDays = (range: DateRange): DayRange => ({ from: range?.[0].format("YYYY-MM-DD"), to: range?.[1].format("YYYY-MM-DD") });

type Sort = { field: ExecutionSortField; order: "ascend" | "descend" };
const DEFAULT_SORT: Sort = { field: "created_at", order: "descend" };

const FILTER_HINT =
  "按应用名称、执行结果、执行机器人、触发时间、执行时间、结束时间、MIS 任务号筛选派单记录。应用名称、执行机器人和 MIS 任务号可模糊。三个时间只选日期，开始日按 00:00:00、结束日按 23:59:59（北京时间）；不选则不限";

// 跳过、重试能不能点由这一行的状态定：演示里待领取、运行中能跳过，失败、已停止能重试
const canSkip = (row: Execution) => row.status === "pending" || row.status === "running";
const canRetry = (row: Execution) => row.status === "failed" || row.status === "stopped";

const fmtTime = (value: string | null) => (value ? dayjs(value).format("YYYY-MM-DD HH:mm:ss") : "—");

function fmtSpan(start: string | null, end: string | null) {
  if (!start || !end) return "—";
  const seconds = Math.max(0, dayjs(end).diff(dayjs(start), "second"));
  if (seconds < 60) return `${seconds} 秒`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)} 分 ${seconds % 60} 秒`;
  return `${Math.floor(seconds / 3600)} 时 ${Math.floor((seconds % 3600) / 60)} 分`;
}

const COLUMN_WIDTH = {
  title: 180,
  queue_name: 220,
  mis_task_id: 110,
  robot_name: 130,
  status: 128,
  created_at: 192,
  started_at: 192,
  finished_at: 192,
} as const;

const FIXED_WIDTH = { duration: 100, params: 240, actions: 168 } as const;

type ColKey = keyof typeof COLUMN_WIDTH;

function showTotal(total: number, range: [number, number]) {
  return `显示第 ${range[0]} 到第 ${range[1]} 条记录，共 ${total} 条记录`;
}

export function JobsPage() {
  const [params, setParams] = useSearchParams();
  const record = params.get("record") ?? "api";

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
          { key: "api", label: "全部执行" },
          { key: "regular", label: "计划执行" },
          { key: "advanced", label: "手动执行" },
        ]}
      />
      {record === "api" ? (
        <ApiExecutions />
      ) : (
        <Empty description={`这一页签留给「${record === "advanced" ? "手动执行" : "计划执行"}」。演示只填了「全部执行」。`} />
      )}
    </div>
  );
}

function ApiExecutions() {
  const [searchParams, setSearchParams] = useSearchParams();
  const queueParam = searchParams.get("queue");
  const queueId = queueParam && /^\d+$/.test(queueParam) ? Number(queueParam) : null;
  // 数据统计页的链接可以带 result=running / failed，进来就筛好
  const initial = useMemo<Draft>(() => {
    const result = new URLSearchParams(window.location.hash.split("?")[1] ?? "").get("result");
    return RESULT_OPTIONS.some((item) => item.value === result) ? { ...EMPTY_DRAFT, result: result as string } : EMPTY_DRAFT;
  }, []);
  const [draft, setDraft] = useState<Draft>(initial);
  const [applied, setApplied] = useState<Draft>(initial);
  const [sort, setSort] = useState<Sort>(DEFAULT_SORT);
  const [detail, setDetail] = useState<Execution | null>(null);
  const [widths, setWidths] = useState<Partial<Record<ColKey, number>>>({});
  const { ref, scrollY } = useTableScrollY();
  const density = useTableDensity();
  const [hidden, setHidden] = useState<Record<string, boolean>>({ queue_name: true });
  const widthOf = (key: ColKey) => widths[key] ?? COLUMN_WIDTH[key];
  const resize = (key: ColKey) => (next: number) => setWidths((prev) => ({ ...prev, [key]: next }));
  const headerOf = (key: ColKey) => () =>
    ({ resizeWidth: widthOf(key), onResizeWidth: resize(key) }) as HTMLAttributes<HTMLTableCellElement>;
  // 表头可排序，只有升序、降序两态：点到降序再点回升序，没有「取消排序」
  const sortable = (field: ExecutionSortField) => ({
    sorter: true,
    sortOrder: sort.field === field ? sort.order : null,
    sortDirections: ["ascend", "descend"] as ("ascend" | "descend")[],
    showSorterTooltip: false,
  });

  const tableWidth =
    (Object.keys(COLUMN_WIDTH) as ColKey[]).reduce((sum, key) => (hidden[key] ? sum : sum + widthOf(key)), 0) +
    FIXED_WIDTH.duration +
    FIXED_WIDTH.params +
    FIXED_WIDTH.actions;

  const columns = useMemo<ProColumns<Execution>[]>(
    () => [
      {
        title: "应用名称",
        dataIndex: "title",
        width: widthOf("title"),
        fixed: "left",
        onHeaderCell: headerOf("title"),
        ...sortable("title"),
        render: (_, row) => (
          <span className="console-cell-clip" title={row.title}>
            {row.title}
          </span>
        ),
      },
      {
        title: "队列项",
        dataIndex: "queue_name",
        width: widthOf("queue_name"),
        ellipsis: true,
        onHeaderCell: headerOf("queue_name"),
        ...sortable("queue_name"),
        render: (_, row) => (
          <Typography.Link href={`#/jobs?record=api&queue=${queueIdOf(row)}`} title={row.queue_name}>
            {row.queue_name}
          </Typography.Link>
        ),
      },
      {
        title: "MIS_ID",
        dataIndex: "mis_task_id",
        width: widthOf("mis_task_id"),
        onHeaderCell: headerOf("mis_task_id"),
        ...sortable("mis_task_id"),
        render: (_, row) => (row.mis_task_id != null ? String(row.mis_task_id) : "—"),
      },
      {
        title: "执行机器人",
        dataIndex: "robot_name",
        width: widthOf("robot_name"),
        ellipsis: true,
        onHeaderCell: headerOf("robot_name"),
        ...sortable("robot_name"),
        render: (_, row) => row.robot_name ?? row.robot_id ?? "—",
      },
      {
        title: "执行结果",
        dataIndex: "status",
        width: widthOf("status"),
        onHeaderCell: headerOf("status"),
        ...sortable("status"),
        render: (_, row) => <Tag color={STATUS[row.status].color}>{STATUS[row.status].text}</Tag>,
      },
      { title: "触发时间", dataIndex: "created_at", width: widthOf("created_at"), onHeaderCell: headerOf("created_at"), ...sortable("created_at"), render: (_, row) => fmtTime(row.created_at) },
      { title: "执行时间", dataIndex: "started_at", width: widthOf("started_at"), onHeaderCell: headerOf("started_at"), ...sortable("started_at"), render: (_, row) => fmtTime(row.started_at) },
      { title: "结束时间", dataIndex: "finished_at", width: widthOf("finished_at"), onHeaderCell: headerOf("finished_at"), ...sortable("finished_at"), render: (_, row) => fmtTime(row.finished_at) },
      { title: "执行时长", width: FIXED_WIDTH.duration, render: (_, row) => fmtSpan(row.started_at, row.finished_at) },
      {
        title: "请求参数",
        dataIndex: "queue_info",
        width: FIXED_WIDTH.params,
        render: (_, row) =>
          row.queue_info ? (
            <Typography.Text className="console-cell-params" copyable={{ text: row.queue_info }} ellipsis={{ tooltip: row.queue_info }}>
              {row.queue_info}
            </Typography.Text>
          ) : (
            "—"
          ),
      },
      {
        title: "操作",
        valueType: "option",
        width: FIXED_WIDTH.actions,
        fixed: "right",
        render: (_, row) => (
          <Space size={16} className="console-row-actions">
            <Typography.Link onClick={() => setDetail(row)}>详情</Typography.Link>
            {canSkip(row) ? (
              <Popconfirm title={`跳过派单 #${row.id}？`} okText="跳过" okButtonProps={{ danger: true }} onConfirm={() => message.success("已跳过")}>
                <Typography.Link style={{ color: "var(--ant-color-error)" }}>跳过</Typography.Link>
              </Popconfirm>
            ) : (
              <Typography.Link disabled className="console-action-disabled">
                跳过
              </Typography.Link>
            )}
            {canRetry(row) ? (
              <Popconfirm title="重试这条队列项？" okText="重试" onConfirm={() => message.success("已放回排队")}>
                <Typography.Link>重试</Typography.Link>
              </Popconfirm>
            ) : (
              <Typography.Link disabled className="console-action-disabled">
                重试
              </Typography.Link>
            )}
          </Space>
        ),
      },
    ],
    [widths, sort],
  );

  const setField = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((prev) => ({ ...prev, [key]: value }));
  const rangeProps = (key: "created" | "started" | "finished") => ({
    className: "dash-filter-range",
    allowClear: true,
    value: draft[key],
    onChange: (value: [Dayjs | null, Dayjs | null] | null) => setField(key, value?.[0] && value?.[1] ? [value[0], value[1]] : null),
  });

  return (
    <div className="console-executions-pane" ref={ref}>
      {queueId != null ? (
        <Alert
          className="console-drill"
          type="info"
          showIcon
          title={`只看队列项 #${queueId} 的执行`}
          action={
            <Typography.Link
              onClick={() => {
                const next = new URLSearchParams(searchParams);
                next.delete("queue");
                setSearchParams(next, { replace: true });
              }}
            >
              看全部
            </Typography.Link>
          }
        />
      ) : null}
      <DashFilterPanel
        hint={FILTER_HINT}
        onSearch={() => setApplied(draft)}
        onReset={() => {
          setDraft(EMPTY_DRAFT);
          setApplied(EMPTY_DRAFT);
        }}
      >
        <DashFilterField label="应用名称">
          <FilterInput
            placeholder="应用名称"
            value={draft.title}
            onChange={(event) => setField("title", event.target.value)}
            onPressEnter={() => setApplied(draft)}
          />
        </DashFilterField>
        <DashFilterField label="执行结果">
          <FilterSelect
            placeholder="全部"
            options={RESULT_OPTIONS}
            value={draft.result || undefined}
            onChange={(value) => setField("result", String(value ?? ""))}
          />
        </DashFilterField>
        <DashFilterField label="执行机器人">
          <FilterInput
            placeholder="名称或标识（模糊）"
            value={draft.robot}
            onChange={(event) => setField("robot", event.target.value)}
            onPressEnter={() => setApplied(draft)}
          />
        </DashFilterField>
        <DashFilterField label="触发时间">
          <DatePicker.RangePicker {...rangeProps("created")} />
        </DashFilterField>
        <DashFilterField label="执行时间">
          <DatePicker.RangePicker {...rangeProps("started")} />
        </DashFilterField>
        <DashFilterField label="结束时间">
          <DatePicker.RangePicker {...rangeProps("finished")} />
        </DashFilterField>
        <DashFilterField label="MIS_ID">
          <FilterInput
            placeholder="MIS 任务号（模糊）"
            value={draft.misTaskId}
            onChange={(event) => setField("misTaskId", event.target.value.replace(/\D/g, ""))}
            onPressEnter={() => setApplied(draft)}
          />
        </DashFilterField>
      </DashFilterPanel>
      <ProTable<Execution>
        className="console-pro-table"
        headerTitle="执行记录"
        rowKey="id"
        columns={columns}
        columnsState={{
          defaultValue: { queue_name: { show: false } },
          onChange: (map) => setHidden(Object.fromEntries(Object.entries(map).map(([key, value]) => [key, value.show === false]))),
        }}
        search={false}
        cardBordered
        components={{ header: { cell: ResizableTh } }}
        onChange={(_pagination, _filters, sorter) => {
          const one = Array.isArray(sorter) ? sorter[0] : sorter;
          const field = (one?.field ?? sort.field) as ExecutionSortField;
          // order 为空是点到了第三下：回到升序，不进入「取消排序」
          setSort({ field, order: one?.order ?? "ascend" });
        }}
        options={{
          density: true,
          fullScreen: false,
          setting: true,
          reload: (_event, action) => {
            setWidths({});
            action?.reload?.();
          },
        }}
        params={{ ...applied, queueId, sort }}
        request={async (query) => {
          const current = query.current ?? 1;
          const pageSize = query.pageSize ?? 20;
          const { items, total } = listExecutions({
            title: applied.title,
            result: applied.result,
            robot: applied.robot,
            misTaskId: applied.misTaskId,
            created: toDays(applied.created),
            started: toDays(applied.started),
            finished: toDays(applied.finished),
            queueId: queueId ?? undefined,
            sort,
            offset: (current - 1) * pageSize,
            limit: pageSize,
          });
          return { data: items, success: true, total };
        }}
        size={density.size}
        onSizeChange={density.onSizeChange}
        tableLayout="fixed"
        scroll={{ x: tableWidth, y: scrollY }}
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
      <Drawer title={detail ? `执行详情 · 派单 #${detail.id}` : ""} size={760} open={detail != null} onClose={() => setDetail(null)} destroyOnHidden>
        {detail ? (
          <Descriptions
            column={1}
            size="small"
            bordered
            items={[
              { key: "title", label: "应用名称", children: detail.title },
              { key: "queue", label: "队列项", children: detail.queue_name },
              { key: "mis", label: "MIS_ID", children: detail.mis_task_id ?? "—" },
              { key: "robot", label: "执行机器人", children: detail.robot_name ?? detail.robot_id ?? "—" },
              { key: "status", label: "执行结果", children: <Tag color={STATUS[detail.status].color}>{STATUS[detail.status].text}</Tag> },
              { key: "created", label: "触发时间", children: fmtTime(detail.created_at) },
              { key: "started", label: "执行时间", children: fmtTime(detail.started_at) },
              { key: "finished", label: "结束时间", children: fmtTime(detail.finished_at) },
              { key: "span", label: "执行时长", children: fmtSpan(detail.started_at, detail.finished_at) },
              { key: "params", label: "请求参数", children: detail.queue_info ?? "—" },
            ]}
          />
        ) : null}
      </Drawer>
    </div>
  );
}
