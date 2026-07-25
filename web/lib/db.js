/**
 * SQLite 连接(惰性单例)—— better-sqlite3 同步驱动 + Drizzle ORM。
 * 同步驱动无连接池开销,单文件,契合小内存 VPS(C1)。
 *
 * 惰性:首次调用 getDb() 才真正打开连接,避免构建期 import 就产生文件副作用。
 * 数据文件路径用 DB_PATH 覆盖(Docker 里挂载到 /app/db);默认 web/db/shadowquake.db。
 */
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import path from 'node:path';
import fs from 'node:fs';
import * as schema from './schema.js';

const globalForDb = globalThis;

function openConnection() {
    const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), 'db', 'shadowquake.db');
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
    const sqlite = new Database(DB_PATH);
    sqlite.pragma('journal_mode = WAL'); // 并发读友好
    sqlite.pragma('foreign_keys = ON');
    return sqlite;
}

/** 获取 Drizzle 实例(惰性 + 热重载安全缓存) */
export function getDb() {
    if (!globalForDb.__drizzle) {
        const sqlite = globalForDb.__sqlite ?? openConnection();
        globalForDb.__sqlite = sqlite;
        globalForDb.__drizzle = drizzle(sqlite, { schema });
    }
    return globalForDb.__drizzle;
}

/** 获取底层 better-sqlite3 连接(需要裸 SQL 时用) */
export function getSqlite() {
    if (!globalForDb.__sqlite) globalForDb.__sqlite = openConnection();
    return globalForDb.__sqlite;
}
