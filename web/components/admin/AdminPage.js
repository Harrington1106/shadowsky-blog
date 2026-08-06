import { cn } from '@/lib/utils';

/**
 * 后台页面统一容器。
 *
 * 原来 13 个页面各写一份 `mx-auto max-w-Xxl px-8 py-10` —— 32px 的左右边距在
 * 375px 屏上直接吃掉 64px,表格和卡片被挤成一条。窄屏收到 16px,sm 以上才放开。
 *
 * width 只能取下面这张表里的键:Tailwind 是扫源码文本生成 class 的,
 * 拼字符串(`max-w-${w}`)那一份不会被生成,线上就是没有宽度限制。
 */
const WIDTH = {
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
    '4xl': 'max-w-4xl',
    '5xl': 'max-w-5xl',
    // 发布台是三栏布局,限宽会把右边那栏挤掉,只要边距不要上限
    full: '',
};

export default function AdminPage({ width = '5xl', className, children }) {
    return (
        <div className={cn('mx-auto px-4 py-6 sm:px-8 sm:py-10', WIDTH[width] ?? WIDTH['5xl'], className)}>
            {children}
        </div>
    );
}
