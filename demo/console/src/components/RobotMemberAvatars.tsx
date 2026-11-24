import { Avatar, Popover, Tag, Typography } from "antd";
import type { CSSProperties, ReactNode } from "react";
import { avatarLetters, avatarTone } from "../lib/avatarTone";

/** 顶栏、当前任务、分组表共用的一颗圆。 */
export type RobotMemberAvatarItem = {
  id: string;
  name: string;
  online: boolean;
  running?: boolean;
  username?: string | null;
  host_ip?: string | null;
  owner?: string | null;
  remark?: string | null;
};

export type RobotMemberAvatarsVariant = "group" | "sponsors";

export type RobotMemberAvatarsProps = {
  members: RobotMemberAvatarItem[];
  /** group = 叠放组；sponsors = 顶栏条 */
  variant?: RobotMemberAvatarsVariant;
  maxCount?: number;
  size?: number;
  empty?: ReactNode;
  onManage?: () => void;
  manageLabel?: string;
  showStatusDot?: boolean;
  /** 只有当前任务传入。分组表和顶栏不做进场。 */
  cradle?: boolean;
};

const DEFAULT_MAX = 6;
const DEFAULT_SIZE = 28;
const SPONSORS_SIZE = 22;

function statusLabel(robot: Pick<RobotMemberAvatarItem, "online" | "running">) {
  return !robot.online ? "离线" : robot.running ? "运行中" : "空闲";
}

function statusTag(robot: Pick<RobotMemberAvatarItem, "online" | "running">) {
  const label = statusLabel(robot);
  if (!robot.online) return <Tag>{label}</Tag>;
  return robot.running ? <Tag color="blue">{label}</Tag> : <Tag color="green">{label}</Tag>;
}

function memberDesc(robot: RobotMemberAvatarItem): string {
  const bits = [
    robot.username ? `登录名 ${robot.username}` : null,
    robot.host_ip ? `IP ${robot.host_ip}` : null,
    robot.owner ? `操作员 ${robot.owner}` : null,
    robot.remark?.trim() || null,
  ].filter(Boolean);
  return bits.length > 0 ? bits.join(" · ") : "暂无更多信息";
}

function MemberPopoverCard({
  robot,
  onManage,
  manageLabel,
}: {
  robot: RobotMemberAvatarItem;
  onManage?: () => void;
  manageLabel: string;
}) {
  return (
    <div className="robot-member-popover">
      <div className="robot-member-popover__main">
        <Avatar size={48} shape="square" style={{ backgroundColor: avatarTone(robot.id), flex: "none" }}>
          {avatarLetters(robot.name)}
        </Avatar>
        <div className="robot-member-popover__copy">
          <div className="robot-member-popover__title">{robot.name}</div>
          <div className="robot-member-popover__desc">{memberDesc(robot)}</div>
        </div>
      </div>
      <div className="robot-member-popover__footer">
        {statusTag(robot)}
        {onManage ? (
          <Typography.Link
            onClick={(event) => {
              event.preventDefault();
              onManage();
            }}
          >
            {manageLabel}
          </Typography.Link>
        ) : null}
      </div>
    </div>
  );
}

function OverflowList({
  members,
  onManage,
  manageLabel,
  size,
}: {
  members: RobotMemberAvatarItem[];
  onManage?: () => void;
  manageLabel: string;
  size: number;
}) {
  return (
    <div className="robot-member-overflow">
      {members.map((robot) => (
        <div key={robot.id} className="robot-member-overflow__row">
          <Avatar size={size} style={{ backgroundColor: avatarTone(robot.id), flex: "none" }}>
            {avatarLetters(robot.name)}
          </Avatar>
          <span className="robot-member-overflow__name">{robot.name}</span>
          {statusTag(robot)}
        </div>
      ))}
      {onManage ? (
        <Typography.Link
          onClick={(event) => {
            event.preventDefault();
            onManage();
          }}
        >
          {manageLabel}
        </Typography.Link>
      ) : null}
    </div>
  );
}

function statusDotClass(robot: Pick<RobotMemberAvatarItem, "online" | "running">) {
  if (!robot.online) return "robot-member-avatar__dot--offline";
  return robot.running ? "robot-member-avatar__dot--running" : "robot-member-avatar__dot--idle";
}

function statusChipClass(robot: Pick<RobotMemberAvatarItem, "online" | "running">) {
  if (!robot.online) return "robot-member-avatar--offline";
  return robot.running ? "robot-member-avatar--running" : "robot-member-avatar--online";
}

