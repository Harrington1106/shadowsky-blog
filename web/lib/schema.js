/**
 * SQLite 表定义(Drizzle ORM)—— 字段源自现有 public/data/*.json 的真实结构。
 * JSON 数组类字段(tags/subcategories)以 TEXT 存序列化字符串,读写时 JSON.parse/stringify。
 */
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

/** 书签(bookmarks.json) */
export const bookmarks = sqliteTable('bookmarks', {
    id: text('id').primaryKey(),
    url: text('url').notNull(),
    title: text('title').notNull(),
    category: text('category'),
    subcategory: text('subcategory'),
    tags: text('tags').default('[]'), // JSON string
    description: text('description'),
    addedAt: text('added_at'), // ISO 字符串
});

/** 书签分类元信息(categories.json:slug → 显示名 + 子分类) */
export const bookmarkCategories = sqliteTable('bookmark_categories', {
    slug: text('slug').primaryKey(),
    name: text('name').notNull(),
    subcategories: text('subcategories').default('{}'), // JSON string
});

/** 随手拍(moments.json)。source: admin | github */
export const moments = sqliteTable('moments', {
    id: text('id').primaryKey(),
    date: text('date').notNull(),
    content: text('content'),
    image: text('image'), // 可空
    location: text('location'),
    tags: text('tags').default('[]'),
    source: text('source').default('admin'),
});

/** 追番/追漫(media.json)。type: anime | manga;total 为 NULL 表示"未知"(原 JSON 里的 "?") */
export const media = sqliteTable('media', {
    id: text('id').primaryKey(),
    type: text('type').notNull(),
    title: text('title').notNull(),
    cover: text('cover'),
    progress: integer('progress').default(0),
    total: integer('total'), // NULL = 未知
    status: text('status'),
    tag: text('tag'),
});

/** RSS 订阅源(feeds.json) */
export const feeds = sqliteTable('feeds', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    title: text('title').notNull(),
    url: text('url').notNull(),
    category: text('category'),
});

/** 视频(videos.json)。kind: video(我的剪辑) | favorite(收藏) */
export const videos = sqliteTable('videos', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    title: text('title').notNull(),
    thumbnail: text('thumbnail'),
    duration: text('duration'),
    views: integer('views').default(0),
    category: text('category'),
    type: text('type'), // bilibili 等
    bvid: text('bvid'),
    kind: text('kind').default('video'),
});

/** 关于页社交链接(/api/social) */
export const socialLinks = sqliteTable('social_links', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    name: text('name').notNull(),
    url: text('url').notNull(),
    icon: text('icon'),
    sort: integer('sort').default(0),
});

/** 站点公告(notice.json,单行) */
export const notice = sqliteTable('notice', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    content: text('content').default(''),
    show: integer('show').default(1), // 布尔
    style: text('style').default('info'),
    updatedAt: integer('updated_at'),
});

/** AI 项目库(ai-projects.json)。日报正文仍以文件形式保留,不入库。 */
export const aiProjects = sqliteTable('ai_projects', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    name: text('name').notNull(),
    url: text('url'),
    description: text('description'),
    stars: integer('stars').default(0),
    language: text('language'),
    tags: text('tags').default('[]'),
    addedAt: text('added_at'),
});

/** 分页面访问计数(page_visits.json) */
export const pageVisits = sqliteTable('page_visits', {
    page: text('page').primaryKey(),
    count: integer('count').default(0),
});

/** 站点级计数键值(总访问量、wave 挥手计数等) */
export const siteStats = sqliteTable('site_stats', {
    key: text('key').primaryKey(),
    value: integer('value').default(0),
});

/** 上传快照元信息(/api/snapshots),文件本体在磁盘/R2 */
export const snapshots = sqliteTable('snapshots', {
    id: text('id').primaryKey(),
    filename: text('filename').notNull(),
    url: text('url'),
    createdAt: text('created_at'),
});

/** 应用设置(bangumi_username/token 等,admin 可编辑) */
export const appSettings = sqliteTable('app_settings', {
    key: text('key').primaryKey(),
    value: text('value'),
});

/** 统计排除的 IP(不计入访问量) */
export const excludedIps = sqliteTable('excluded_ips', {
    ip: text('ip').primaryKey(),
});

/** 全站封禁的 IP(403) */
export const blockedIps = sqliteTable('blocked_ips', {
    ip: text('ip').primaryKey(),
});

/** 打招呼记录(about 页 wave,admin 查看),最多留最近 50 条 */
export const greetings = sqliteTable('greetings', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    time: text('time'),
    ip: text('ip'),
    ua: text('ua'),
});
