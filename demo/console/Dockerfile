# 控制台静态站点。Jenkins 用内网基础镜像覆盖 NODE_IMAGE。
# 不要写 `# syntax=docker/dockerfile:...`，构建机拉不到这条指令。

ARG NODE_IMAGE=node:22-alpine

FROM ${NODE_IMAGE} AS build

WORKDIR /src

RUN npm config set registry https://registry.npmmirror.com \
  && npm install -g pnpm@11.8.0 \
  && pnpm config set registry https://registry.npmmirror.com

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY index.html vite.config.ts tsconfig.json ./
COPY src ./src
RUN pnpm build

FROM ${NODE_IMAGE} AS runtime

RUN set -eux; \
  sed -i 's/dl-cdn.alpinelinux.org/mirrors.aliyun.com/g' /etc/apk/repositories; \
  apk update; \
  if ! apk add --no-cache ca-certificates tzdata nginx wget; then \
    sed -i 's/mirrors.aliyun.com/dl-cdn.alpinelinux.org/g' /etc/apk/repositories; \
    apk update; \
    apk add --no-cache ca-certificates tzdata nginx wget; \
  fi

COPY docker/nginx.conf /etc/nginx/nginx.conf
COPY --from=build /src/dist /usr/share/nginx/html

ENV TZ=Asia/Shanghai
EXPOSE 80

HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=5 \
  CMD wget -qO- http://127.0.0.1/healthz || exit 1

CMD ["nginx", "-g", "daemon off;"]
