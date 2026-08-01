/**
 * 站内链接拼装 —— 纯字符串函数，服务端与客户端都要用。
 *
 * 单独放一个文件是因为 lib/article.js 里有 fs/path，客户端组件不能 import 它。
 * 不含 basePath：调用方按需要再套 lib/utils 的 withBase。
 */

/** 文件名去掉 .md 就是 slug —— 文章文件名全是 ASCII kebab-case，不需要映射表 */
export function postSlug(file) {
    return String(file || '').replace(/\.md$/, '');
}

/** 文章地址 /post/<slug> */
export function postHref(file) {
    return `/post/${encodeURIComponent(postSlug(file))}`;
}

/** AI 日报地址 /ai-daily/<YYYY-MM-DD>（正好接回 v1 静态归档页的路径形状） */
export function aiDailyHref(date) {
    return `/ai-daily/${encodeURIComponent(date)}`;
}
