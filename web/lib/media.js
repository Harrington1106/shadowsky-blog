/**
 * ACG 追番/追漫/视频 共用逻辑 —— 移植自 ../../js/media-data.js 和 ../../js/video-loader.js
 */

export const STATUS_VARIANT = {
    watching: 'default',
    reading: 'default',
    completed: 'secondary',
    plan: 'outline',
    on_hold: 'outline',
    dropped: 'destructive',
};

export function statusText(type, status) {
    const texts = {
        watching: type === 'anime' ? '在看' : '在读',
        reading: '在读',
        completed: type === 'anime' ? '看过' : '读过',
        plan: type === 'anime' ? '想看' : '想读',
        on_hold: '搁置',
        dropped: '抛弃',
    };
    return texts[status] || '未知';
}

export const ANIME_FILTERS = [
    { id: 'all', label: '全部' },
    { id: 'watching', label: '更新中' },
    { id: 'completed', label: '已看完' },
    { id: 'plan', label: '想看' },
    { id: 'on_hold', label: '搁置' },
    { id: 'dropped', label: '抛弃' },
];

export const MANGA_FILTERS = [
    { id: 'all', label: '全部' },
    { id: 'reading', label: '阅读中' },
    { id: 'completed', label: '已读完' },
    { id: 'plan', label: '想读' },
    { id: 'on_hold', label: '搁置' },
    { id: 'dropped', label: '抛弃' },
];

/**
 * 「在追」这一档要同时认 watching 和 reading。
 *
 * 后台的状态下拉对番剧和漫画是同一份（`app/admin/media/page.js` 里 watching / reading 都在），
 * 手工添加的漫画完全可能存成 watching。原先只有 watching 那一档做了兼容、reading 是精确匹配，
 * 于是这类条目在 /acg 头部被算作「在读」，点进 /manga 的「阅读中」却查无此人。
 */
export function filterMedia(list, filter) {
    if (filter === 'all') return list;
    if (filter === 'watching' || filter === 'reading') {
        return list.filter((item) => item.status === 'watching' || item.status === 'reading');
    }
    return list.filter((item) => item.status === filter);
}

/**
 * 各筛选项下的条目数 —— 直接复用 filterMedia，保证「胶囊上的数字」和「点进去看到的条数」永远一致。
 * @returns {Record<string, number>} filter id → 条数
 */
export function countByFilter(list, filters) {
    const counts = {};
    filters.forEach((f) => { counts[f.id] = filterMedia(list, f.id).length; });
    return counts;
}

/**
 * 概览页（/acg）只放得下 6 张卡，而库里排在最前的往往是很久以前看完的 ——
 * 按「正在追 → 想看 → 搁置 → 看过 → 抛弃」重排，让首屏是当下在追的东西。
 * sort 在现代 JS 里是稳定的，同状态内保持原有顺序。
 */
const OVERVIEW_ORDER = { watching: 0, reading: 0, plan: 1, on_hold: 2, completed: 3, dropped: 4 };

export function sortForOverview(list) {
    return [...list].sort((a, b) => (OVERVIEW_ORDER[a.status] ?? 9) - (OVERVIEW_ORDER[b.status] ?? 9));
}

/**
 * total 在 API 里可能是数字，也可能是字符串 "?"（库里 NULL，表示连载中/集数未知）。
 * 拿它算百分比前必须过这一层，否则 "?" 会被当成有效值。
 */
export function numOrNull(v) {
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * 一条追番/追漫记录的进度描述。
 * @returns {{text: string, percent: number|null}} percent 为 null 表示不该画进度条
 */
export function progressInfo(item, type) {
    const total = numOrNull(item.total);
    const progress = numOrNull(item.progress) || 0;
    const unit = type === 'anime' ? '话' : '话';

    if (item.status === 'plan') return { text: type === 'anime' ? '加入片单' : '加入书单', percent: null };
    // 看完/读完的不画进度条：角标已经写着「看过」，再来一条满格白条只是噪音
    if (item.status === 'completed') {
        return { text: total ? `全 ${total} ${unit}` : (type === 'anime' ? '已看完' : '已读完'), percent: null };
    }
    if (!progress) return { text: total ? `共 ${total} ${unit}` : '还没开始', percent: null };

    const verb = type === 'anime' ? '看到' : '读到';
    // 集数未知时不画进度条 —— 以前这里回落成固定 50%，等于凭空编了个进度
    return {
        text: total ? `${verb}第 ${progress} / ${total} ${unit}` : `${verb}第 ${progress} ${unit}`,
        percent: total ? Math.min(100, Math.round((progress / total) * 100)) : null,
    };
}

/** 播放量：上万了就折成「1.2 万」，不然一串数字在小卡片上很占地方 */
export function formatViews(v) {
    const n = Number(v);
    if (!Number.isFinite(n)) return v ?? '0';
    if (n >= 10000) return `${(n / 10000).toFixed(1).replace(/\.0$/, '')} 万`;
    return String(n);
}

export const VIDEO_CATEGORY_MAP = {
    all: '全部',
    amv: 'AMV/MAD',
    music: '翻唱/宅舞',
    game: '游戏',
    live: '现场/Live',
    life: '生活',
    other: '其他',
    anime: '动漫',
};

export function videoCategoryLabel(cat) {
    return VIDEO_CATEGORY_MAP[cat] || cat.charAt(0).toUpperCase() + cat.slice(1);
}