function MemberChip({
  robot,
  size,
  onManage,
  manageLabel,
  className,
  showStatusDot,
  stackIndex,
  hoverDelay,
}: {
  robot: RobotMemberAvatarItem;
  size: number;
  onManage?: () => void;
  manageLabel: string;
  className?: string;
  showStatusDot?: boolean;
  stackIndex?: number;
  hoverDelay: boolean;
}) {
  const avatarStyle = robot.online ? { backgroundColor: avatarTone(robot.id) } : undefined;
  return (
    <Popover
      trigger="hover"
      mouseEnterDelay={hoverDelay ? 0.08 : 0}
      mouseLeaveDelay={hoverDelay ? 0.12 : 0}
      placement="bottom"
      arrow={{ pointAtCenter: true }}
      styles={{ content: { padding: 0 } }}
      content={<MemberPopoverCard robot={robot} onManage={onManage} manageLabel={manageLabel} />}
    >
      <span
        className={["robot-member-avatar", statusChipClass(robot), className].filter(Boolean).join(" ")}
        style={stackIndex != null ? ({ "--i": stackIndex } as CSSProperties) : undefined}
        tabIndex={0}
        aria-label={`${robot.name} · ${statusLabel(robot)}`}
      >
        <Avatar size={size} style={avatarStyle}>
          {avatarLetters(robot.name)}
        </Avatar>
        {showStatusDot ? <span className={["robot-member-avatar__dot", statusDotClass(robot)].join(" ")} aria-hidden /> : null}
      </span>
    </Popover>
  );
}

function GroupVariant({
  members,
  maxCount,
  size,
  onManage,
  manageLabel,
  showStatusDot,
  cradle,
}: {
  members: RobotMemberAvatarItem[];
  maxCount: number;
  size: number;
  onManage?: () => void;
  manageLabel: string;
  showStatusDot?: boolean;
  cradle?: boolean;
}) {
  const visible = members.slice(0, maxCount);
  const rest = members.slice(maxCount);
  const lastIndex = visible.length + (rest.length > 0 ? 1 : 0) - 1;
  return (
    <Avatar.Group
      className={["robot-member-avatars", "robot-member-avatars--group", cradle ? "robot-member-avatars--cradle" : ""]
        .filter(Boolean)
        .join(" ")}
      size={size}
      shape="circle"
    >
      {visible.map((robot, index) => (
        <MemberChip
          key={robot.id}
          robot={robot}
          size={size}
          stackIndex={index}
          className={index === lastIndex ? "is-tail" : undefined}
          onManage={onManage}
          manageLabel={manageLabel}
          showStatusDot={showStatusDot}
          hoverDelay
        />
      ))}
      {rest.length > 0 ? (
        <Popover
          trigger="hover"
          mouseEnterDelay={0.08}
          mouseLeaveDelay={0.12}
          placement="bottom"
          arrow={{ pointAtCenter: true }}
          content={<OverflowList members={rest} onManage={onManage} manageLabel={manageLabel} size={size} />}
        >
          <span
            className="robot-member-avatar robot-member-avatar--more is-tail"
            style={{ "--i": visible.length } as CSSProperties}
            tabIndex={0}
            aria-label={`还有 ${rest.length} 台`}
          >
            <Avatar
              size={size}
              style={{
                backgroundColor: "var(--robot-avatar-offline-bg)",
                color: "var(--robot-avatar-offline-fg)",
                cursor: "pointer",
              }}
            >
              +{rest.length}
            </Avatar>
          </span>
        </Popover>
      ) : null}
    </Avatar.Group>
  );
}

function SponsorsVariant({
  members,
  maxCount,
  size,
  onManage,
  manageLabel,
  showStatusDot,
}: {
  members: RobotMemberAvatarItem[];
  maxCount: number;
  size: number;
  onManage?: () => void;
  manageLabel: string;
  showStatusDot?: boolean;
}) {
  const visible = members.slice(0, maxCount);
  const rest = members.slice(maxCount);
  return (
    <div className="robot-member-avatars robot-member-avatars--sponsors">
      {visible.map((robot) => (
        <MemberChip
          key={robot.id}
          robot={robot}
          size={size}
          onManage={onManage}
          manageLabel={manageLabel}
          showStatusDot={showStatusDot}
          hoverDelay
        />
      ))}
      {rest.length > 0 ? (
        <Popover
          trigger="hover"
          mouseEnterDelay={0}
          mouseLeaveDelay={0}
          placement="bottom"
          arrow={{ pointAtCenter: true }}
          content={<OverflowList members={rest} onManage={onManage} manageLabel={manageLabel} size={size} />}
        >
          <button type="button" className="robot-member-avatar robot-member-avatar--more" aria-label={`还有 ${rest.length} 台`}>
            <Avatar
              size={size}
              style={{
                backgroundColor: "var(--robot-avatar-offline-bg)",
                color: "var(--robot-avatar-offline-fg)",
              }}
            >
              +{rest.length}
            </Avatar>
          </button>
        </Popover>
      ) : null}
    </div>
  );
}

export function RobotMemberAvatars({
  members,
  variant = "group",
  maxCount = DEFAULT_MAX,
  size,
  empty = null,
  onManage,
  manageLabel = "管理组员",
  showStatusDot = false,
  cradle = false,
}: RobotMemberAvatarsProps) {
  if (members.length === 0) return <>{empty}</>;
  const resolvedSize = size ?? (variant === "sponsors" ? SPONSORS_SIZE : DEFAULT_SIZE);
  const shared = { members, maxCount, size: resolvedSize, onManage, manageLabel, showStatusDot };
  return variant === "sponsors" ? <SponsorsVariant {...shared} /> : <GroupVariant {...shared} cradle={cradle} />;
}
