检查并修复全站图标一致性：
1. 扫描所有 HTML 页面，提取 navigation bar 的 data-lucide 图标
2. 对比与 CLAUDE.md 中定义的图标规范是否一致
3. 标准: house | file-text | camera | bookmark | rss | film | user-circle
4. 不匹配的改为标准图标
5. 确保所有页面有 `lucide.createIcons()` 调用
6. 部署: git add -A && git commit -m "fix: 统一图标" && git push
