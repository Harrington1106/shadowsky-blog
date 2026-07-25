/**
 * SQLite 连接(单例)—— better-sqlite3 同步驱动 + Drizzle ORM。
 * 同步驱动无连接池开销,单文件,契合小内存 VPS(C1)。
 *
 * 数据文件路径可用 DB_PATH 覆盖(Docker 里挂载到 /app/db);
 * 默认 web/db/shadowquake.db。
 */
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import path from 'node:path';
import fs from 'node:fs';
import * as schema from './schema.js';

const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), 'db', 'shadowquake.db');

// 确保目录存在(首次启动)
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

// Next dev 热重载会重复求值模块,用全局缓存避免重复打开连接。
const globalForDb = globalThis;
const sqlite = globalForDb.__sqlite ?? new Database(DB_PATH);
if (!globalForDb.__sqlite) {
    sqlite.pragma('journal_mode = WAL'); // 并发读友好
    sqlite.pragma('foreign_keys = ON');
    globalForDb.__sqlite = sqlite;
}

export const db = drizzle(sqlite, { schema });
export { sqlite };
