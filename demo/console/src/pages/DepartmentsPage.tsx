import {
  DeleteOutlined,
  EditOutlined,
  NodeCollapseOutlined,
  NodeExpandOutlined,
  PlusOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import { Button, Empty, Form, Input, Modal, Space, TreeSelect, message } from "antd";
import type { DataNode } from "antd/es/tree";
import { useMemo, useState } from "react";
import { PageHelpTip } from "../components/PageHelpTip";
import { DeptGraphTree } from "./departments/DeptGraphTree";

type Dept = {
  id: string;
  name: string;
  parent_id: string | null;
  sort_order: number;
  user_count: number;
  extra_user_count: number;
  app_count: number;
  robot_count: number;
  group_count: number;
};

type DeptNode = Dept & { children?: DeptNode[]; level: number };

const ROOT_ID = "dept_root";
const DRAG_HELP = "拖拽行首仅调整同级顺序。更换上级请点「编辑」，在弹窗里改上级部门。";

const SEED: Dept[] = [
  { id: ROOT_ID, name: "示例公司", parent_id: null, sort_order: 0, user_count: 0, extra_user_count: 0, app_count: 0, robot_count: 0, group_count: 0 },
  { id: "d-rd", name: "研发中心", parent_id: ROOT_ID, sort_order: 0, user_count: 28, extra_user_count: 2, app_count: 9, robot_count: 5, group_count: 3 },
  { id: "d-fe", name: "前端", parent_id: "d-rd", sort_order: 0, user_count: 8, extra_user_count: 0, app_count: 3, robot_count: 0, group_count: 1 },
  { id: "d-fe-web", name: "Web 端", parent_id: "d-fe", sort_order: 0, user_count: 4, extra_user_count: 0, app_count: 2, robot_count: 0, group_count: 0 },
  { id: "d-fe-mobile", name: "移动端", parent_id: "d-fe", sort_order: 1, user_count: 3, extra_user_count: 0, app_count: 1, robot_count: 0, group_count: 0 },
  { id: "d-fe-design", name: "体验体验", parent_id: "d-fe", sort_order: 2, user_count: 1, extra_user_count: 0, app_count: 0, robot_count: 0, group_count: 0 },
  { id: "d-be", name: "后端", parent_id: "d-rd", sort_order: 1, user_count: 11, extra_user_count: 1, app_count: 4, robot_count: 2, group_count: 1 },
  { id: "d-be-api", name: "平台服务", parent_id: "d-be", sort_order: 0, user_count: 5, extra_user_count: 0, app_count: 2, robot_count: 1, group_count: 0 },
  { id: "d-be-data", name: "数据服务", parent_id: "d-be", sort_order: 1, user_count: 4, extra_user_count: 1, app_count: 1, robot_count: 1, group_count: 0 },
  { id: "d-be-infra", name: "基础架构", parent_id: "d-be", sort_order: 2, user_count: 2, extra_user_count: 0, app_count: 1, robot_count: 0, group_count: 1 },
  { id: "d-qa", name: "质量保障", parent_id: "d-rd", sort_order: 2, user_count: 5, extra_user_count: 0, app_count: 1, robot_count: 2, group_count: 1 },
  { id: "d-qa-auto", name: "自动化测试", parent_id: "d-qa", sort_order: 0, user_count: 3, extra_user_count: 0, app_count: 1, robot_count: 2, group_count: 1 },
  { id: "d-qa-manual", name: "业务测试", parent_id: "d-qa", sort_order: 1, user_count: 2, extra_user_count: 0, app_count: 0, robot_count: 0, group_count: 0 },
  { id: "d-sre", name: "运维与 SRE", parent_id: "d-rd", sort_order: 3, user_count: 4, extra_user_count: 1, app_count: 1, robot_count: 1, group_count: 0 },
  { id: "d-ops", name: "运营中心", parent_id: ROOT_ID, sort_order: 1, user_count: 18, extra_user_count: 1, app_count: 3, robot_count: 1, group_count: 4 },
  { id: "d-north", name: "华北大区", parent_id: "d-ops", sort_order: 0, user_count: 6, extra_user_count: 0, app_count: 1, robot_count: 0, group_count: 2 },
  { id: "d-north-bj", name: "北京站", parent_id: "d-north", sort_order: 0, user_count: 3, extra_user_count: 0, app_count: 1, robot_count: 0, group_count: 1 },
  { id: "d-north-tj", name: "天津站", parent_id: "d-north", sort_order: 1, user_count: 2, extra_user_count: 0, app_count: 0, robot_count: 0, group_count: 1 },
  { id: "d-north-sjz", name: "石家庄站", parent_id: "d-north", sort_order: 2, user_count: 1, extra_user_count: 0, app_count: 0, robot_count: 0, group_count: 0 },
  { id: "d-east", name: "华东大区", parent_id: "d-ops", sort_order: 1, user_count: 7, extra_user_count: 1, app_count: 1, robot_count: 1, group_count: 1 },
  { id: "d-east-sh", name: "上海站", parent_id: "d-east", sort_order: 0, user_count: 4, extra_user_count: 1, app_count: 1, robot_count: 1, group_count: 1 },
  { id: "d-east-hz", name: "杭州站", parent_id: "d-east", sort_order: 1, user_count: 2, extra_user_count: 0, app_count: 0, robot_count: 0, group_count: 0 },
  { id: "d-east-nj", name: "南京站", parent_id: "d-east", sort_order: 2, user_count: 1, extra_user_count: 0, app_count: 0, robot_count: 0, group_count: 0 },
  { id: "d-south", name: "华南大区", parent_id: "d-ops", sort_order: 2, user_count: 5, extra_user_count: 0, app_count: 1, robot_count: 0, group_count: 1 },
  { id: "d-south-sz", name: "深圳站", parent_id: "d-south", sort_order: 0, user_count: 3, extra_user_count: 0, app_count: 1, robot_count: 0, group_count: 1 },
  { id: "d-south-gz", name: "广州站", parent_id: "d-south", sort_order: 1, user_count: 2, extra_user_count: 0, app_count: 0, robot_count: 0, group_count: 0 },
  { id: "d-prod", name: "产品与设计", parent_id: ROOT_ID, sort_order: 2, user_count: 9, extra_user_count: 0, app_count: 2, robot_count: 0, group_count: 1 },
  { id: "d-prod-pm", name: "产品经理", parent_id: "d-prod", sort_order: 0, user_count: 5, extra_user_count: 0, app_count: 1, robot_count: 0, group_count: 0 },
  { id: "d-prod-ux", name: "用户体验", parent_id: "d-prod", sort_order: 1, user_count: 3, extra_user_count: 0, app_count: 1, robot_count: 0, group_count: 1 },
  { id: "d-prod-research", name: "用户研究", parent_id: "d-prod", sort_order: 2, user_count: 1, extra_user_count: 0, app_count: 0, robot_count: 0, group_count: 0 },
  { id: "d-sales", name: "销售部", parent_id: ROOT_ID, sort_order: 3, user_count: 14, extra_user_count: 2, app_count: 1, robot_count: 0, group_count: 2 },
  { id: "d-sales-ka", name: "大客户", parent_id: "d-sales", sort_order: 0, user_count: 6, extra_user_count: 1, app_count: 1, robot_count: 0, group_count: 1 },
  { id: "d-sales-smb", name: "中小企业", parent_id: "d-sales", sort_order: 1, user_count: 5, extra_user_count: 1, app_count: 0, robot_count: 0, group_count: 1 },
  { id: "d-sales-partner", name: "渠道伙伴", parent_id: "d-sales", sort_order: 2, user_count: 3, extra_user_count: 0, app_count: 0, robot_count: 0, group_count: 0 },
  { id: "d-cs", name: "客户成功", parent_id: ROOT_ID, sort_order: 4, user_count: 7, extra_user_count: 0, app_count: 1, robot_count: 1, group_count: 1 },
  { id: "d-cs-impl", name: "实施交付", parent_id: "d-cs", sort_order: 0, user_count: 4, extra_user_count: 0, app_count: 1, robot_count: 1, group_count: 1 },
  { id: "d-cs-support", name: "售后支持", parent_id: "d-cs", sort_order: 1, user_count: 3, extra_user_count: 0, app_count: 0, robot_count: 0, group_count: 0 },
  { id: "d-fin", name: "财务部", parent_id: ROOT_ID, sort_order: 5, user_count: 5, extra_user_count: 0, app_count: 0, robot_count: 0, group_count: 0 },
  { id: "d-fin-acc", name: "会计核算", parent_id: "d-fin", sort_order: 0, user_count: 3, extra_user_count: 0, app_count: 0, robot_count: 0, group_count: 0 },
  { id: "d-fin-tax", name: "税务与资金", parent_id: "d-fin", sort_order: 1, user_count: 2, extra_user_count: 0, app_count: 0, robot_count: 0, group_count: 0 },
  { id: "d-hr", name: "人力资源", parent_id: ROOT_ID, sort_order: 6, user_count: 4, extra_user_count: 0, app_count: 0, robot_count: 0, group_count: 0 },
  { id: "d-hr-recruit", name: "招聘", parent_id: "d-hr", sort_order: 0, user_count: 2, extra_user_count: 0, app_count: 0, robot_count: 0, group_count: 0 },
  { id: "d-hr-bp", name: "员工关系", parent_id: "d-hr", sort_order: 1, user_count: 2, extra_user_count: 0, app_count: 0, robot_count: 0, group_count: 0 },
  { id: "d-legal", name: "法务合规", parent_id: ROOT_ID, sort_order: 7, user_count: 2, extra_user_count: 0, app_count: 0, robot_count: 0, group_count: 0 },
  { id: "d-admin", name: "行政后勤", parent_id: ROOT_ID, sort_order: 8, user_count: 3, extra_user_count: 0, app_count: 0, robot_count: 0, group_count: 0 },
];

function usageText(row: Dept) {
  return [
    row.user_count ? `用户 ${row.user_count}` : "",
    row.extra_user_count ? `兼职 ${row.extra_user_count}` : "",
    row.app_count ? `应用 ${row.app_count}` : "",
    row.robot_count ? `机器人 ${row.robot_count}` : "",
    row.group_count ? `组 ${row.group_count}` : "",
  ]
    .filter(Boolean)
    .join(" · ");
}

function buildTree(rows: Dept[]): DeptNode[] {
  const byParent = new Map<string | null, Dept[]>();
  for (const row of rows) {
    const list = byParent.get(row.parent_id) ?? [];
    list.push(row);
    byParent.set(row.parent_id, list);
  }
  const walk = (parent: string | null, level: number): DeptNode[] =>
    (byParent.get(parent) ?? [])
      .slice()
      .sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name, "zh"))
      .map((row) => {
        const children = walk(row.id, level + 1);
        return { ...row, level, children: children.length ? children : undefined };
      });
  return walk(null, 0);
}

