# 规则沉淀建议

| 维度 | rules 约束（示例） | 自动拦截 |
| --- | --- | --- |
| A Token | 颜色/间距/圆角只用 Token | Stylelint `color-no-hex`、`declaration-no-important` |
| 推荐栈 | 新页面 React 19 + Ant Design 6；主题只走 ConfigProvider | 脚手架固定 react@19、antd@6 |
| B 组件 | 映射表「场景 X → 组件 Y」 | `no-restricted-imports` 禁第二套 UI 库 |
| C 布局 | 统一 Layout；内边距用 Token | 代码评审 |
| D 交互 | 三态 + 防重 + 危险确认 | 评审 + 自查清单 |
| H 框架 | 禁全局覆盖组件库类名；弹层挂载统一 | Stylelint 禁 `.ant-*` 全局选择器 |

规则要短、要能对应某次审计发现。
