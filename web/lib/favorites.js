/**
 * 关于页「我喜欢的」—— 站主自己挑的五部，都在 /acg 的已看完列表里。
 *
 * remote 是 Bangumi 的封面地址，只给 scripts/mirror-bgm-covers.mjs 下载用；
 * 页面上永远读镜像后的本地 webp（bgmCovers.json），不直连 lain.bgm.tv ——
 * 那是跨境域名，且实测同源代理回源要 8 秒。见 CLAUDE.md「前端零跨境依赖」。
 *
 * 改这份清单后要重跑：cd web && HTTPS_PROXY=http://127.0.0.1:7897 node scripts/mirror-bgm-covers.mjs
 */
export const FAVORITES = [
    { id: '14588', title: '摇曳百合', remote: 'https://lain.bgm.tv/pic/cover/l/43/d9/14588_bDB2r.jpg' },
    { id: '57978', title: '黄金拼图', remote: 'https://lain.bgm.tv/pic/cover/l/9b/42/57978_NK1n4.jpg' },
    { id: '272510', title: '街角魔族', remote: 'https://lain.bgm.tv/pic/cover/l/af/22/272510_BZ00p.jpg' },
    { id: '2661', title: '轻声密语', remote: 'https://lain.bgm.tv/pic/cover/l/24/17/2661_T8WAJ.jpg' },
    { id: '211934', title: '此花绮谭', remote: 'https://lain.bgm.tv/pic/cover/l/ab/fd/211934_HHeOH.jpg' },
];
