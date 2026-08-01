/**
 * 站点级常量 —— layout 的 metadata、sitemap、robots 三处共用,避免各写一份站名/地址。
 * 预览环境可用 NEXT_PUBLIC_SITE_URL 覆盖(与 NEXT_PUBLIC_BASE_PATH 配合)。
 */
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://shadowquake.top';
export const SITE_NAME = '夏日科技探索';
export const SITE_DESC = '个人博客：技术笔记、天文与生活片刻，以及追番、漫画与剪辑作品。';

/**
 * 默认分享大图(1200×630),由 scripts/gen-og-image.mjs 本地生成后提交。
 *
 * ⚠ 每个页面的 openGraph 都得显式带上它:Next 的 metadata 只做浅合并,子页一旦
 *   自己写了 openGraph,父级 layout 的 openGraph.images 就不会继承下来 ——
 *   漏写的表现是那一页的分享卡片完全没有图。
 */
export const OG_IMAGE = [{ url: '/img/og-default.png', width: 1200, height: 630, alt: `星空笔记 — ${SITE_NAME}` }];
