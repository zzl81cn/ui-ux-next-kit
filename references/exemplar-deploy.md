# 发版：Jenkins 构建，Docker 上线

新项目默认走这条。本机 `docker build`、把 `dist` 拷到机器上，都不是正式发版。

源流程对齐范本 `jenkins/Jenkinsfile`、`Dockerfile`、`docker-compose.prod.yml`、`docs/deploy-jenkins.md`。下面只保留「控制面镜像」这一层。执行端、浏览器、队列不进这只镜像。

可运行的一份在 `demo/console`：`jenkins/Jenkinsfile`、`Dockerfile`、`docker-compose.prod.yml`。纯前端新项目复制这三份，改镜像名和部署目录。同仓还有 API 时，流水线阶段不变，镜像里改成下面的「一个服务」。

## 任务怎么建

1. Jenkins 新建 Pipeline，SCM 指向仓库。
2. Script Path 指向仓库里的 `jenkins/Jenkinsfile`。演示是 `demo/console/jenkins/Jenkinsfile`。
3. 勾选禁止并发构建。
4. 构建机要能拉内网基础镜像，并执行 `docker build`、`docker push`。

凭据放 Jenkins Credentials，不写进仓库。

| 变量 | 默认 | 用途 |
| --- | --- | --- |
| `DOCKER_CREDENTIALS_ID` | `docker-registry` | 镜像仓库用户名密码 |
| `SSH_CREDENTIALS_ID` | `deploy-ssh` | 仅在勾选上线时使用 |

| 变量 | 默认 | 用途 |
| --- | --- | --- |
| `REGISTRY` | `registry.example.com` | 任务里用环境变量覆盖成自己的仓库 |
| `IMAGE_NAMESPACE` | `demo` | 同上 |
| `APP_IMAGE` | `{REGISTRY}/{IMAGE_NAMESPACE}/<本项目>` | 每个项目自己的镜像名 |
| `NODE_IMAGE` | `node:22-alpine` | 构建和运行的基础镜像。内网镜像用环境变量覆盖 |

有 API 且用 Rust 时，另加 `RUST_IMAGE`，默认 `rust:1.98-alpine`。内网镜像同样用环境变量覆盖。

| 参数 | 默认 | 说明 |
| --- | --- | --- |
| `IMAGE_TAG` | 空 | 空则 `{git 短 SHA}-{BUILD_NUMBER}`，并再打一枚 `latest` |
| `PUSH_IMAGE` | 开 | 构建后推送 |
| `DEPLOY` | 关 | 打开才 SSH 上线 |
| `DEPLOY_HOST` | 空 | `DEPLOY` 打开时必填 |
| `DEPLOY_USER` | `root` | 目标机 SSH 用户 |
| `DEPLOY_DIR` | 项目自定 | 目标机上已经放好生产 compose 的目录 |

## 流水线

1. Checkout。算出本次标签。
2. `DOCKER_BUILDKIT=1 docker build`。Dockerfile 第一行不要写 `# syntax=docker/dockerfile:...`，构建机从公网拉这条指令会超时。
3. `PUSH_IMAGE` 打开时 `docker login` 后推送标签和 `latest`，结束时 `docker logout`。
4. `DEPLOY` 打开时 SSH 到目标机，在 `DEPLOY_DIR` 执行 `docker compose -f docker-compose.prod.yml pull` 和 `up -d`，再看 `ps`。

## 目标机

目录里放 `docker-compose.prod.yml` 和 `.env`（从 `.env.example` 复制，填镜像名和标签）。不要把仓库根那份带源码挂载、带本地数据库的 compose 拿去上线。

```bash
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
curl -fsS http://127.0.0.1/healthz
```

浏览器打开 `http://<部署机>/`。容器内 nginx 听 80，对外端口用 `HTTP_PORT`，默认 80。

## 镜像里有什么

纯前端（本演示）：Node 阶段 `pnpm install --frozen-lockfile` 再 `pnpm build`，运行阶段只留 nginx 和 `dist`。依赖清单不变时安装层可以复用。npm 源用 `https://registry.npmmirror.com`。

同仓还有 API：仍然只交一个服务。控制台 `vite build` 的产物放进镜像，由 API 用 `CONSOLE_DIST` 托管，或由同一容器里的 nginx 反代到 API。改界面不必把 JSX 打进后端源码；线上不另起一个 Node 进程专门伺候静态文件。数据库用现成实例，不在这只业务镜像里再装一套库。

执行面、浏览器自动化、队列不进控制面镜像。

## 构建时不要做的

- 不要在 Dockerfile 里写死仓库密码、库地址、密钥。
- 不要为了「对齐」把执行端进程打进控制面镜像。
- 不要在基础镜像参数之外再从 Docker Hub 拉一套运行时。构建机访问不到 `registry-1.docker.io`。
