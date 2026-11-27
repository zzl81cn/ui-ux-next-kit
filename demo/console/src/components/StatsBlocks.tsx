import { Button, Empty, Tabs, Tag, Typography } from "antd";
import dayjs from "dayjs";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { queueItemStyle } from "../lib/motion";
import { batchPath, QUEUE_PATH, queuePath, RECORDS_PATH } from "../lib/statsLinks";
import { TASK_BATCH, TASK_COUNTS, WHITELIST, type BatchRow, type BatchStatus, type QueueRow, type TaskCounts, type TaskState } from "../mock/stats";
import { TaskProgress } from "./TaskProgress";

/** 进度条下面的计数标签：有白名单数据 / 没有白名单数据，两种写法，不把所有标签摆在一起。总数只体现在「白名单 N 户」里。 */
function CountTags({ counts, whitelist }: { counts: TaskCounts; whitelist: boolean }) {
  if (whitelist) {
    const wl = WHITELIST;
    return (
      <>
        <div className="stats-task__line stats-task__tags">
          <Tag className="task-monitor-aux">白名单 {counts.total} 户</Tag>
          <Tag color="blue">待跑 {wl.todo}</Tag>
          <Tag color="success">有数据 {wl.hasData}</Tag>
          {wl.noData > 0 ? <Tag>无数据 {wl.noData}</Tag> : null}
          {wl.noAuth > 0 ? <Tag>无权限 {wl.noAuth}</Tag> : null}
          <Typography.Text type="secondary" className="task-monitor-aux">
            已落字 {wl.written}/{counts.total}
          </Typography.Text>
        </div>
        {counts.failed > 0 || counts.queued > 0 ? (
          <div className="stats-task__note task-monitor-aux">
            调度行另计：完成 {counts.done}
            {counts.failed > 0 ? ` · 历史失败行 ${counts.failed}（含旧抽表失败，不等于待跑）` : ""}
            {counts.queued > 0 ? ` · 队列未结 ${counts.queued}` : ""}。无权限 / 待跑以白名单「税费种认定」列为准。
          </div>
        ) : null}
      </>
    );
  }
  return (
    <div className="stats-task__line stats-task__tags">
      <Tag className="task-monitor-aux">白名单 {counts.total} 户</Tag>
      <Tag color="success">完成 {counts.done}</Tag>
      {counts.failed > 0 ? <Tag color="error">失败待重跑 {counts.failed}</Tag> : null}
      {counts.skipped > 0 ? <Tag className="task-monitor-aux">调度跳过 {counts.skipped}</Tag> : null}
      {counts.queued > 0 ? <Tag color="blue">队列未结 {counts.queued}</Tag> : null}
    </div>
  );
}

