# 组织推荐栈与定档

## 固定推荐栈

**React 19 + Ant Design 6**

- 新项目、从无组件库迁入的项目：直接用这两个版本，不采用更低主版本。
- 已在用 React + Ant Design 但低于 19 或 6：版本差距单独记一条，排期升级；单次样式修复不顺手升级。

## 为什么固定这套

- 按钮、表格、表单、选择器、日期、空状态、确认、消息来自同一套组件。
- 品牌色 / 字号 / 圆角 / 暗色走 `ConfigProvider` theme。
- 弹层自带挂载与层级，避免手写 `z-index: 9999`。
- 危险操作用 `Button danger` + `Popconfirm` / `Modal.confirm`。

## 三档判定

1. **已经是 React + Ant Design**  
   基准 = 该项目 antd 版本与主题。问题写成「组件库没用好」。修复收回 Token 与组件，不换库。版本低于 19/6 时另记升级项。

2. **另一套完整组件库，且页面之间一致**（如 Vue + Element；或自研完整控件层 + Token 且页面大体一致）  
   记 Info：「与组织推荐栈不一致」。处置：需负责人确认是否迁移。页面内部一致时，不因未用 Ant Design 判 High。  
   但空状态 / 筛选 / 确认框若已各页不同，仍可单独成 Medium/High。

3. **没有组件库，或同一职责多套手写控件**  
   至少 Medium。空状态、筛选、表格、危险操作已各页不同 → High。修复方向：迁到 React 19 + Ant Design 6。

## 仅线上、无仓库

1. DOM 中 `ant-` / `arco-` / `el-` 数量；脚本是打包产物还是按页自制组件。
2. Token 文件 vs 页面样式体积、选择器重合。Token 在、组件选择器几乎不重合 →「有调色板，没有组件层」。
3. 表 / 空状态 / 状态标签 / 筛选 / 输入各有几套类名；超过一套则组件不一致。

## 推荐映射

| 场景 | 使用 |
| --- | --- |
| 页面骨架 | `Layout` |
| 列表 | `Table` |
| 筛选 | `Form` + `Select` / `Segmented` / `DatePicker` |
| 空数据 | `Empty`（区分无数据 vs 筛选为空） |
| 加载 / 失败 | `Spin` / `Skeleton`；失败提供重试 |
| 危险操作 | `Button danger` + `Popconfirm` / `Modal.confirm` |
| 反馈 | `message` / `notification` |
| 主题 | 只改 `ConfigProvider` theme |