function filterTree(nodes: DeptNode[], keyword: string): DeptNode[] {
  const needle = keyword.trim().toLowerCase();
  if (!needle) return nodes;
  const out: DeptNode[] = [];
  for (const node of nodes) {
    const children = node.children?.length ? filterTree(node.children, keyword) : [];
    if (node.name.toLowerCase().includes(needle) || children.length) {
      out.push({ ...node, children: children.length ? children : undefined });
    }
  }
  return out;
}

function collectExpandableIds(nodes: DeptNode[]): string[] {
  const keys: string[] = [];
  const walk = (list: DeptNode[]) => {
    for (const node of list) {
      if (node.children?.length) {
        keys.push(node.id);
        walk(node.children);
      }
    }
  };
  walk(nodes);
  return keys;
}

function countNodes(nodes: DeptNode[]): number {
  return nodes.reduce((sum, node) => sum + 1 + countNodes(node.children ?? []), 0);
}

function countLevel1(nodes: DeptNode[]): number {
  return nodes[0]?.children?.length ?? 0;
}

function findNode(nodes: DeptNode[], id: string): DeptNode | null {
  for (const node of nodes) {
    if (node.id === id) return node;
    if (node.children) {
      const hit = findNode(node.children, id);
      if (hit) return hit;
    }
  }
  return null;
}