/** 当前任务正文。按状态分四种（空闲 / 有派单在跑 / 已派单进度未回写 / 有未完成批次但执行器空闲），纵向排，间距小。 */
export function CurrentTaskBody({ state, step = 0 }: { state: TaskState; step?: number }) {
  const batch = TASK_BATCH;
  const nameLink = (
    <Link className="stats-task__name" to={batchPath(batch.id)}>
      {batch.app}
    </Link>
  );
  const batchLink = (
    <Link className="task-monitor-aux" to={batchPath(batch.id)}>
      批次 #{batch.id}
    </Link>
  );
  if (state === "idle" || state === "stopped" || state === "error") {
    return (
      <div className="stats-task">
        {state === "error" ? <Typography.Text type="danger">派单失败：执行机-01 心跳超时，没有领走这一批。</Typography.Text> : null}
        <Typography.Text type="secondary">现在没有在跑的任务。</Typography.Text>
        {state === "stopped" ? (
          <div className="stats-task__line">
            <Tag color="orange">自动续跑已停</Tag>
            <Typography.Text type="secondary">连续续跑 3 轮仍有户未完成，已到上限。</Typography.Text>
          </div>
        ) : null}
      </div>
    );
  }

  if (state === "running" || state === "wlerror") {
    // 演示：「推进一步」每次把 6 户从未结挪到完成，用来看更新时只平滑变宽、不回 0
    const base = TASK_COUNTS.running;
    const moved = Math.min(base.queued, step * 6);
    const counts: TaskCounts = { ...base, done: base.done + moved, queued: base.queued - moved };
    return (
      <div className="stats-task">
        <div className="stats-task__line">
          {nameLink}
          <Tag color="processing">进行中</Tag>
          <Tag color="blue">MIS_ID {batch.misId}</Tag>
          {batch.round >= 2 ? <Tag color="purple">第 {batch.round} 轮</Tag> : null}
          <Tag color="blue">{batch.area}</Tag>
          <Typography.Text type="secondary" className="task-monitor-aux">
            机器人 {batch.robot}
          </Typography.Text>
          {batch.pack ? (
            <Tag color="success" className="task-monitor-aux">
              运行包 {batch.pack}
            </Tag>
          ) : (
            <Tag className="task-monitor-aux">仓库脚本</Tag>
          )}
          {batchLink}
        </div>
        <TaskProgress counts={counts} flowing />
        {state === "wlerror" ? (
          <Typography.Text type="danger" className="stats-task__note">
            白名单列读失败：税费种认定列不存在或没有读权限。
          </Typography.Text>
        ) : (
          <CountTags counts={counts} whitelist />
        )}
        <div className="stats-task__doing">
          <Tag color="blue">正在</Tag>
          {batch.doing}
        </div>
      </div>
    );
  }

  if (state === "pending") {
    return (
      <div className="stats-task">
        <TaskProgress empty paused />
        <Typography.Text type="secondary">已派单，白名单进度还没回写。</Typography.Text>
      </div>
    );
  }

  // unfinished / abnormal：有未完成批次但执行器空闲
  const failed = state === "abnormal";
  return (
    <div className="stats-task">
      <div className="stats-task__line">
        {nameLink}
        <Tag color={failed ? "error" : "default"}>{failed ? "异常" : "未完成"}</Tag>
        <Tag color="blue">MIS_ID {batch.misId}</Tag>
        <Tag color="blue">{batch.area}</Tag>
        {batchLink}
      </div>
      <TaskProgress counts={TASK_COUNTS[failed ? "abnormal" : "unfinished"]} paused={!failed} />
      <CountTags counts={TASK_COUNTS[failed ? "abnormal" : "unfinished"]} whitelist={false} />
      <Typography.Text type="secondary">
        执行器空闲{failed ? "（本批已停）" : ""}。未完成户可在高级任务计划对该任务点「开始」续跑。
      </Typography.Text>
      {!failed ? (
        <div className="stats-task__line">
          <Tag color="gold">自动续跑</Tag>
          <Typography.Text type="secondary">
            上一轮有户在冷却 / 日切，计划 {dayjs().add(1, "day").format("MM-DD")} 00:10 自动开始
          </Typography.Text>
          <Button type="primary" size="small">
            立即开始
          </Button>
        </div>
      ) : null}
    </div>
  );
}

const BATCH_TAG: Record<BatchStatus, { color: string; text: string }> = {
  running: { color: "processing", text: "进行中" },
  unfinished: { color: "default", text: "未完成" },
  done: { color: "success", text: "完成" },
  abnormal: { color: "error", text: "异常" },
  stopped: { color: "default", text: "已停止" },
};

/** 文档按每行约 48px 估。这套行（内边距 8px 10px、两行字、间距 4px）实测一行连间距是 60px 左右，按 48 估会切掉最后几行，所以先量第一行的真实高度，没有行时才用 48 */
const ROW_ESTIMATE = 48;

export type ListState = "ok" | "empty" | "error";

