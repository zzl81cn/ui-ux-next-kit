import { Table, Typography, message } from "antd";
import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ManageRobotsModal } from "../components/ManageRobotsModal";
import { RobotMemberAvatars } from "../components/RobotMemberAvatars";
import { membersOf, ROBOT_GROUPS, useRobots, type RobotGroup } from "../mock/robots";

/** 分组表。不进兜底侧栏，顶栏和当前任务的「执行机」进这里。 */
export function WorkersPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { robots } = useRobots();
  const [groups, setGroups] = useState<RobotGroup[]>(ROBOT_GROUPS);
  const managing = groups.find((group) => group.id === params.get("group"));
  const rows = useMemo(() => groups.map((group) => ({ ...group, members: membersOf(group.robot_ids, robots) })), [groups, robots]);

  return (
    <div className="console-page">
      <Table<RobotGroup & { members: ReturnType<typeof membersOf> }>
        rowKey="id"
        pagination={false}
        dataSource={rows}
        columns={[
          { title: "分组名称", dataIndex: "name", width: 160 },
          {
            title: "组内机器人",
            width: 220,
            render: (_, group) => (
              <RobotMemberAvatars
                variant="group"
                members={group.members}
                manageLabel="管理组员"
                onManage={() => navigate(`/workers?group=${group.id}`)}
                empty={<Typography.Text type="secondary">—</Typography.Text>}
              />
            ),
          },
          { title: "机器人数", width: 100, render: (_, group) => group.robot_ids.length },
        ]}
      />
      {managing ? (
        <ManageRobotsModal
          key={managing.id}
          groupName={managing.name}
          robots={robots}
          memberIds={managing.robot_ids}
          onCancel={() => navigate("/workers")}
          onOk={async (ids) => {
            await new Promise((resolve) => window.setTimeout(resolve, 400));
            setGroups((prev) => prev.map((group) => (group.id === managing.id ? { ...group, robot_ids: ids } : group)));
            message.success("已保存");
            navigate("/workers");
          }}
        />
      ) : null}
    </div>
  );
}
