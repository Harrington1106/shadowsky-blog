/**
 * JSON → SQLite 一次性数据导入(幂等)。
 *
 * 模型:迁移前 JSON 是真相源,本脚本对每张表做"清空 + 重载",可反复运行结果一致。
 * 缺失的源文件优雅跳过(如本地无 social.json / categories.json,真实迁移在服务器上跑时存在)。
 *
 * 运行:
 *   node db/seed/seed.js
 * 可用环境变量覆盖路径(服务器迁移时指向线上数据):
 *   DB_PATH   默认 web/db/shadowquake.db
 *   DATA_DIR  默认 <repo>/public/data
 *   API_DIR   默认 <repo>/api   (取 settings.json 里的 bangumi_username)
 */
const Database = require('better-sqlite3');
const fs = require('node:fs');
const path = require('node:path');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'shadowquake.db');
const DATA_DIR = process.env.DATA_DIR || path.resolve(__dirname, '../../../public/data');
const API_DIR = process.env.API_DIR || path.resolve(__dirname, '../../../api');

const db = new Database(DB_PATH);
db.pragma('foreign_keys = ON');

/** 读 JSON,不存在则返回 null(优雅跳过) */
function readJson(dir, name) {
    const p = path.join(dir, name);
    if (!fs.existsSync(p)) {
        console.log(`  · 跳过 ${name}(文件不存在:${p})`);
        return null;
    }
    try {
        return JSON.parse(fs.readFileSync(p, 'utf8'));
    } catch (e) {
        console.log(`  ! ${name} 解析失败:${e.message}`);
        return null;
    }
}

/** total 字段:数字→int,"?"/空/非数字→null(未知) */
function toIntOrNull(v) {
    if (v === null || v === undefined || v === '?' || v === '') return null;
    const n = Number(v);
    return Number.isFinite(n) ? Math.trunc(n) : null;
}

const report = [];
function loadTable(table, rows, insertFn) {
    if (rows === null) return; // 源缺失,不动此表
    const tx = db.transaction((items) => {
        db.prepare(`DELETE FROM ${table}`).run();
        for (const it of items) insertFn(it);
    });
    tx(rows);
    const count = db.prepare(`SELECT count(*) c FROM ${table}`).get().c;
    report.push([table, count]);
    console.log(`  ✓ ${table.padEnd(20)} ${count} 行`);
}

console.log('=== JSON → SQLite 数据导入 ===');
console.log(`DB   : ${DB_PATH}`);
console.log(`DATA : ${DATA_DIR}\n`);

// bookmarks
{
    const data = readJson(DATA_DIR, 'bookmarks.json');
    const ins = db.prepare(
        `INSERT INTO bookmarks (id,url,title,category,subcategory,tags,description,added_at)
         VALUES (@id,@url,@title,@category,@subcategory,@tags,@description,@added_at)`
    );
    loadTable('bookmarks', data, (b) => ins.run({
        id: String(b.id), url: b.url || '', title: b.title || '',
        category: b.category ?? null, subcategory: b.subcategory ?? null,
        tags: JSON.stringify(b.tags || []), description: b.description ?? null,
        added_at: b.addedAt ?? null,
    }));
}

// bookmark_categories (categories.json:{ slug: { name, subcategories } } 或数组,做兼容)
{
    const raw = readJson(DATA_DIR, 'categories.json');
    let rows = null;
    if (raw && !Array.isArray(raw)) {
        rows = Object.entries(raw).map(([slug, v]) => ({
            slug, name: v?.name || slug, subcategories: v?.subcategories || v?.subs || {},
        }));
    } else if (Array.isArray(raw)) {
        rows = raw.map((v) => ({ slug: v.slug, name: v.name || v.slug, subcategories: v.subcategories || {} }));
    }
    const ins = db.prepare(`INSERT INTO bookmark_categories (slug,name,subcategories) VALUES (@slug,@name,@subcategories)`);
    loadTable('bookmark_categories', rows, (c) => ins.run({
        slug: String(c.slug), name: c.name, subcategories: JSON.stringify(c.subcategories || {}),
    }));
}

// moments
{
    const data = readJson(DATA_DIR, 'moments.json');
    const ins = db.prepare(
        `INSERT INTO moments (id,date,content,image,location,tags,source)
         VALUES (@id,@date,@content,@image,@location,@tags,@source)`
    );
    loadTable('moments', data, (m) => ins.run({
        id: String(m.id), date: m.date || '', content: m.content ?? null,
        image: m.image ?? null, location: m.location ?? null,
        tags: JSON.stringify(m.tags || []),
        source: m.fromAdmin ? 'admin' : (m.fromGithub ? 'github' : 'admin'),
    }));
}

