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

/**
 * 卡片表面样式 —— 与 components/ui/card.jsx 的 <Card> 完全同款(圆角/底色/描边环)。
 * <Card> 是 div，遇到必须用 <a>/<button> 语义的“可点击卡片”时用这个常量保持视觉统一。
 *
 * 带 focus-visible 焦点环：这些卡片都是 <a>/<button>，键盘可聚焦，但原先只有
 * ring-1 ring-foreground/10 这一层静态描边，Tab 过去完全看不出焦点在哪
 * （实测 outline: none）。focus-visible 只在键盘导航时出现，鼠标点击不会闪。
 */
export const cardSurface = 'rounded-xl bg-card text-card-foreground ring-1 ring-foreground/10 '
    + 'outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background';
