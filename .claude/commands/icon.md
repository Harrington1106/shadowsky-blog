检查并修复图标一致性（v2 只有一处导航，改动集中在 `web/components/NavBar.js`）：

1. 读 `web/components/NavBar.js` 的 `NAV_ITEMS`，确认图标与规范一致：
   House(首页) / FileText(笔记) / Camera(片刻) / Bookmark(收藏) / Rss(订阅) / Film(ACG) / UserCircle(关于)
2. 图标一律用 `lucide-react` 组件（`import { House } from 'lucide-react'`），不要用 CDN 版
   `<i data-lucide>` —— 那是 v1 的写法，只在遗留静态页 `legacy-static/gnz48.html` 里还存在
3. 桌面导航与移动端 Sheet 抽屉共用同一份 `NAV_ITEMS`，改一处即可，不必两边同步
4. 改完 `cd web && npm run build` 验证，再按 /ship 部署
