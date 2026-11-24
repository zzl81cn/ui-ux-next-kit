# 规则沉淀建议

| 维度 | rules 约束（示例） | 自动拦截 |
| --- | --- | --- |
| A Token | 颜色/间距/圆角只用 Token | Stylelint `color-no-hex`、`declaration-no-important` |
| 推荐栈 | 实施时复制 `frontend-stack.mdc` 和 `figma-handoff.mdc` 到目标 `.cursor/rules/`。前者锁版本和 antd 6 API，并写明 UI、UX 规范未尽事宜严格按照 antd 的规范实现。后者预防把 Arco 硬套成代码 | 范本 `pnpm verify:console-antd`；新项目拷扫描脚本后改目录 |
| B 组件 | 桌面列表只用一套 DataTable，筛选只用一套筛选条，操作列只用一套间距 | `no-restricted-imports` 禁桌面再引第二套 UI 库 |
| 列表 | 筛选控件高 34px；空状态文案说明是没数据还是筛选为空；满高表用剩余高度，不靠内容撑高反推 | 代码评审；有条件再加 verify |
| 动效 | 进场动画尊重 `prefers-reduced-motion` | 代码评审 |
| C 布局 | 统一 Layout；内边距用 Token | 代码评审 |
| D 交互 | 三态 + 防重 + 危险确认 | 评审 + 自查清单 |
| H 框架 | 禁全局覆盖组件库类名；弹层挂载统一。开工时复制 `templates/cursor-rules/figma-handoff.mdc`：Arco 不硬套，外观走 token，覆盖分批删，交互留 antd 原有行为 | Stylelint 禁 `.ant-*` 全局选择器；`scripts/check-globals.sh` 扫 `.ant-*` 当线索 |
| 发版 | 默认 Jenkins 构建镜像，目标机用生产 compose 拉起。见 `exemplar-deploy.md` | 流水线参数：推送默认开，上线默认关 |

规则要短、要能对应某次审计发现。