export function DepartmentsPage() {
  const [rows, setRows] = useState<Dept[]>(SEED);
  const [keyword, setKeyword] = useState("");
  const [applied, setApplied] = useState("");
  const [expanded, setExpanded] = useState<string[]>(() => collectExpandableIds(buildTree(SEED)));
  const [editing, setEditing] = useState<DeptNode | null>(null);
  const [creatingParent, setCreatingParent] = useState<string | null>(null);
  const tree = useMemo(() => buildTree(rows), [rows]);
  const view = useMemo(() => filterTree(tree, applied), [tree, applied]);
  const searching = applied.trim() !== "";

  function reorder(dragId: string, targetId: string, position: "before" | "after") {
    const drag = rows.find((row) => row.id === dragId);
    const target = rows.find((row) => row.id === targetId);
    if (!drag || !target || drag.parent_id !== target.parent_id || dragId === ROOT_ID) {
      message.warning(dragId === ROOT_ID ? "根部门不能排序" : "只能在同级之间拖拽；换上级请点编辑");
      return;
    }
    const siblings = rows
      .filter((row) => row.parent_id === drag.parent_id && row.id !== dragId)
      .sort((a, b) => a.sort_order - b.sort_order);
    const index = siblings.findIndex((row) => row.id === targetId);
    siblings.splice(position === "before" ? index : index + 1, 0, drag);
    const order = new Map(siblings.map((row, index) => [row.id, index]));
    setRows((prev) => prev.map((row) => (order.has(row.id) ? { ...row, sort_order: order.get(row.id) ?? row.sort_order } : row)));
  }

  const parentTree = (blocked: Set<string>): DataNode[] => {
    const walk = (nodes: DeptNode[]): DataNode[] =>
      nodes
        .filter((node) => !blocked.has(node.id))
        .map((node) => ({ title: node.name, value: node.id, key: node.id, children: node.children ? walk(node.children) : undefined }));
    return walk(tree);
  };

  return (
    <div className="console-page dept-page">
      <section className="dept-tree-summary">
        <div className="dept-tree-summary__main">
          <h2 className="dept-tree-summary__title">部门概览</h2>
          <div className="dept-tree-summary__metrics">
            <div className="dept-tree-summary__metric">
              <span className="dept-tree-summary__label">一级部门</span>
              <b className="dept-tree-summary__value">{countLevel1(tree)}</b>
              <span className="dept-tree-summary__pill dept-tree-summary__pill--root">个</span>
            </div>
            <div className="dept-tree-summary__metric">
              <span className="dept-tree-summary__label">部门节点</span>
              <b className="dept-tree-summary__value">{countNodes(tree)}</b>
              <span className="dept-tree-summary__pill dept-tree-summary__pill--node">个</span>
            </div>
            {searching ? (
              <div className="dept-tree-summary__metric">
                <span className="dept-tree-summary__label">当前显示</span>
                <b className="dept-tree-summary__value">{countNodes(view)}</b>
                <span className="dept-tree-summary__pill dept-tree-summary__pill--visible">个</span>
              </div>
            ) : null}
          </div>
        </div>
      </section>
      <div className="dept-tree-toolbar">
        <PageHelpTip title="拖拽说明">{DRAG_HELP}</PageHelpTip>
        <Space className="dept-tree-toolbar__controls">
          <Input.Search
            allowClear
            placeholder="搜索部门"
            value={keyword}
            onChange={(event) => {
              setKeyword(event.target.value);
              if (!event.target.value) setApplied("");
            }}
            onSearch={(value) => {
              setApplied(value);
              setExpanded(collectExpandableIds(filterTree(tree, value)));
            }}
          />
          <Button icon={<NodeExpandOutlined />} onClick={() => setExpanded(collectExpandableIds(view))}>
            全部展开
          </Button>
          <Button icon={<NodeCollapseOutlined />} onClick={() => setExpanded([])}>
            全部收起
          </Button>
          <Button icon={<ReloadOutlined />} onClick={() => setExpanded(collectExpandableIds(view))}>
            刷新
          </Button>
        </Space>
      </div>
      <div className={view.length ? "dept-tree-panel dept-tree-panel--scrollable" : "dept-tree-panel dept-tree-panel--empty"}>
        {view.length ? (
          <DeptGraphTree
            nodes={view}
            expandedKeys={expanded}
            getKey={(node) => node.id}
            getChildren={(node) => node.children}
            onExpand={setExpanded}
            draggable={!searching}
            canDragRow={(node) => node.id !== ROOT_ID}
            canDrop={(dragId, targetId) => {
              const drag = findNode(tree, dragId);
              const target = findNode(tree, targetId);
              return Boolean(drag && target && drag.id !== ROOT_ID && drag.parent_id === target.parent_id);
            }}
            onMove={reorder}
            renderRow={(node) => {
              const isRoot = node.id === ROOT_ID;
              const usage = usageText(node);
              return (
                <div className="dept-tree-node">
                  <span className="dept-tree-node__label">
                    <span className="dept-tree-node__name">{node.name}</span>
                    {usage ? <span className="dept-tree-node__meta">{usage}</span> : null}
                  </span>
                  <span className="dept-tree-node__badge">L{node.level}</span>
                  <span className="dept-tree-node__grow" />
                  <span className="dept-tree-node__actions">
                    <Button type="link" className="dept-tree-node__btn" icon={<EditOutlined />} onClick={() => setEditing(node)}>
                      编辑
                    </Button>
                    <Button type="link" className="dept-tree-node__btn" icon={<PlusOutlined />} onClick={() => setCreatingParent(node.id)}>
                      添加子部门
                    </Button>
                    <Button
                      type="link"
                      danger
                      className="dept-tree-node__btn"
                      icon={<DeleteOutlined />}
                      disabled={isRoot}
                      onClick={() => {
                        if (node.children?.length) {
                          message.warning("请先删除或移走下级部门");
                          return;
                        }
                        Modal.confirm({
                          title: "删除部门",
                          content: `删除「${node.name}」？`,
                          okText: "删除",
                          okButtonProps: { danger: true },
                          onOk: () => setRows((prev) => prev.filter((row) => row.id !== node.id)),
                        });
                      }}
                    >
                      删除
                    </Button>
                  </span>
                </div>
              );
            }}
          />
        ) : (
          <Empty description="没有匹配的部门" />
        )}
      </div>
      <DeptEditor
        open={Boolean(editing)}
        title="编辑部门"
        initial={editing}
        parents={parentTree(new Set(editing ? [editing.id] : []))}
        lockParent={editing?.id === ROOT_ID}
        onClose={() => setEditing(null)}
        onSubmit={(values) => {
          if (!editing) return;
          setRows((prev) => prev.map((row) => (row.id === editing.id ? { ...row, name: values.name, parent_id: editing.id === ROOT_ID ? null : values.parent_id } : row)));
          setEditing(null);
          message.success("已保存");
        }}
      />
      <DeptEditor
        open={creatingParent !== null}
        title="添加子部门"
        initial={null}
        parents={parentTree(new Set())}
        parentId={creatingParent}
        onClose={() => setCreatingParent(null)}
        onSubmit={(values) => {
          setRows((prev) => [
            ...prev,
            {
              id: `d-${Date.now()}`,
              name: values.name,
              parent_id: values.parent_id,
              sort_order: 99,
              user_count: 0,
              extra_user_count: 0,
              app_count: 0,
              robot_count: 0,
              group_count: 0,
            },
          ]);
          if (values.parent_id) setExpanded((prev) => [...new Set([...prev, values.parent_id])]);
          setCreatingParent(null);
          message.success("已添加");
        }}
      />
    </div>
  );
}

