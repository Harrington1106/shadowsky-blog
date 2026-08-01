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
