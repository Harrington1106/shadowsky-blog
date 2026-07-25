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

export function filterMedia(list, filter) {
    if (filter === 'all') return list;
    if (filter === 'watching') return list.filter((item) => item.status === 'watching' || item.status === 'reading');
    return list.filter((item) => item.status === filter);
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
