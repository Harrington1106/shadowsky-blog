# 编码规范

## 风格

- 变量名: camelCase 英文
- 注释: 中文 JSDoc
- 缩进: 4 空格
- 字符串: 优先单引号，模板字符串用反引号

## 前端 JS

- 所有 API 调用通过 `window.api.xxx()` (js/api.js)
- DOM 操作用原生 API，不引入框架
- 新功能写成独立模块，挂到 `window` 上
- 避免全局变量污染，用 IIFE 包裹

## HTML

- Tailwind CSS class 优先，尽量减少内联 style
- 所有页面结构保持一致: navbar → main → footer
- 图标: `<i data-lucide="name" class="w-5 h-5"></i>`

## 安全

- 用户输入不插入 innerHTML
- API key 不硬编码，用 .env (已 gitignore)
- CORS 在 PHP 端处理
