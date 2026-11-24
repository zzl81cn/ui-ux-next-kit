---
name: ui-ux-next-kit
description: >-
  UI/UX Next Kit. When restoring or building a page, read
  references/public-components.md for that section and its checklist before
  writing code. When auditing, stay read-only and write
  YYYYMMDD-[project]UI-UX审计报告.md at the project root. Use when the user
  asks to restore a page, follow the UI contract, audit UI/UX, check style
  pollution, or run ui-ux-next-kit / ui-ux-next-audit / UI-UX审计套件.
---

# UI/UX Next Kit

还原界面时先读本节，再往下看审计。审计才是只读。

## 还原界面

用户要还原、对齐、实现某一页时：

1. 先读 `references/public-components.md` 里对应的节，再读该节验收清单。尺寸、文案、顺序、时长以这份为准。
2. 解剖表里的每一块都要出现。同一处写了多件事要一起做。
3. 组件默认值不要盖过契约里的数字。对不上就改实现，不要改契约。
4. 交卷时每条验收写「做到了」或「做不到」。做不到要写出缺的那个数字。
5. 没写到的交互按 antd 6。
6. `demo/` 里这两处还没对齐，不要当成契约：执行记录「详情」没有 760px 抽屉，运行日志没有 960px 那只；口径说明里仍写着「没测」。

对前端项目做只读 UI/UX 审计时才走下面的流程：定基准 → 按 A–I 维度扫描 → 落盘结构化报告 → 拆修复分组 Prompt → 给出规则沉淀建议。

本仓库是可扩展的 **Kit**（当前主 Skill 为审计）；打包自《UI/UX 审计套件》。详细判定见 `references/`，扫描脚本见 `scripts/`，输出模板见 `templates/`。

## 触发条件

用户意图包含以下任一即可激活：

- 按契约还原或实现某一页
- 审计前端 UI / UX / 页面一致性
- 检查样式污染、硬编码色、`.ant-*` 全局覆盖
- 评估是否符合参考控制台的前端栈（React 19 + Ant Design 6 + ProLayout）
- 生成 UI 修复提示词 / 审计报告
- 提到 `ui-ux-next-kit`、`ui-ux-next-audit` 或「UI-UX审计套件」

## 只读与落盘

下面几条只约束审计。上面的「还原界面」要改目标项目的界面。

- 审计时**不改**产品代码、不提交、不开 PR、不安装依赖。
- 审计时**唯一允许写入**：目标根目录的 `YYYYMMDD-[项目名]UI-UX审计报告.md`。
  - 有仓库 → 仓库根（与 `package.json` / `.git` 同级）
  - 无仓库（仅 URL）→ 当前工作区根，报告开头注明「无仓库，报告落在工作区根目录」
- 不要把报告只留在对话里；不要写进 `src/`、`docs/` 或本 Skill 目录。
- 对话末尾只给**绝对路径** + 一两句摘要。

## 工作流

### 1. 确立基准

1. 读 `package.json`、主题/Token 文件、公共组件目录、Layout、`.cursor/rules` / lint。
2. 对照 `references/tech-stacks.md` 与 `references/exemplar-rpa-console.md` 划定三档之一。新项目以参考控制台为范本：框架版本看「要沿用的」，列表 / 筛选 / 空状态 / 动效看「已经验证、新项目要写成规范的」。仓库要不要前后端同仓，看 `references/exemplar-rpa-architecture.md`，那是可选项。发版默认 Jenkins 打 Docker 镜像，见 `references/exemplar-deploy.md`。规范正文不写具体公司或产品名。
3. 有 Figma：用 MCP；`get_variable_defs` 传**具体帧** node-id，手机/PC 分开；空结果则 `get_design_context` 取色值，并写「设计稿未使用变量」。交付若是 Arco，按 `references/figma-handoff.md`：不要硬套成组件，代码仍是 antd v6，只取色、字号、间距、圆角做 token 对齐。
4. 仅有线上地址：用 DOM 前缀 / 脚本 / 样式体积与选择器重合 / 同类控件类名套数归档；源码项标「未覆盖」。

基准缺失或互相矛盾（两套主色、两套 Layout、两个 UI 库、有 Token 无组件层）本身就是发现，通常 ≥ Medium。

### 2. 只读审计（A–I）

按 `references/audit-dimensions.md` 逐维给出结论；没问题也写「查过未发现」。

优先运行（在目标项目根目录）：

```bash
bash <skill-root>/scripts/run-all.sh
```

或分别运行 `check-tokens.sh`、`check-globals.sh`。脚本输出是**线索**，需人工复核后再写入报告。排除 Token 定义文件、第三方与构建产物。

额外运行时检查（有浏览器或可点页面时）：

- 同一屏数字能否加总、口径是否写明
- 空状态是否区分「没有数据」与「当前筛选为空」
- 筛选项是否覆盖列表里已出现的值
- 宽表第一屏是否包含决策所需列；仅靠颜色的状态有无图例

### 3. 输出报告

严格按 `templates/report-template.md` 写完整 Markdown，并**落盘**。分级与置信度见 `references/audit-dimensions.md`。

### 4. 修复分组 P1…Pn

按「能一起改、能一起验」拆组。每组套用 `templates/fix-prompts/`：

- 通用底线：`base.md`（每个 Prompt 的「不要做」必须保留）
- Token：`P-A-tokens.md`
- 交互三态：`P-D-states.md`
- 全局污染 / 弹层：`P-H-globals.md`

无仓库时 Prompt 里仓库路径与构建命令可留空，注明待补。

### 5. 规则沉淀

审计只把建议写进报告，不改目标项目的 `.cursor/rules`。

实施新项目时，把两份规则都复制到目标仓库的 `.cursor/rules/`：

- `templates/cursor-rules/frontend-stack.mdc`：精确版本、antd 6 弃用 API、适配层、手机壳边界、分页。UI、UX 规范未尽事宜，严格按照 antd 的规范实现。源自范本 `console-antd-v6.mdc`。
- `templates/cursor-rules/figma-handoff.mdc`：预防把 Arco 硬套进代码。写界面或样式时拦住「按设计稿组件生成」和新增 `.ant-*` 覆盖。

扫描脚本以范本 `scripts/verify-console-antd-v6.mts` 为底，改成扫本项目 `src`。`.ant-*` 覆盖用套件 `scripts/check-globals.sh` 当线索，命中后按 `references/figma-handoff.md` 分批收进 token。其余 High / Medium 约束见 `references/rules-sediment.md`。

## 注意

- 不要把个人审美当发现；每条都要对照基准或分级标准。
- 同类问题合并，给数量与典型位置。
- 结尾声明：未修改产品代码、未提交、未开 PR；已写入报告文件 [绝对路径]。
