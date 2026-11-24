# 范本：参考控制台

新做的前端项目以这个应用为框架范本，不另起一套脚手架。本文件是模板，不写具体公司或产品名。

应用：`apps/console`

组织推荐栈仍然是 React 19 + Ant Design 6。范本把版本、壳和数据访问钉死，避免每个新项目各选一套「也是 React + Ant Design」。

UI、UX 规范未尽事宜，严格按照 antd 的规范实现。规范已经写了的尺寸、文案、顺序和状态仍以规范为准。

Figma 若交付 Arco，不要按那套组件硬套。视觉规格用手绘的色和尺寸，代码用 antd v6，见 `figma-handoff.md`。

仓库形态是可选项：前后端放在同一个仓库，仍然分开部署边界。见 `exemplar-rpa-architecture.md`。只做前端、或 API 已在别的仓库时，不必照搬。

## 要沿用的

| 项 | 范本 |
| --- | --- |
| 构建 | Vite 8、TypeScript 5.9、pnpm |
| UI | React 19.3、antd 6.6、`@ant-design/pro-components` 3.1、`@ant-design/icons` 6.3 |
| 路由 | `react-router-dom` 7 |
| 服务端状态 | `@tanstack/react-query` 5 |
| 接口类型 | `openapi-typescript` 生成 `src/api/schema.d.ts`，请求用 `openapi-fetch` |
| 主题 | `ConfigProvider` + `ProConfigProvider` + `App`，locale `zhCN` |
| 壳 | `ProLayout`，`layout="mix"`，侧栏宽 220，顶栏和侧栏固定 |
| 主色 | `#1f6feb`（`theme/settings.ts` 的 `colorPrimary`） |
| 字体 | `"IBM Plex Sans", "Noto Sans SC", system-ui, sans-serif`，只在 `ConfigProvider` 定一次 |
| 明暗 | light / dark / system，写到 `documentElement.dataset.consoleTheme` |
| 桌面控件 | 表格、表单、日期、空状态、确认、消息用 antd / ProComponents |
| 手机 | 仅在视口切到手机壳时用 `antd-mobile` 5。桌面页面不要引用它 |

桌面映射：

| 场景 | 使用 |
| --- | --- |
| 页面骨架 | `ProLayout`。登录页不用这套壳，见 `public-components.md` 的「登录页」。看板不是默认首页，见「看板」 |
| 列表 | 上面筛选 + 下面满高表，见 `public-components.md` 的「筛选列表」。API执行记录只是填进去的一页 |
| 筛选 | 公共筛选组件 `DashFilterPanel` + `DashFilterField`，见 `public-components.md` |
| 两侧挑选 | 公共穿梭组件（antd `Transfer` + 内嵌表），见 `public-components.md` |
| 部门树 | 公共部门树，见 `public-components.md`。公司吸顶、黄绿/紫胶囊、面板内滚动，不按产品分类的多根吸顶改回去 |
| 空数据 | `Empty`；手机列表用 `antd-mobile` 的 `ErrorBlock` |
| 加载 / 失败 | `Spin` / `Skeleton`；失败可重试 |
| 危险操作 | `Button danger` + `Popconfirm` / `Modal.confirm` |
| 反馈 | `message` / `notification`（包在 antd `App` 里） |
| 主题 | 只改 `ConfigProvider` 的 `token` 和 `algorithm` |

## 基础框架：系统设置

直出一整套后台时，先按 `public-components.md` 的「直出路由兜底」把菜单做全，不能只交登录和数据统计。这张表对应范本 `docs/UI_SPEC_EXTRACTION.md` §7.5，执行纪律是该文件 §2 第 6 条。菜单管理做成树表，日志做成带页签的满高表，部门管理做成部门树。执行记录可以留下，不能拿它代替系统设置或日志。

范本菜单在 `layouts/routeConfig.tsx`。范本自己的日志父级叫「系统日志」、子项叫「审计日志」（`/logs/audit`）。直出新后台时父级改叫「日志管理」，子项叫「系统日志」（`/logs/system`）。系统配置页是 `pages/SystemSettingsPage.tsx`，数据在 `lib/siteBrand.ts`。不要把站点名称和 Logo 写死在壳里。

