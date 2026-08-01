# 编码规范

开发默认在 `web/`（v2，Next.js 15 + React 19）。仓库根目录的 `*.html` / `js/` / `css/` / `admin/` / `api/` 是 v1 遗留，除 `gnz48.html` 外基本冻结。

## 风格

- 变量名: camelCase 英文
- 注释: 中文 JSDoc
- 缩进: 4 空格
- 字符串: 优先单引号，模板字符串用反引号

## v2（web/）

- 页面/接口放 `app/`（App Router），共用组件放 `components/`，UI 基础件优先复用 `components/ui`（shadcn）
- 数据读写统一走 `lib/db.js` + `lib/schema.js`（Drizzle），不要另开 sqlite 连接；表结构变更走 `db/migrations`（`npm run db:generate`）
- 文章/AI 日报是 Markdown 文件，通过 `lib/posts.js` / `lib/content.js` 读取，不要直接拼路径读盘
- Markdown → HTML 只在服务端做（`lib/renderMarkdown.js`），客户端不要再引 `marked`/`highlight.js`；
  渲染结果按文件 mtime 缓存，改文件即失效，别加固定 TTL（会破坏「发文即时可见」）
- 后台接口一律套 `lib/requireAuth.js`；`/admin` 页面由 `middleware.js` 拦截
- 图标用 `lucide-react` 组件，不用 CDN 版 Lucide
- Server Component 优先，需要交互再 `'use client'`
- **页面一律是「服务端 `page.js` + 同目录 `XxxContent.js`」**：`page.js` 只导出 `metadata`
  （或 `generateMetadata`）和一个渲染 `<XxxContent />` 的默认函数，交互逻辑全在 Content 里。
  客户端组件不能导出 metadata —— 直接把 `'use client'` 写在 `page.js` 顶部会让整页丢标题、
  描述和 OG 卡片。新增页面照抄 `app/blog/page.js`。
- 站名/站点地址等常量从 `lib/site.js` 取，别在各处重写；新增公开页记得同步
  `app/sitemap.js` 的 `STATIC_ROUTES`

### shadcn 统一规范（不要再手写这些）

组件库是 **shadcn base-nova 风格 + @base-ui/react**（不是 radix）。缺组件用 `npx shadcn@latest add <name>`，会自动按 `components.json` 里的 style 拉取 base-ui 版本。

| 别写 | 要用 |
|------|------|
| `<button>` / 手写药丸按钮 | `Button`（`@/components/ui/button`） |
| `<input>` / `<textarea>` / `<select>` | `Input` / `Textarea` / `Select`（隐藏的 `<input type="file">` 除外） |
| `<input type="checkbox">` | `Switch` 或 `Checkbox` + `Label` |
| `<table>` | `Table` 系列 |
| `window.confirm` / `alert` | `useConfirm()`（`@/components/useConfirm`）/ `toast`（sonner） |
| 手写 `rounded-* border p-*` 卡片 | `Card` / `CardContent`；必须是 `<a>`/`<button>` 语义时用 `cardSurface`（`@/lib/utils`） |
| 自己拼的 tab 按钮组 | `ToggleGroup` + `ToggleGroupItem`（`value` 传数组） |

base-ui 的两个坑：
- `Select` 必须给 Root 传 `items={[{value,label}]}`，否则 `SelectValue` 只显示原始 value 而不是中文标签
- `Button` 用 `render={<a …/>}` 渲染成链接时要同时加 `nativeButton={false}`，否则控制台报 Base UI 语义警告

## 遗留静态页（gnz48.html 等）

- Tailwind CDN + 原生 DOM API，保持现状即可，不引框架
- 图标: `<i data-lucide="name" class="w-5 h-5"></i>` + `lucide.createIcons()`

## 安全

- 用户输入不插入 innerHTML；Markdown 渲染结果过 `dompurify`
- 抓取外部 URL 必须走 `lib/proxyFetch.js`（内含 `lib/ssrf.js` 白名单/内网防护），禁止裸 `fetch` 用户可控地址
- 密钥只进 `.env`（已 gitignore），不硬编码、不写进前端
