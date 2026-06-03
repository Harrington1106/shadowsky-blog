# 图标规范

全站使用 Lucide Icons (CDN)。

## 导航栏图标（所有页面统一）

| 页面 | 图标 | 
|------|------|
| 首页 | `house` |
| 星空笔记/博客 | `file-text` |
| 随手拍 | `camera` |
| 收藏 | `bookmark` |
| 订阅 | `rss` |
| 视频 | `film` |
| 关于 | `user-circle` |

## 通用图标

- 主题: `sun`(亮) / `moon`(暗) / `sun-moon`(切换按钮)
- 返回: `chevron-left` | 前进: `chevron-right`
- 刷新: `rotate-cw` | 回到顶部: `chevron-up`
- 复制: `copy` | 搜索: `search`
- 菜单: `menu`

## 规则

1. 修改图标时必须同时改 desktop nav 和 mobile nav
2. 检查目标页面是否有 `lucide.createIcons()` 调用
3. 新图标名必须在 Lucide 中存在：https://lucide.dev/icons
