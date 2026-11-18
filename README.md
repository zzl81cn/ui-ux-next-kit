# ui-ux-next-audit

把《UI/UX 审计套件》打包成开源、可一键安装的 **Agent Skill**：对前端项目做只读 UI/UX 审计，在**项目根目录**落盘结构化报告，并输出可直接交给修复 Agent 的分组 Prompt。

这样做不只是方便团队在多项目里复用同一套规则，也契合现代 **Agentic Engineering**（AI 辅助工程）的趋势——把审计基准、扫描脚本和防翻车修复 Prompt 沉淀成工程资产，而不是散落在对话里的一次性提示词。

命名里的 **Next** 表示面向现代栈（React 19 + Ant Design 6），也表示把 UI/UX 治理推进到下一阶段。灵感来自开源 Agent Skill 形态（如 [ui-ux-pro-max-skill](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill)），但本仓库聚焦 **审计 → 报告 → 修复分组 → 规则沉淀**，而不是设计灵感库。

曾考虑过的备选名（均含 next / 治理语义）：`next-ui-governor`（UI 治理专家）、`nextgen-ui-audit`（下一代审计套件）、`ui-next-guard`（拦截硬编码与样式污染的守卫）。最终采用 **`ui-ux-next-audit`**（仓库目录常作 `ui-ux-next-audit-skill`）：直击审计场景，又对 Next.js / React 现代栈友好。

## 功能

- 对照组织推荐栈 **React 19 + Ant Design 6** 定档（已是推荐栈 / 另一套完整库 / 无组件库）
- A–I 维度扫描：Token、组件、布局、三态、表格表单、文案、a11y、框架陷阱、工程卡口
- 可选静态扫描脚本（硬编码色、内联 style、`.ant-*` 覆盖、`z-index` 等）
- 报告落盘：`YYYYMMDD-[项目名]UI-UX审计报告.md`
- 分组修复 Prompt（防翻车底线：不改数据流、不重写整文件、不碰范围外页面）

## 工作流

Agent 读入本 Skill 的 `SKILL.md` 后，按四步执行（用户只需说「做一次 UI/UX 审计」一类意图即可触发）：

1. **确立基准**：读 `package.json` 定技术栈档位，对照 `references/tech-stacks.md`（推荐栈 React 19 + Ant Design 6），检查全局 Token / 统一 Layout。
2. **只读审计**：跑 `scripts/` 或用 `rg` / Grep，按 `references/audit-dimensions.md` 扫 Token、原生控件混用、异步三态、全局 `.ant-*` 污染与 `z-index` 等。
3. **结构化报告**：严格按 `templates/report-template.md` 输出，划分 High / Medium / Low，并给出置信度；报告落在**被审计项目根目录**。
4. **拆解修复分组 (P1–Pn)**：按「能一起改、能一起验」打包独立修复 Prompt，套用 `templates/fix-prompts/` 中的防翻车底线。

## 目录

标准开源 Skill 布局（可发布到 GitHub，经 Git Submodule、软链或复制到 `.cursor/skills` 一键加载）：

```text
ui-ux-next-audit-skill/           # 仓库目录（Skill 名：ui-ux-next-audit）
├── SKILL.md                      # 核心引导与指令（Agent 识别的主协议）
├── skill.json
├── README.md                     # 给人看的安装与使用说明
├── LICENSE                       # MIT
├── references/                   # 运行时参考基准
│   ├── tech-stacks.md            # 组织推荐栈与档位映射
│   ├── audit-dimensions.md       # A–I 维度判定与红线
│   └── rules-sediment.md         # 规则沉淀说明
├── scripts/                      # 静态检索引擎
│   ├── check-tokens.sh           # 硬编码色、内联 style 等
│   ├── check-globals.sh          # 全局类名污染、z-index 等
│   ├── run-all.sh
│   └── lib.sh
└── templates/                    # 强结构化输出
    ├── report-template.md        # 审计报告模板
    └── fix-prompts/              # 分组修复 Prompt（含防翻车底线）
        ├── base.md
        ├── P-A-tokens.md
        ├── P-D-states.md
        └── P-H-globals.md
```

## 安装（Cursor）

```bash
# 项目级
mkdir -p .cursor/skills
ln -s /absolute/path/to/ui-ux-next-audit-skill .cursor/skills/ui-ux-next-audit

# 个人级
mkdir -p ~/.cursor/skills
ln -s /absolute/path/to/ui-ux-next-audit-skill ~/.cursor/skills/ui-ux-next-audit
```

团队推荐用 **Git Submodule** 挂到各业务仓，底层规则或修复 Prompt 一迭代，各项目 `git pull`（或更新 submodule）即可同步：

```bash
git submodule add <your-git-url> .cursor/skills/ui-ux-next-audit
```

## 使用

在目标前端项目中对 Agent 说：

- 「按 ui-ux-next-audit 做一次 UI/UX 审计」
- 「检查样式污染并生成审计报告」
- 「评估是否符合 React 19 + Ant Design 6」
- 「生成 UI 修复提示词」

手动扫描（在目标项目根）：

```bash
bash /path/to/ui-ux-next-audit-skill/scripts/run-all.sh
```

## 依赖

扫描脚本需要 [ripgrep](https://github.com/BurntSushi/ripgrep)（`brew install ripgrep`）。Agent 也可用内置 Grep 工具代替脚本。

## License

MIT · `0.1.0`
