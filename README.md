# ui-ux-next-kit

Cursor Agent Skill。同事打开本文件。Cursor 读 `SKILL.md`。写界面时的尺寸、文案、顺序和时长以 `references/public-components.md` 为准。

## 先看这里

| 谁 | 先打开 |
| --- | --- |
| 同事 | 本文件这一节 |
| Cursor | `SKILL.md`（放到 `.cursor/skills/ui-ux-next-kit` 后，说到还原或审计就会读） |
| 写某一页 | `references/public-components.md` 里那一节和它的验收清单 |

在要写界面的项目根目录装上：

```bash
mkdir -p .cursor/skills .cursor/rules
ln -s /绝对路径/ui-ux-next-kit .cursor/skills/ui-ux-next-kit
cp /绝对路径/ui-ux-next-kit/templates/cursor-rules/frontend-stack.mdc .cursor/rules/
cp /绝对路径/ui-ux-next-kit/templates/cursor-rules/figma-handoff.mdc .cursor/rules/
```

个人级把软链改到 `~/.cursor/skills/ui-ux-next-kit`。团队仓库：

```bash
git submodule add <your-git-url> .cursor/skills/ui-ux-next-kit
```

还原一页时对 Agent 说：

```text
按 ui-ux-next-kit 还原这一页。先读 references/public-components.md 里对应的节，再读该节验收清单。
解剖表里的每一块都要出现。同一处写了多件事要一起做。
组件默认值不要盖过契约里的数字。对不上就改实现，不要改契约。
交卷时每条验收写「做到了」或「做不到」，做不到要写出缺的那个数字。
UI、UX 规范未尽事宜，严格按照 antd 的规范实现。
```

只审计、不改代码：「按 ui-ux-next-kit 做一次 UI/UX 审计」。报告写在目标项目根目录，文件名 `YYYYMMDD-[项目名]UI-UX审计报告.md`。

演示：

```bash
cd demo/console && pnpm install && pnpm dev
```

打开 `http://127.0.0.1:5174/#/login`。账号密码任意非空，验证码看图片上的字符。演示里的产品名是「管理控制台」，字标是「UI」。

演示里这两处还没对齐，不要当成契约：API 执行记录的「详情」没有 760px 抽屉，运行日志也没有 960px 那只；数据统计「口径说明」里仍写着「没测」。

打包这个仓库发给同事即可。压缩时排除 `node_modules`、`dist`、`.DS_Store`。未提交的改动不要用 `git archive`，那种包里没有工作区里还没提交的文件。

把《UI/UX 审计套件》打包成开源、可一键安装的 **Agent Skill Kit**：对前端项目做只读 UI/UX 审计，在**项目根目录**落盘结构化报告，并输出可直接交给修复 Agent 的分组 Prompt。

**Kit** 表示这是可扩展的工程资产包——当前主能力是审计与修复分组；后续可在同一仓库下增加脚手架、DESIGN 对齐检查等 Skill，而不改品牌名。

这样做不只是方便团队在多项目里复用同一套规则，也契合现代 **Agentic Engineering**（AI 辅助工程）的趋势——把审计基准、扫描脚本和防翻车修复 Prompt 沉淀成工程资产，而不是散落在对话里的一次性提示词。

命名里的 **Next** 表示面向现代栈。落地范本是参考控制台（`apps/console`：React 19 + Ant Design 6 + ProLayout），不是每个新项目再选一套「也是 React」。灵感来自开源 Agent Skill 形态（如 [ui-ux-pro-max-skill](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill)），但本仓库聚焦 **审计 → 报告 → 修复分组 → 规则沉淀**，而不是设计灵感库。本仓库是模板，规范里不写具体公司或产品名。

曾用名 / 备选：`ui-ux-next-audit`（仍可作为触发别名）、`next-ui-governor`、`nextgen-ui-audit`、`ui-next-guard`。现统一为 **`ui-ux-next-kit`**。

## 功能

