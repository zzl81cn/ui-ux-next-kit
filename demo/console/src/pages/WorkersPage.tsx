import { Table, Typography } from "antd";
import { useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { RobotMemberAvatars } from "../components/RobotMemberAvatars";
import { membersOf, ROBOT_GROUPS, useRobots, type RobotGroup } from "../mock/robots";

/** 分组表。不进兜底侧栏，顶栏和当前任务的「执行机」进这里。 */
export function WorkersPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { robots } = useRobots();
  const managing = ROBOT_GROUPS.find((group) => group.id === params.get("group"));
  const rows = useMemo(() => ROBOT_GROUPS.map((group) => ({ ...group, members: membersOf(group.robot_ids, robots) })), [robots]);

  return (
    <div className="console-page">
      {managing ? <p className="workers-managing">管理组员：{managing.name}</p> : null}
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
    </div>
  );
}
