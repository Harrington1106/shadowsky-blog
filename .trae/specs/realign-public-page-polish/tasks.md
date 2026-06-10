# Tasks
- [x] Task 1: 以当前公开页代码为准，完成 UI 现状盘点与页面分组。
  - [x] SubTask 1.1: 逐页确认 `index.html`、`blog.html`、`post.html`、`moments.html`、`bookmarks.html`、`rss.html`、`acg.html`、`anime.html`、`manga.html`、`edits.html`、`about.html`、`404.html` 的当前结构、主要模块和公共依赖。
  - [x] SubTask 1.2: 标记导航、页脚、工具条、卡片、状态区、移动菜单、页内样式和重复脚本初始化的现状差异。
  - [x] SubTask 1.3: 输出“可直接复用的公共层”和“必须按页面单独处理的频道特性”边界。

- [x] Task 2: 重新定义公开页的统一骨架与视觉收敛策略。
  - [x] SubTask 2.1: 明确全站公开页统一的导航、主容器、区块标题、工具条、状态区和页脚规则。
  - [x] SubTask 2.2: 为首页、内容页、工具页、频道页建立分组式骨架策略，避免所有页面被硬套成同一模板。
  - [x] SubTask 2.3: 定义液态玻璃、模糊、阴影和动效的分级使用范围，确保内容优先。

- [x] Task 3: 制定第一批高优先级 UI 收敛改造项。
  - [x] SubTask 3.1: 优先规划导航、页脚、公共工具条、加载文案和状态区的一致性改造。
  - [x] SubTask 3.2: 优先规划 `index / blog / post / moments / bookmarks / rss` 六个核心页的布局和信息层级整理。
  - [x] SubTask 3.3: 为 `acg / anime / manga / edits / about / 404` 制定跟随式收敛策略，避免边缘公开页继续脱轨。

- [x] Task 4: 制定代码整理与复用收敛方案。
  - [x] SubTask 4.1: 规划将重复页内样式迁移到 `css/style.css` 或其他公共样式层的边界。
  - [x] SubTask 4.2: 规划将重复脚本初始化、通用交互和模板骨架逐步收口到公共层的方式。
  - [x] SubTask 4.3: 保留现有页面 ID、数据容器和业务脚本挂载点，避免 UI 改造误伤功能。

- [x] Task 5: 为验证与审计建立验收路径。
  - [x] SubTask 5.1: 明确桌面端与移动端的视觉一致性、可读性、层级和可操作性检查项。
  - [x] SubTask 5.2: 明确性能风险检查项，重点审计模糊、阴影、持续动画和重复脚本执行。
  - [x] SubTask 5.3: 明确文档同步要求，确保新的公开页美化计划与代码索引、开发文档保持一致。

# Task Dependencies
- [Task 2] depends on [Task 1]
- [Task 3] depends on [Task 1] and [Task 2]
- [Task 4] depends on [Task 1] and [Task 2]
- [Task 5] depends on [Task 3] and [Task 4]
