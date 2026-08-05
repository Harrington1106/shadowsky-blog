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

/**
 * 站主的兴趣标签 —— 偏身份而不是内容索引，首页与关于页共用一份。
 * 图标名对应 lucide-react 的导出，由用到的页面自己 import（这里不引组件，
 * 免得 lib 被服务端模块引用时把图标包一起拖进去）。
 * 站上能对上的：AI = 每天的日报与订阅页翻译，ACG = 追番/漫画/剪辑三页，
 * 追星 = /gnz48.html 日程，天文 = 站名与整站视觉基调。
 */
export const INTEREST_TAGS = [
    { icon: 'Sparkles', label: 'AI' },
    { icon: 'Film', label: 'ACG' },
    { icon: 'Mic', label: '追星' },
    { icon: 'Swords', label: 'LOL' },
    { icon: 'Telescope', label: '天文' },
    { icon: 'Moon', label: '夜猫子' },
];
