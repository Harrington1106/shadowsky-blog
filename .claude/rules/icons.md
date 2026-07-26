# 图标规范

v2 用 **`lucide-react` 组件**（不是 CDN 版 Lucide）。

## 导航栏（`web/components/NavBar.js` 的 `NAV_ITEMS`）

| 页面 | 组件 |
|------|------|
| 首页 | `House` |
| 笔记 | `FileText` |
| 片刻 | `Camera` |
| 收藏 | `Bookmark` |
| 订阅 | `Rss` |
| ACG | `Film` |
| 关于 | `UserCircle` |

桌面导航和移动端 Sheet 抽屉共用同一份 `NAV_ITEMS`，改一处即可。

## 通用

- 主题切换：`Sun` / `Moon`
- 返回/前进：`ChevronLeft` / `ChevronRight`
- 刷新：`RotateCw`｜回到顶部：`ChevronUp`
- 复制：`Copy`｜搜索：`Search`｜菜单：`Menu`

## 规则

1. 新图标名必须在 https://lucide.dev/icons 存在，且以 PascalCase 组件形式引入
2. 尺寸用 `size={16}` 或 `className="size-4"`，不要写死 width/height 属性
3. 遗留静态页（服务器 `/www/wwwroot/legacy-static/gnz48.html`）仍是 `<i data-lucide>` + `lucide.createIcons()` 的老写法，那部分不归本规范管，也不要去"统一"它
