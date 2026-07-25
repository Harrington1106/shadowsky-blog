/**
 * 文件式内容目录解析 —— 文章 Markdown 与 AI 日报仍以文件形式存在(守 C5 发文即时可见)。
 * 目录可用环境变量覆盖(Docker 挂载 / 服务器迁移):
 *   POSTS_DIR     默认 <cwd>/../public/posts
 *   AI_DAILY_DIR  默认 <cwd>/../public/data/ai-daily
 */
import path from 'node:path';

export function postsDir() {
    return process.env.POSTS_DIR || path.resolve(process.cwd(), '..', 'public', 'posts');
}

export function aiDailyDir() {
    return process.env.AI_DAILY_DIR || path.resolve(process.cwd(), '..', 'public', 'data', 'ai-daily');
}

/**
 * 把用户提供的文件名收敛成安全的 basename,阻断路径穿越(../ 等)。
 * 返回 null 表示非法。
 */
export function safeName(name, ext) {
    if (!name || typeof name !== 'string') return null;
    const base = path.basename(name); // 去掉任何目录部分
    if (base !== name && !name.endsWith(base)) return null;
    if (base.includes('..') || base.includes('/') || base.includes('\\')) return null;
    const withExt = base.endsWith(ext) ? base : base + ext;
    return withExt;
}
