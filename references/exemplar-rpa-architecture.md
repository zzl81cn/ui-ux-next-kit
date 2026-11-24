# 可选架构：同仓、前后端分离

新项目可以借鉴这套仓库形态。它不是 UI 审计的必选项。只做纯前端、或后端已经在另一个仓库时，不必照搬。

源文件：范本 `docs/ARCHITECTURE.md`。下面只保留「一个仓库里前后端仍然分开」这一层。执行面（Temporal、Playwright、Worker）属于那套业务，普通后台不抄。

## 同仓，但不混在一个进程里

| 目录 | 范本 | 职责 |
| --- | --- | --- |
| `apps/console` | Vite SPA | 只做界面。不读数据库，不写 SQL |
| `apps/api` | Rust + Axum + utoipa | 接口、鉴权、落库。不渲染页面 |
| `contracts/openapi.yaml` | 契约 | 两边唯一的接口说明 |
| `apps/worker`、`packages/core` | 执行面 | 只有带执行端的产品才有。新的管理后台不要为了「对齐架构」把它们带上 |

pnpm workspace 把 `apps/*` 和 `packages/*` 放在同一个仓库，方便一起克隆、一起发版。控制台和 API 仍然是两个应用：开发时各起各的进程，类型通过契约对接，不通过互相 import 源码对接。

## 契约怎么走

1. API 用 utoipa 产出 OpenAPI，写进 `contracts/openapi.yaml`。
2. 控制台用 `openapi-typescript` 生成 `src/api/schema.d.ts`，请求用 `openapi-fetch`。
3. 接口字段变了，先改契约再改两端。前端不手写一份平行的响应类型。
4. 控制台不引用 `apps/api` 的 Rust 代码。API 不引用 `apps/console` 的 React 组件。

## 部署仍然可以只交一个服务

发版默认走 Jenkins，再以 Docker 镜像上线。步骤、凭据和目标机目录见 `exemplar-deploy.md`。演示流水线在 `demo/console/jenkins/Jenkinsfile`。

登录后才用的内部后台不需要 SSR。控制台 `vite build` 出静态文件，打进同一只镜像：纯前端由 nginx 提供，同仓有 API 时由 API 用 `CONSOLE_DIST` 托管。线上少一个 Node 进程，代码边界不变：改界面不必重编译 API，改接口不必把 JSX 打进后端。

开发时不走这步托管。控制台用 Vite，API 单独启动，浏览器把接口打到 API。仓库里若有给本地数据库用的 compose，不要拿去上线。

## 选型时不要抄偏

- 用 ProComponents，不用 Ant Design Pro 的 Umi 脚手架。后者自带路由和 mock，和这份契约重复。
- 「Ant Design Pro v6」是 Umi 模板，基于 antd 5。本范本的 antd 6 是组件库版本，不是那个脚手架。
- API 语言在范本里是 Rust。新项目若已有别的后端语言，可以保留语言，只要仍是「独立 API + OpenAPI + 静态 SPA」。不要为了借鉴把业务写进 Vite 的服务端。
- 执行、队列、浏览器自动化不在这张表的必选项里。
