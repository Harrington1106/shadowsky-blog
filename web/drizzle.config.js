/** drizzle-kit 配置:从 lib/schema.js 生成迁移到 db/migrations,应用到 SQLite 文件。 */

/** @type {import('drizzle-kit').Config} */
export default {
    schema: './lib/schema.js',
    out: './db/migrations',
    dialect: 'sqlite',
    dbCredentials: {
        url: process.env.DB_PATH || './db/shadowquake.db',
    },
};
