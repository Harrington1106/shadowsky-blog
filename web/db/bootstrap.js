/**
 * 建库脚本:对空库按顺序执行 drizzle 迁移 SQL(CREATE TABLE 等)。
 * 用于容器内一次性初始化(better-sqlite3 在容器 glibc 下可用)。
 * 环境:DB_PATH、MIG_DIR(默认 db/migrations)
 */
const Database = require('better-sqlite3');
const fs = require('node:fs');
const path = require('node:path');

const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), 'db', 'shadowquake.db');
const MIG_DIR = process.env.MIG_DIR || path.join(process.cwd(), 'db', 'migrations');

fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

const files = fs.readdirSync(MIG_DIR).filter((f) => f.endsWith('.sql')).sort();
let applied = 0;
for (const f of files) {
    const sql = fs.readFileSync(path.join(MIG_DIR, f), 'utf8');
    for (const stmt of sql.split('--> statement-breakpoint')) {
        const s = stmt.trim();
        if (!s) continue;
        try {
            db.exec(s);
        } catch (e) {
            // 已存在的表/索引忽略(幂等)
            if (!/already exists/i.test(e.message)) throw e;
        }
    }
    applied++;
}
console.log(`[bootstrap] 应用迁移 ${applied} 个,库就绪:${DB_PATH}`);
db.close();