/** 左栏最下面一张卡：「最近批次 / 各应用队列」。行数按卡身高度 / 每行高估，最少 3、最多 15。 */
export function RecentCard({
  loading,
  batches,
  queues,
  batchState,
  queueState,
}: {
  loading: boolean;
  batches: BatchRow[];
  queues: QueueRow[];
  batchState: ListState;
  queueState: ListState;
}) {
  const [tab, setTab] = useState<"batches" | "queues">("batches");
  const bodyRef = useRef<HTMLDivElement>(null);
  const [rows, setRows] = useState(3);

  useEffect(() => {
    const node = bodyRef.current;
    if (!node) return;
    const measure = () => {
      const first = node.querySelector<HTMLElement>(".activity-log__item");
      const pitch = first ? first.offsetHeight + 4 : ROW_ESTIMATE;
      setRows(Math.max(3, Math.min(15, Math.floor((node.clientHeight + 4) / pitch))));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const queueRows = [...queues]
    .filter((row) => row.total > 0)
    .sort((a, b) => b.failed - a.failed || b.running - a.running || b.queued - a.queued)
    .slice(0, rows);

  const batchList =
    batchState === "error" ? (
      <Typography.Text type="danger">拿不到批次</Typography.Text>
    ) : batchState === "empty" || batches.length === 0 ? (
      <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="还没有批次" />
    ) : (
      <ul className="activity-log is-zebra">
        {batches.slice(0, rows).map((row, rowIndex, shownBatches) => {
          const tag = BATCH_TAG[row.status];
          const at = row.at ? dayjs(row.at) : null;
          return (
            <li className="activity-log__item dash-queue-item" style={queueItemStyle(rowIndex, shownBatches.length)} key={row.id}>
              <span className="activity-log__date stats-recent__when">{at ? <><b>{at.format("MM-DD")}</b><small>{at.format("HH:mm")}</small></> : <b>—</b>}</span>
              <div className="activity-log__body">
                <Link className="activity-log__title stats-recent__link" to={batchPath(row.id)}>
                  {row.app}
                </Link>
                <div className="activity-log__sub">
                  #{row.id}
                  {row.mis != null ? ` · MIS ${row.mis}` : ""}
                </div>
              </div>
              <Tag color={tag.color} style={{ margin: 0 }}>
                {tag.text}
              </Tag>
            </li>
          );
        })}
      </ul>
    );

  const queueList =
    queueState === "error" ? (
      <Typography.Text type="danger">拿不到工作队列</Typography.Text>
    ) : queueState === "empty" || queueRows.length === 0 ? (
      <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="还没有队列项" />
    ) : (
      <ul className="activity-log is-zebra">
        {queueRows.map((row, rowIndex) => (
          <li className="activity-log__item dash-queue-item" style={queueItemStyle(rowIndex, queueRows.length)} key={row.name}>
            <div className="activity-log__body">
              <Link className="activity-log__title stats-recent__link" to={queuePath(row.name)}>
                {row.name}
              </Link>
              <div className="activity-log__sub">
                共 {row.total} 项 · 已完成 {row.done}
              </div>
            </div>
            <span className="stats-recent__tags">
              {row.running > 0 ? <Tag color="processing">运行 {row.running}</Tag> : null}
              {row.queued > 0 ? <Tag color="blue">排队 {row.queued}</Tag> : null}
              {row.failed > 0 ? (
                <Link to={queuePath(row.name, true)}>
                  <Tag color="error" style={{ cursor: "pointer" }}>
                    失败 {row.failed}
                  </Tag>
                </Link>
              ) : null}
              {row.running + row.queued + row.failed === 0 ? <Tag>空闲</Tag> : null}
            </span>
          </li>
        ))}
      </ul>
    );

  return (
    <article className="stats-card stats-recent">
      <Tabs
        size="small"
        activeKey={tab}
        onChange={(key) => setTab(key as "batches" | "queues")}
        tabBarExtraContent={
          tab === "batches" ? (
            <Link className="stats-recent__more" to={RECORDS_PATH}>
              全部记录
            </Link>
          ) : (
            <Link className="stats-recent__more" to={QUEUE_PATH}>
              更多
            </Link>
          )
        }
        items={[
          { key: "batches", label: "最近批次" },
          { key: "queues", label: "各应用队列" },
        ]}
      />
      <div className="stats-recent__body" ref={bodyRef}>
        <div className="stats-recent__list">
          {loading ? (
            <div className="skel-body" aria-hidden="true">
              {Array.from({ length: 3 }, (_, index) => (
                <i key={index} className="skel-line" style={{ width: ["100%", "72%", "88%"][index] }} />
              ))}
            </div>
          ) : tab === "batches" ? (
            batchList
          ) : (
            queueList
          )}
        </div>
      </div>
    </article>
  );
}