系统配置用页签。新项目至少做前三项。后两项是本机偏好，可以带着。最后一项是范本产品自己的发布口令，不要照搬。

| 页签 | 新项目 | 内容 |
| --- | --- | --- |
| 品牌标识 | 要 | 四个图片槽 + 站点名称、角标、替代文字 |
| 登录安全 | 要 | 失败锁定、会话时效、密码长度与字符种类、定期更换、临时密码有效期 |
| 登录验证码 | 要 | 开关、长度、干扰线、噪点，并给预览 |
| 列表刷新 | 可带 | 自动刷新间隔，存在本机，不进服务端 |
| 界面动效 | 可带 | 图表进场延迟，存在本机；仍要尊重系统「减少动效」 |
| 执行端发布 | 页签要在 | 直出时保留这一页。不抄范本的发布命令 |

品牌标识的槽位和用法：

登录页和顶栏读这一份，不各写一套。字段和三处高度见 `public-components.md` 的「品牌」，对应范本 `docs/UI_SPEC_EXTRACTION.md` §15、`docs/DESIGN.md` §3.12。说明里的 32px 不是真实高度。

| 槽 | 用在哪 | 约定 |
| --- | --- | --- |
| `logo` | 登录页、桌面顶栏、手机列表顶栏 | 登录页高 40px，桌面顶栏 28px，手机 26px。优先 SVG；PNG 传 2～3 倍图 |
| `logo_dark` | 深色主题的桌面顶栏和手机顶栏 | 不传时，SVG 里的深色字转成浅色。PNG 等位图转不了，要另传浅色字版本。登录页不用这张 |
| `logo_collapsed` | 侧栏收起 | 窄图或图标，约 64×76。现在的壳不收起，顶栏不显示它 |
| `favicon` | 浏览器标签 | ICO / PNG / SVG。上传后改 `link[rel=icon]`，不要求整页刷新 |

文字：`site_name` 最长 40，空则用产品默认名「管理控制台」。`site_tag` 最长 16，可空，登录页和顶栏同一枚。`logo_alt` 必填，最长 40，同时做 `document.title`。图片 `alt` 留空。上传立刻生效，文字要点保存。

接口和壳：

- 公开 `GET /branding`，登录页和壳都能读。已登录后改文字走 `PUT /settings/branding`，传图走 `PUT /settings/branding/{slot}`。
- 允许 SVG、PNG、JPG、WEBP、GIF、ICO。不合规则提示，不上传。
- 保存或上传成功后发一次更新事件（范本是 `console-branding-updated`），壳重新取品牌，不必重新登录。
- 每个槽可以恢复默认。上传区可点击、可拖拽，并有 `aria-label`。
- 顶栏 Logo 用接口返回的地址；深色且没传 `logo_dark` 时，用带版本参数的自动浅色地址，避免缓存住旧图。

机器人头像条是另一份共用件。当前任务和分组表读同一套圆。直出后台的顶栏默认不放。有执行机才加在通知左边。直径、叠距和进场见 `public-components.md` 的「机器人头像」，对应范本 `docs/UI_SPEC_EXTRACTION.md` §16、`docs/DESIGN.md` §3.13。当前任务的圆在标题下第二行，叠距 8px，字号 18px，才从左撞入。离线用不透明灰。

## 已经验证、新项目要写成规范的

这些是控制台里已经对齐过的做法，源文件是范本 `docs/DESIGN.md` 和 `.cursor/rules/console-design.mdc`。新项目开工时写成自己的 `DESIGN.md`（或 `.cursor/rules`），审计基准指向它。不要只抄组件库版本。

