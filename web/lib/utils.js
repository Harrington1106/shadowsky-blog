import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
    return twMerge(clsx(inputs));
}

/**
 * 站内绝对路径加上部署前缀（预览环境下为 /preview，见 next.config.js 的 basePath）。
 * 站内 <a href> 一律手写而非用 next/link，需要在拼接路径时手动调用本函数。
 */
export function withBase(path) {
    return (process.env.NEXT_PUBLIC_BASE_PATH || '') + path;
}
