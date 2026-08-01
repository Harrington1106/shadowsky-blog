/**
 * 站点级常量 —— layout 的 metadata、sitemap、robots 三处共用,避免各写一份站名/地址。
 * 预览环境可用 NEXT_PUBLIC_SITE_URL 覆盖(与 NEXT_PUBLIC_BASE_PATH 配合)。
 */
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://shadowquake.top';
export const SITE_NAME = '夏日科技探索';
export const SITE_DESC = '个人博客：技术笔记、天文与生活片刻，以及追番、漫画与剪辑作品。';
