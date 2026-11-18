---
name: ui-ux-next-audit
description: >-
  Read-only UI/UX consistency and interaction-quality audit for frontend
  projects. Establishes a baseline against React 19 + Ant Design 6, scans
  tokens/components/states/a11y, writes YYYYMMDD-[project]UI-UX审计报告.md to
  the project root, and emits grouped fix prompts. Use when the user asks to
  audit UI/UX, check style pollution, evaluate UI consistency, generate UI
  fix prompts, or run ui-ux-next-audit / UI-UX审计套件.
---

# UI/UX Next Audit

对前端项目做**只读**的 UI/UX 一致性与交互质量审计：定基准 → 按 A–I 维度扫描 → 落盘结构化报告 → 拆修复分组 Prompt → 给出规则沉淀建议。

本 Skill 打包自《UI/UX 审计套件》。详细判定见 `references/`，扫描脚本见 `scripts/`，输出模板见 `templates/`。

## 触发条件

用户意图包含以下任一即可激活：

- 审计前端 UI / UX / 页面一致性
- 检查样式污染、硬编码色、`.ant-*` 全局覆盖
- 评估是否符合 React 19 + Ant Design 6
- 生成 UI 修复提示词 / 审计报告
- 提到 `ui-ux-next-audit` 或「UI-UX审计套件」

## 只读与落盘

- **不改**产品代码、不提交、不开 PR、不安装依赖。
- **唯一允许写入**：目标根目录的 `YYYYMMDD-[项目名]UI-UX审计报告.md`。
  - 有仓库 → 仓库根（与 `package.json` / `.git` 同级）
  - 无仓库（仅 URL）→ 当前工作区根，报告开头注明「无仓库，报告落在工作区根目录」
- 不要把报告只留在对话里；不要写进 `src/`、`docs/` 或本 Skill 目录。
- 对话末尾只给**绝对路径** + 一两句摘要。

## 工作流

### 1. 确立基准

1. 读 `package.json`、主题/Token 文件、公共组件目录、Layout、`.cursor/rules` / lint。
2. 对照 `references/tech-stacks.md` 划定三档之一。
3. 有 Figma：用 MCP；`get_variable_defs` 传**具体帧** node-id，手机/PC 分开；空结果则 `get_design_context` 取色值，并写「设计稿未使用变量」。
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

把 High / Medium 对应约束写入项目 `.cursor/rules` 或 lint 建议，见 `references/rules-sediment.md`。

## 注意

- 不要把个人审美当发现；每条都要对照基准或分级标准。
- 同类问题合并，给数量与典型位置。
- 结尾声明：未修改产品代码、未提交、未开 PR；已写入报告文件 [绝对路径]。
