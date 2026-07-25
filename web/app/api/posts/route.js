import fs from 'node:fs';
import path from 'node:path';
import { getPostsIndex, invalidatePostsCache } from '@/lib/posts';
import { postsDir, safeName } from '@/lib/content';
import { requireAuth } from '@/lib/requireAuth';

export const dynamic = 'force-dynamic';

/** GET /api/posts → 文章索引(实时扫 frontmatter,守 C5)。 */
export async function GET() {
    return Response.json(getPostsIndex());
}

/** 在 frontmatter 行数组里更新/追加一个字段(CRLF 容错:按行处理,不用整块正则) */
function setField(lines, key, value) {
    if (value === undefined || value === null) return;
    const rendered = Array.isArray(value)
        ? `${key}: [${value.map((v) => `"${v}"`).join(', ')}]`
        : `${key}: "${value}"`;
    const idx = lines.findIndex((l) => l.replace(/^﻿/, '').trimStart().startsWith(`${key}:`));
    if (idx >= 0) lines[idx] = rendered;
    else lines.push(rendered);
}

/** PUT /api/posts → 编辑文章 frontmatter(鉴权)。body: { file, title, category, tags, excerpt, coverImage } */
export async function PUT(request) {
    const guard = await requireAuth();
    if (guard) return guard;
    const b = await request.json().catch(() => null);
    const name = safeName(b?.file, '.md');
    if (!name) return Response.json({ error: '无效的文件名' }, { status: 400 });
    const full = path.join(postsDir(), name);
    if (!fs.existsSync(full)) return Response.json({ error: '文件不存在' }, { status: 404 });

    // CRLF 容错:先统一按 \n 处理,写回时保留 body 原样
    const content = fs.readFileSync(full, 'utf8');
    const m = content.match(/^﻿?---\r?\n([\s\S]*?)\r?\n---/);
    if (!m) return Response.json({ error: '未找到 frontmatter' }, { status: 400 });

    const lines = m[1].split('\n').map((l) => l.replace(/\r$/, ''));
    const rest = content.substring(m[0].length);
    if (b.title) setField(lines, 'title', b.title);
    if (b.category) setField(lines, 'category', b.category);
    if (b.tags) setField(lines, 'tags', Array.isArray(b.tags) ? b.tags : String(b.tags).split(',').map((t) => t.trim()).filter(Boolean));
    if (b.excerpt !== undefined) setField(lines, 'excerpt', b.excerpt);
    if (b.coverImage !== undefined) setField(lines, 'coverImage', b.coverImage);
    setField(lines, 'lastModified', new Date().toISOString().split('T')[0]);

    const eol = content.includes('\r\n') ? '\r\n' : '\n';
    const newFm = lines.join(eol);
    fs.writeFileSync(full, `---${eol}${newFm}${eol}---${rest}`);
    invalidatePostsCache();
    return Response.json({ success: true });
}

/** DELETE /api/posts?file=xxx.md → 删除文章文件(鉴权) */
export async function DELETE(request) {
    const guard = await requireAuth();
    if (guard) return guard;
    const name = safeName(new URL(request.url).searchParams.get('file'), '.md');
    if (!name) return Response.json({ error: '无效的文件名' }, { status: 400 });
    const full = path.join(postsDir(), name);
    if (!fs.existsSync(full)) return Response.json({ error: '文件不存在' }, { status: 404 });
    fs.unlinkSync(full);
    invalidatePostsCache();
    return Response.json({ success: true });
}
