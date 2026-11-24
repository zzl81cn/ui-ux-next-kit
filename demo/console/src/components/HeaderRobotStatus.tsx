import { RobotOutlined } from "@ant-design/icons";
import { Avatar, Tooltip } from "antd";
import { useSyncExternalStore } from "react";
import { useNavigate } from "react-router-dom";
import { sortOnline, useRobots } from "../mock/robots";
import { RobotMemberAvatars } from "./RobotMemberAvatars";

function subscribeNarrow(onChange: () => void) {
  const media = window.matchMedia("(max-width: 767.98px)");
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

function readNarrow() {
  return window.matchMedia("(max-width: 767.98px)").matches;
}

/** 顶栏执行机：只放在线的。还没列表时是一颗空图标，不放转圈。 */
export function HeaderRobotStatus() {
  const navigate = useNavigate();
  const narrow = useSyncExternalStore(subscribeNarrow, readNarrow, () => false);
  const { phase, robots } = useRobots();
  const online = robots.filter((robot) => robot.online).sort(sortOnline);
  const goWorkers = () => navigate("/workers");
  const size = narrow ? 22 : 24;
  const maxCount = narrow ? 3 : 5;

  if (online.length === 0) {
    const failed = phase === "error";
    return (
      <Tooltip title={failed ? "机器人状态加载失败" : "无在线机器人"}>
        <button type="button" className="console-header-robots console-header-robots--empty" data-phase={phase} aria-label="无在线机器人，打开执行机" onClick={goWorkers}>
          <Avatar size={size} className="console-header-robots__empty-avatar" icon={<RobotOutlined />} />
        </button>
      </Tooltip>
    );
  }

  const running = online.filter((robot) => robot.running).length;
  const label = running > 0 ? `在线 ${online.length} · 运行中 ${running}` : `在线 ${online.length}`;

  return (
    <div className="console-header-robots" data-phase={phase} aria-label={label}>
      <RobotMemberAvatars
        variant="sponsors"
        members={online}
        maxCount={maxCount}
        size={size}
        showStatusDot
        manageLabel="执行机"
        onManage={goWorkers}
      />
    </div>
  );
}
