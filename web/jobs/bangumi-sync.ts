/**
 * Bangumi 同步(v2)—— 抓取追番/追漫收藏,全量重写 SQLite media 表。
 * 移植自旧 Express /api/sync_bangumi(旧版写 media.json,v2 写库)。
 *
 * 环境变量:
 *   DB_PATH          SQLite 路径
 *   BANGUMI_USERNAME 用户名(缺省从 app_settings 读)
 *   BANGUMI_TOKEN    API token
 *   BANGUMI_API_BASE Bangumi API 基址(国内经 CF Worker,如 https://bangumi.shadowquake.top)
 *
 * 运行:tsx jobs/bangumi-sync.ts
 */
import Database from 'better-sqlite3';
import path from 'node:path';

const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), 'db', 'shadowquake.db');
const API_BASE = process.env.BANGUMI_API_BASE || 'https://bangumi.shadowquake.top';
const TOKEN = process.env.BANGUMI_TOKEN || '';

const db = new Database(DB_PATH);
const username = process.env.BANGUMI_USERNAME
    || db.prepare(`SELECT value FROM app_settings WHERE key='bangumi_username'`).get()?.value
    || '';

if (!username) {
    console.error('[bangumi-sync] 未配置 BANGUMI_USERNAME,退出');
    process.exit(1);
}

// 收藏类型 → 状态映射(与旧实现一致)
const TYPES = [
    { id: 3, anime: 'watching', manga: 'reading' },
    { id: 1, anime: 'plan', manga: 'plan' },
    { id: 2, anime: 'completed', manga: 'completed' },
    { id: 4, anime: 'on_hold', manga: 'on_hold' },
    { id: 5, anime: 'dropped', manga: 'dropped' },
];

async function fetchBgm(p: string) {
    const url = `${API_BASE}/v0${p}`;
    const headers: Record<string, string> = { 'User-Agent': 'ShadowQuake/2.0', Accept: 'application/json' };
    if (TOKEN) headers.Authorization = `Bearer ${TOKEN}`;
    const res = await fetch(url, { headers, signal: AbortSignal.timeout(15000) });
    if (!res.ok) throw new Error(`Bangumi ${p} → HTTP ${res.status}`);
    return res.json();
}

async function fetchCollection(subjectType: number, statusKey: 'anime' | 'manga') {
    const rows: any[] = [];
    for (const t of TYPES) {
        const data = await fetchBgm(`/users/${username}/collections?subject_type=${subjectType}&type=${t.id}&limit=50`);
        if (Array.isArray(data?.data)) {
            for (const item of data.data) rows.push({ item, status: t[statusKey] });
        }
    }
    return rows;
}

function toRow(entry: any, type: string) {
    const s = entry.item.subject || {};
    const eps = Number(s.eps);
    return {
        id: String(s.id), type,
        title: s.name_cn || s.name || '',
        cover: s.images?.large || s.images?.common || null,
        progress: Number(entry.item.ep_status) || 0,
        total: Number.isFinite(eps) && eps > 0 ? eps : null,
        status: entry.status, tag: null,
    };
}

(async () => {
    console.log(`[bangumi-sync] 同步用户 ${username} …`);
    // 先全部抓取成功再落库,抓取失败则不动数据(避免半途清空)
    const animeRows = (await fetchCollection(2, 'anime')).map((e) => toRow(e, 'anime'));
    const mangaRows = (await fetchCollection(1, 'manga')).map((e) => toRow(e, 'manga'));
    const all = [...animeRows, ...mangaRows];

    const ins = db.prepare(
        `INSERT INTO media (id,type,title,cover,progress,total,status,tag)
         VALUES (@id,@type,@title,@cover,@progress,@total,@status,@tag)`
    );
    db.transaction(() => {
        db.prepare('DELETE FROM media').run();
        for (const r of all) ins.run(r);
    })();

    console.log(`[bangumi-sync] 完成:anime ${animeRows.length} / manga ${mangaRows.length}`);
    db.close();
})().catch((e) => {
    console.error('[bangumi-sync] 失败:', e.message);
    process.exit(1);
});
