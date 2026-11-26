import { Empty, Segmented } from "antd";
import { useRef, useState } from "react";
import { CommandTimeline, STATUS_META, type RunStatus, type TimelineHours } from "../charts/CommandTimeline";

const LEGEND: RunStatus[] = ["success", "failed", "running", "cancelled"];

/**
 * 执行时间轴卡：卡头标题加「24 小时 / 7 天」，图例一行，下面是图。
 * 图由调用方在「图表进场延迟」之后才挂载（loading 为 true 时是骨架），和其他图表共用同一个起步时刻。
 */
export function TimelineCard({ loading, empty = false }: { loading: boolean; empty?: boolean }) {
  const [hours, setHours] = useState<TimelineHours>(24);
  const now = useRef(Date.now()).current;
  return (
    <article className="stats-card stats-timeline-card">
      <div className="stats-timeline__head">
        <h2>执行时间轴</h2>
        <Segmented<TimelineHours>
          size="small"
          value={hours}
          onChange={setHours}
          options={[
            { label: "24 小时", value: 24 },
            { label: "7 天", value: 168 },
          ]}
        />
      </div>
      <div className="stats-timeline__legend">
        {LEGEND.map((key) => (
          <span key={key} className="stats-timeline__key">
            <i style={{ background: STATUS_META[key].color }} />
            {STATUS_META[key].label}
          </span>
        ))}
        <span className="stats-timeline__hint">每段是一次派单，从执行机领走到结束</span>
      </div>
      {loading ? (
        <div className="skel-body" style={{ minHeight: 160 }}>
          <i className="skel-line" style={{ width: "100%" }} />
          <i className="skel-line" style={{ width: "72%" }} />
          <i className="skel-line" style={{ width: "88%" }} />
        </div>
      ) : empty ? (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={`近 ${hours === 24 ? "24 小时" : "7 天"}没有被执行机领走的派单`} />
      ) : (
        <CommandTimeline hours={hours} now={now} />
      )}
    </article>
  );
}
