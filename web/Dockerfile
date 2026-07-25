# ShadowQuake v2 web —— Next.js standalone 全栈应用
# 多阶段:构建 → 精简运行时。better-sqlite3 用预编译二进制,无需 node-gyp 工具链。

FROM node:20-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:20-slim AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ---- 运行时:仅 standalone 产物 ----
FROM node:20-slim AS runner
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
# standalone 自带精简 node_modules(含 better-sqlite3 原生二进制)
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
# 数据/内容/上传由 compose 卷挂载覆盖(见 docker-compose.yml)
EXPOSE 3000
CMD ["node", "server.js"]
