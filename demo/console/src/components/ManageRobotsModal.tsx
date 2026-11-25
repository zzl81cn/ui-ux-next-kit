import { Modal, Table, Tag, Transfer, type TableColumnsType } from "antd";
import type { TransferKey } from "antd/es/transfer/interface";
import { useMemo, useState, type DragEvent } from "react";
import type { RobotRecord } from "../mock/robots";

type Item = RobotRecord & { key: string };

type Drag = { from: "left" | "right"; keys: string[] };

const DRAG_TYPE = "application/x-robot-transfer";

function statusOf(item: Item) {
  if (!item.online) return <Tag>离线</Tag>;
  return item.running ? <Tag color="blue">运行中</Tag> : <Tag color="green">空闲</Tag>;
}

const COLUMNS: TableColumnsType<Item> = [
  { title: "机器人名称", dataIndex: "name", ellipsis: true },
  { title: "状态", width: 90, render: (_, item) => statusOf(item) },
  { title: "上报IP", dataIndex: "host_ip", width: 120, render: (value?: string) => value ?? "—" },
];

function matches(input: string, item: Item) {
  const text = input.trim().toLowerCase();
  if (!text) return true;
  return [item.name, item.username, item.id, item.host_ip].some((field) => (field ?? "").toLowerCase().includes(text));
}

/** 机器人组「管理机器人」。antd Transfer，左右列表用 Table，确定才提交。 */
export function ManageRobotsModal({
  groupName,
  robots,
  memberIds,
  onCancel,
  onOk,
}: {
  groupName: string;
  robots: RobotRecord[];
  memberIds: string[];
  onCancel: () => void;
  onOk: (ids: string[]) => Promise<void> | void;
}) {
  const [targetKeys, setTargetKeys] = useState<string[]>(memberIds);
  const [selected, setSelected] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  // 组成员在机器人列表里已删掉的，右侧仍显示，名称退回 id
  const items = useMemo<Item[]>(() => {
    const known = new Set(robots.map((robot) => robot.id));
    const ghosts = memberIds.filter((id) => !known.has(id)).map((id) => ({ id, name: id, online: false, running: false }));
    return [...robots, ...ghosts].map((robot) => ({ ...robot, key: robot.id }));
  }, [robots, memberIds]);

  const move = (from: "left" | "right", keys: string[]) => {
    if (keys.length === 0) return;
    setTargetKeys((prev) => (from === "left" ? [...new Set([...prev, ...keys])] : prev.filter((key) => !keys.includes(key))));
    setSelected((prev) => prev.filter((key) => !keys.includes(key)));
  };

  const submit = async () => {
    setSaving(true);
    try {
      await onOk(targetKeys);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      title={`管理机器人 · ${groupName}`}
      width="min(920px, 96vw)"
      okText="确定"
      cancelText="取消"
      confirmLoading={saving}
      destroyOnHidden
      centered
      onCancel={onCancel}
      onOk={submit}
      // 面板最高 视口-48px；内容高过它时内容区自己滚，标题和底栏不动
      styles={{ body: { paddingTop: 12, maxHeight: "calc(100vh - 48px - 56px - 64px)", overflowY: "auto" } }}
    >
      <Transfer<Item>
        dataSource={items}
        targetKeys={targetKeys}
        selectedKeys={selected}
        onSelectChange={(source, target) => setSelected([...source, ...target].map(String))}
        onChange={(next) => setTargetKeys(next.map(String))}
        showSearch
        showSelectAll={false}
        filterOption={matches}
        titles={["全部机器人", `已选：${targetKeys.length}个`]}
        locale={{ itemUnit: "个", itemsUnit: "个", searchPlaceholder: "输入机器人账号", notFoundContent: undefined }}
        styles={{ section: { width: 380, height: 420 }, actions: { padding: "0 8px" } }}
      >
        {({ direction, filteredItems, onItemSelect, onItemSelectAll, selectedKeys }) => {
          const picked = selectedKeys.map(String);
          const onDragStart = (event: DragEvent, key: string) => {
            const keys = picked.includes(key) ? picked : [key];
            const payload: Drag = { from: direction, keys };
            event.dataTransfer.setData(DRAG_TYPE, JSON.stringify(payload));
            event.dataTransfer.effectAllowed = "move";
          };
          const onDrop = (event: DragEvent) => {
            event.preventDefault();
            const raw = event.dataTransfer.getData(DRAG_TYPE);
            if (!raw) return;
            const payload = JSON.parse(raw) as Drag;
            if (payload.from === direction) return;
            move(payload.from, payload.keys);
          };
          return (
            <div
              className="robot-transfer-drop"
              onDragOver={(event) => {
                if (event.dataTransfer.types.includes(DRAG_TYPE)) event.preventDefault();
              }}
              onDrop={onDrop}
            >
              <Table<Item>
                size="small"
                rowKey="key"
                pagination={false}
                columns={COLUMNS}
                dataSource={filteredItems}
                scroll={{ y: 280 }}
                locale={{ emptyText: direction === "left" ? "没有可添加的机器人" : "还没选机器人" }}
                rowSelection={{
                  selectedRowKeys: picked,
                  onChange: (keys) => onItemSelectAll(keys as TransferKey[], "replace"),
                }}
                onRow={(item) => ({
                  draggable: true,
                  style: { cursor: "grab" },
                  onDragStart: (event) => onDragStart(event, item.key),
                  onClick: () => onItemSelect(item.key, !picked.includes(item.key)),
                })}
              />
            </div>
          );
        }}
      </Transfer>
    </Modal>
  );
}