| 经验 | 规范 |
| --- | --- |
| 先有一套组合，再填页面 | 可复用的是上面筛选 + 下面满高表（`public-components.md`「筛选列表」）。`#/jobs?record=api` 只是填进去的一页，列和文案不往别的列表抄 |
| 一种职责一个组件 | 桌面表只用 `DataTable`，不在页面里再铺裸 `ProTable` 或 `<table>`。筛选只用公共筛选组件（`public-components.md`，DESIGN.md §3.1）。操作列只用 `RowActions`（间距 16px）。分页文案用统一的 `listShowTotal` |
| 尺寸可量、改一处就改齐 | 筛选输入、选择、主按钮高 **34px**（`--ant-control-height: 34px`），圆角 5px。满高表卡底内边距 16px，分页与表体间距 8px。改高度时 CSS 和 `useTableScrollY` 一起改 |
| 表吃剩余高度，页不跟着滚 | `fullHeight` 由 `useTableScrollY` 算 `scroll.y`。不要用内容撑开的外壳反推表高 |
| 空状态说明原因 | `emptyText` 传文案，由 `DataTable` 包成 `Empty`（`PRESENTED_IMAGE_SIMPLE`）。文案区分「没有数据」和「当前筛选为空」，不写死「暂无数据」 |
| 桌面和手机拆开 | 手机页是 `*Mobile` 加共用 hook，详情用 `MobileSheet`。不要在同一个组件里堆一长串 `isMobile ?` |
| 动效可关 | 进场动画包在 `prefers-reduced-motion: reduce` 里，用户关掉系统动效后不再播 |
| 接口类型从契约来 | 改 OpenAPI 后跑生成，页面用生成的类型和 `openapi-fetch`，不手写一份平行的响应类型 |
| 组件库版本锁死并有检查 | `package.json` 用精确版本，不用 `^`。提交前跑 `pnpm verify:console-antd`，拦住 antd 5 的弃用 API。实施新项目时把套件的 `frontend-stack.mdc` 和 `figma-handoff.mdc` 放进目标 `.cursor/rules/`，扫描脚本从范本 `scripts/verify-console-antd-v6.mts` 改目录后接上 |
| 审计结果回写基准 | 修完 High / Medium，把「以后都这样」写回 `DESIGN.md`，能自动拦的再加 rules 或 `verify:*`。个人审美不进基准 |

新项目若还没有这些公共件，第一阶段先做壳、`DataTable`、筛选条和空状态，再加业务页。不要每页各写一套表和筛选。

## 不要原样抄的

范本能用，下面几处是债。新项目开工时改掉，不要在第二个仓库里再长一遍。

1. **全局样式文件过大。** `apps/console/src/styles.css` 约 5400 行，其中 `!important` 84 处、`.ant-*` 选择器约 256 处。主题进 `ConfigProvider`；页面差异用局部样式。不要再靠一个全局文件改组件库。
2. **圆角有两套。** `ThemeProvider` 里 `borderRadius` 是 6，数据统计卡片在样式里另写 12 和 14。新项目只保留一套圆角阶梯，卡片用 token，不另写死。
3. **图表色不走主题。** `MetricsPage.tsx` 的 `CMS_BAR` 和 `charts/theme.ts` 里是另一组 hex（`#ff8a3d`、`#3b82f6`、`#22c55e`、`#ec4899` 等）。新项目的图表色放进主题 token，或单独一份 chart token，不在页面里再写一套。
4. **手机库有适配缝。** `lib/antdMobileReact19.ts` 是因为 antd-mobile 5 的命令式 API 仍按 React 18 渲染。只做桌面的新项目不要安装 `antd-mobile`。要做手机壳时，沿用「桌面 antd、手机 antd-mobile、弹窗仍可走 antd Modal」这条边界，不要在桌面组件里混用两套。
5. **数据统计的装饰是页面皮肤，不是框架。** 问候卡的三色径向光、斜纹进度条是为了对齐官网 CMS 概况，写在 `styles.css` 里。新项目抄壳和组件，不抄这层装饰。

## 审计时怎么用

- 新项目：对照上表。版本或壳不一致，记一条，排期对齐范本；单次样式修复不顺手升级、不顺手换壳。
- 已是这套：问题写成「范本里的组件没用好」，或写成上面第 1–3 条在本仓库又出现了。
- 无组件库：修复方向是按本文件迁，不是只写「装上 antd」而不装 ProLayout、主题和接口类型生成。