function DeptEditor({
  open,
  title,
  initial,
  parents,
  parentId,
  lockParent,
  onClose,
  onSubmit,
}: {
  open: boolean;
  title: string;
  initial: DeptNode | null;
  parents: DataNode[];
  parentId?: string | null;
  lockParent?: boolean;
  onClose: () => void;
  onSubmit: (values: { name: string; parent_id: string }) => void;
}) {
  const [form] = Form.useForm<{ name: string; parent_id: string }>();
  return (
    <Modal
      title={title}
      open={open}
      onCancel={onClose}
      destroyOnHidden
      okText="保存"
      onOk={() => form.submit()}
      afterOpenChange={(visible) => {
        if (!visible) return;
        form.setFieldsValue({ name: initial?.name ?? "", parent_id: initial?.parent_id ?? parentId ?? ROOT_ID });
      }}
    >
      <Form form={form} layout="vertical" onFinish={onSubmit}>
        <Form.Item name="name" label="名称" rules={[{ required: true, message: "请填写名称" }]}>
          <Input maxLength={40} />
        </Form.Item>
        <Form.Item name="parent_id" label="上级部门">
          <TreeSelect treeData={parents} disabled={lockParent} treeDefaultExpandAll />
        </Form.Item>
      </Form>
    </Modal>
  );
}
