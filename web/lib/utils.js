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

/**
 * 可点卡片的悬停态，配合 cardSurface 使用。
 * 只换底色的话，卡片一多就看不出鼠标停在哪一张；加一层轻微抬起 + 投影。
 * 位移用 motion-safe 包住，尊重系统的「减少动态效果」。
 *
 * 放在这里而不是各页自己写：/blog 的列表行、/post 的上下篇是同一种「一张可点的卡」，
 * 手感不一致时来回跳转很容易察觉。
 */
export const cardInteractive = 'transition-all duration-200 hover:bg-accent/40 hover:ring-primary/40 '
    + 'hover:shadow-lg hover:shadow-foreground/5 motion-safe:hover:-translate-y-0.5';

/**
 * 可点筛选胶囊（标签 / 分类 chip）的交互态。
 *
 * ⚠ 必须显式写 hover —— Badge 基类里 outline/secondary 的 hover 规则全是
 * `[a]:hover:*`，只对渲染成 <a> 的 Badge 生效。这些 chip 都是 render={<button>}，
 * 于是鼠标划过去完全没有反应，看着像死控件。
 * 选中态（default variant，底色已经是 primary）不能套同一份，否则一悬停就变成
 * accent 底 —— 看着像「已取消选中」，正好把状态说反。
 */
export function chipInteractive(active) {
    return cn(
        'cursor-pointer transition-all duration-200 motion-safe:hover:-translate-y-px',
        active
            ? 'hover:bg-primary/85 hover:shadow-sm'
            : 'hover:border-primary/50 hover:bg-accent hover:text-accent-foreground hover:shadow-sm'
    );
}