- 对照范本 **参考控制台** 定档（已是这套 / 另一套完整库 / 无组件库）。版本与「不要原样抄」的部分见 `references/exemplar-rpa-console.md`
- A–I 维度扫描：Token、组件、布局、三态、表格表单、文案、a11y、框架陷阱、工程卡口
- 可选静态扫描脚本（硬编码色、内联 style、`.ant-*` 覆盖、`z-index` 等）
- 报告落盘：`YYYYMMDD-[项目名]UI-UX审计报告.md`
- 分组修复 Prompt（防翻车底线：不改数据流、不重写整文件、不碰范围外页面）

## 工作流

Agent 读入本 Skill 的 `SKILL.md` 后，按四步执行（用户只需说「做一次 UI/UX 审计」一类意图即可触发）：

1. **确立基准**：读 `package.json` 定技术栈档位，对照 `references/tech-stacks.md` 和 `references/exemplar-rpa-console.md`（范本：参考控制台），检查全局 Token / 统一 Layout。
2. **只读审计**：跑 `scripts/` 或用 `rg` / Grep，按 `references/audit-dimensions.md` 扫 Token、原生控件混用、异步三态、全局 `.ant-*` 污染与 `z-index` 等。
3. **结构化报告**：严格按 `templates/report-template.md` 输出，划分 High / Medium / Low，并给出置信度；报告落在**被审计项目根目录**。
4. **拆解修复分组 (P1–Pn)**：按「能一起改、能一起验」打包独立修复 Prompt，套用 `templates/fix-prompts/` 中的防翻车底线。

## 目录

标准开源 Skill 布局（可发布到 GitHub，经 Git Submodule、软链或复制到 `.cursor/skills` 一键加载）：

```text
ui-ux-next-kit/                   # 仓库目录（Skill 名：ui-ux-next-kit）
├── SKILL.md                      # 核心引导与指令（Agent 识别的主协议）
├── skill.json
├── README.md                     # 给人看的安装与使用说明
├── LICENSE                       # MIT
├── references/                   # 运行时参考基准
│   ├── tech-stacks.md            # 组织推荐栈与档位映射
│   ├── exemplar-rpa-console.md   # 参考控制台范本与不要原样抄的部分
│   ├── exemplar-rpa-architecture.md # 可选：同仓、前后端分离
│   ├── exemplar-deploy.md        # 默认发版：Jenkins 构建，Docker 上线
│   ├── public-components.md      # 界面契约（筛选、满高表、部门树、登录、看板、壳、设置、详情、手机壳）
│   ├── figma-handoff.md          # Figma 若是 Arco：手绘规格 + antd v6，不硬套
│   ├── audit-dimensions.md       # A–I 维度判定与红线
│   └── rules-sediment.md         # 规则沉淀说明
├── demo/
│   └── console/                  # 按规范跑起来的前端演示（本地 mock，不带公司名）
├── scripts/                      # 静态检索引擎
│   ├── check-tokens.sh           # 硬编码色、内联 style 等
│   ├── check-globals.sh          # 全局类名污染、z-index 等
│   ├── run-all.sh
│   └── lib.sh
└── templates/                    # 强结构化输出
    ├── report-template.md        # 审计报告模板
    ├── cursor-rules/             # 实施时复制到目标项目 .cursor/rules/
    │   ├── frontend-stack.mdc    # 框架版本与 antd 6 API（源自范本 console-antd-v6）
    │   └── figma-handoff.mdc     # 预防：Arco 不硬套，token 对齐，保留 antd 交互
    └── fix-prompts/              # 分组修复 Prompt（含防翻车底线）
        ├── base.md
        ├── P-A-tokens.md
        ├── P-D-states.md
        └── P-H-globals.md
```

安装、还原和演示见上面「先看这里」。旧名 `ui-ux-next-audit` 仍可作为触发别名。

手动扫描（在目标项目根）：

```bash
bash /path/to/ui-ux-next-kit/scripts/run-all.sh
```

正式发版不走上面这条开发命令。默认 Jenkins 构建 `demo/console` 的镜像，目标机用 `docker compose -f docker-compose.prod.yml` 拉起。任务脚本是 `demo/console/jenkins/Jenkinsfile`，说明在 `references/exemplar-deploy.md`。

## 依赖

扫描脚本需要 [ripgrep](https://github.com/BurntSushi/ripgrep)（`brew install ripgrep`）。Agent 也可用内置 Grep 工具代替脚本。

## License

MIT · `0.1.0`
