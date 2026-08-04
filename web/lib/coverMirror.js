/**
 * 外链封面 → 本地镜像。
 *
 * 站上的封面图原本全指向 images.unsplash.com，大陆实测 TTFB 4.5s、70KB 图要 5.2s，
 * 而文章头图基本就是 LCP 元素。scripts/mirror-covers.mjs 把它们抓成 webp 存进
 * public/img/covers/，这里做地址替换；映射表里没有的原样返回（比如新写的文章
 * 刚填了个外链封面，还没来得及跑镜像脚本 —— 显示不受影响，只是慢一点）。
 *
 * 纯字符串函数，服务端与客户端都能用。
 */
import coverMap from './coverMap.json';

export function mirrorCover(url) {
    if (!url) return url;
    return coverMap[url] || url;
}

/**
 * 列表缩略图地址。发布时每张封面都会顺手生成一张 240px 宽的
 * `<hash>.thumb.webp`（见 scripts/lib/post-meta.mjs 的 mirrorImage）。
 *
 * 为什么要单独一张：封面原图是 1000px 级别（23–127KB），而列表框只有 64–80px，
 * 按面积算下载的像素是用到的 150 倍 —— 首屏 11 张 664KB，每张还都要跨太平洋。
 *
 * 只对 /uploads/covers/ 下的图做替换：public/img/covers/ 那批是 mirror-covers.mjs
 * 的产物，没有 thumb 变体。拿不准就返回空，调用方照旧用原图。
 */
export function coverThumb(url) {
    if (!url || !url.startsWith('/uploads/covers/') || !url.endsWith('.webp')) return '';
    return url.replace(/\.webp$/, '.thumb.webp');
}
