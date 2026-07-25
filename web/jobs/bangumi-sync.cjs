/**
 * Bangumi 同步(纯 JS/CommonJS 版)—— 用现有 v2 镜像(node+better-sqlite3)直接跑,无需 tsx。
 * 抓取追番/追漫收藏,全量重写 SQLite media 表(先全部抓成功再落库,抓取失败不清库)。
 * 环境:DB_PATH / BANGUMI_USERNAME / BANGUMI_TOKEN / BANGUMI_API_BASE
 */
const Database = require('better-sqlite3');
const path = require('node:path');

const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), 'db', 'shadowquake.db');
const API_BASE = process.env.BANGUMI_API_BASE || 'https://bangumi.shadowquake.top';
const TOKEN = process.env.BANGUMI_TOKEN || '';

const db = new Database(DB_PATH);
const username = process.env.BANGUMI_USERNAME
    || db.prepare("SELECT value FROM app_settings WHERE key='bangumi_username'").get()?.value
    || '';
if (!username) { console.error('[bangumi-sync] 未配置 BANGUMI_USERNAME,退出'); process.exit(1); }

const TYPES = [
    { id: 3, anime: 'watching', manga: 'reading' },
    { id: 1, anime: 'plan', manga: 'plan' },
    { id: 2, anime: 'completed', manga: 'completed' },
    { id: 4, anime: 'on_hold', manga: 'on_hold' },
    { id: 5, anime: 'dropped', manga: 'dropped' },
];

async function fetchBgm(p) {
    const headers = { 'User-Agent': 'ShadowQuake/2.0', Accept: 'application/json' };
    if (TOKEN) headers.Authorization = `Bearer ${TOKEN}`;
    const res = await fetch(`${API_BASE}/v0${p}`, { headers, signal: AbortSignal.timeout(15000) });
    if (!res.ok) throw new Error(`Bangumi ${p} → HTTP ${res.status}`);
    return res.json();
}
async function fetchCollection(subjectType, key) {
    const rows = [];
    for (const t of TYPES) {
        const data = await fetchBgm(`/users/${username}/collections?subject_type=${subjectType}&type=${t.id}&limit=50`);
        if (Array.isArray(data?.data)) for (const item of data.data) rows.push({ item, status: t[key] });
    }
    return rows;
}
function toRow(entry, type) {
    const s = entry.item.subject || {};
    const eps = Number(s.eps);
    return {
        id: String(s.id), type, title: s.name_cn || s.name || '',
        cover: s.images?.large || s.images?.common || null,
        progress: Number(entry.item.ep_status) || 0,
        total: Number.isFinite(eps) && eps > 0 ? eps : null,
        status: entry.status, tag: null,
    };
}

(async () => {
    console.log(`[bangumi-sync] 同步用户 ${username} …`);
    const anime = (await fetchCollection(2, 'anime')).map((e) => toRow(e, 'anime'));
    const manga = (await fetchCollection(1, 'manga')).map((e) => toRow(e, 'manga'));
    const all = [...anime, ...manga];
    const ins = db.prepare(
        `INSERT INTO media (id,type,title,cover,progress,total,status,tag)
         VALUES (@id,@type,@title,@cover,@progress,@total,@status,@tag)`
    );
    db.transaction(() => {
        db.prepare('DELETE FROM media').run();
        for (const r of all) ins.run(r);
    })();
    console.log(`[bangumi-sync] 完成:anime ${anime.length} / manga ${manga.length}`);
    db.close();
})().catch((e) => { console.error('[bangumi-sync] 失败:', e.message); process.exit(1); });