// media (anime + manga 合表,type 区分;total "?"→null)
{
    const data = readJson(DATA_DIR, 'media.json');
    let rows = null;
    if (data) {
        rows = [
            ...(data.anime || []).map((x) => ({ ...x, type: 'anime' })),
            ...(data.manga || []).map((x) => ({ ...x, type: 'manga' })),
        ];
    }
    const ins = db.prepare(
        `INSERT INTO media (id,type,title,cover,progress,total,status,tag)
         VALUES (@id,@type,@title,@cover,@progress,@total,@status,@tag)`
    );
    loadTable('media', rows, (x) => ins.run({
        id: String(x.id), type: x.type, title: x.title || '', cover: x.cover ?? null,
        progress: toIntOrNull(x.progress) ?? 0, total: toIntOrNull(x.total),
        status: x.status ?? null, tag: x.tag ?? null,
    }));
}

// feeds
{
    const data = readJson(DATA_DIR, 'feeds.json');
    const ins = db.prepare(`INSERT INTO feeds (title,url,category) VALUES (@title,@url,@category)`);
    loadTable('feeds', data, (f) => ins.run({ title: f.title || '', url: f.url || '', category: f.category ?? null }));
}

// videos (videos[] kind=video + favorites[] kind=favorite)
{
    const data = readJson(DATA_DIR, 'videos.json');
    let rows = null;
    if (data) {
        rows = [
            ...(data.videos || []).map((x) => ({ ...x, kind: 'video' })),
            ...(data.favorites || []).map((x) => ({ ...x, kind: 'favorite' })),
        ];
    }
    const ins = db.prepare(
        `INSERT INTO videos (title,thumbnail,duration,views,category,type,bvid,kind)
         VALUES (@title,@thumbnail,@duration,@views,@category,@type,@bvid,@kind)`
    );
    loadTable('videos', rows, (v) => ins.run({
        title: v.title || '', thumbnail: v.thumbnail ?? null, duration: v.duration ?? null,
        views: toIntOrNull(v.views) ?? 0, category: v.category ?? null, type: v.type ?? null,
        bvid: v.bvid ?? null, kind: v.kind,
    }));
}

// notice (单行)
{
    const data = readJson(DATA_DIR, 'notice.json');
    const rows = data ? [data] : null;
    const ins = db.prepare(`INSERT INTO notice (content,show,style,updated_at) VALUES (@content,@show,@style,@updated_at)`);
    loadTable('notice', rows, (n) => ins.run({
        content: n.content || '', show: n.show ? 1 : 0, style: n.style || 'info',
        updated_at: toIntOrNull(n.updated_at) ?? Math.floor(Date.now() / 1000),
    }));
}

// ai_projects
{
    const data = readJson(DATA_DIR, 'ai-projects.json');
    const ins = db.prepare(
        `INSERT INTO ai_projects (name,url,description,stars,language,tags,added_at)
         VALUES (@name,@url,@description,@stars,@language,@tags,@added_at)`
    );
    loadTable('ai_projects', data, (p) => ins.run({
        name: p.name || '', url: p.url ?? null, description: p.description ?? null,
        stars: toIntOrNull(p.stars) ?? 0, language: p.language ?? null,
        tags: JSON.stringify(p.tags || []), added_at: p.addedAt ?? null,
    }));
}

// social_links (public/data/social.json)
{
    const data = readJson(DATA_DIR, 'social.json');
    const ins = db.prepare(`INSERT INTO social_links (name,url,icon,sort) VALUES (@name,@url,@icon,@sort)`);
    loadTable('social_links', data, (s, i) => ins.run({
        name: s.name || '', url: s.url || '', icon: s.icon ?? null, sort: 0,
    }));
}

// app_settings:非密钥设置(bangumi_username);token 类不入库
{
    const settings = readJson(API_DIR, 'settings.json');
    if (settings) {
        const ins = db.prepare(`INSERT OR REPLACE INTO app_settings (key,value) VALUES (?,?)`);
        const tx = db.transaction(() => {
            if (settings.bangumi_username) ins.run('bangumi_username', String(settings.bangumi_username));
        });
        tx();
        const count = db.prepare(`SELECT count(*) c FROM app_settings`).get().c;
        report.push(['app_settings', count]);
        console.log(`  ✓ app_settings         ${count} 行(仅非密钥项)`);
    }
}

console.log('\n=== 导入完成 ===');
console.log(report.map(([t, c]) => `${t}=${c}`).join('  '));
db.close();
