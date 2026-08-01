/**
 * 图标本地镜像查表。
 *
 * 收藏页原本每条都去请求 www.google.com/s2/favicons —— 大陆**完全不通**（实测返回 000），
 * 56 条收藏就是 55 个必然失败的请求；关于页的社交图标走 cdn.simpleicons.org，TTFB 3.47s。
 * scripts/mirror-icons.mjs 把它们抓到本地（41 个 favicon 合计才 23KB），这里做查表。
 *
 * 查不到就返回 null，调用方退回不需要网络的兜底显示（字母块 / lucide 图标），
 * 所以新增收藏在没跑镜像脚本前也不会出现坏图，只是少个站点图标。
 */
import iconMap from './iconMap.json';

/** 收藏站点的 favicon；没有镜像时返回 null */
export function localFavicon(url) {
    try {
        return iconMap.favicons?.[new URL(url).hostname] || null;
    } catch {
        return null;
    }
}

/** simple-icons 社交图标；name 形如 'github'，按深浅色取不同文件 */
export function localSimpleIcon(name, isDark) {
    return iconMap.simple?.[`${name}:${isDark ? 'dark' : 'light'}`] || null;
}
