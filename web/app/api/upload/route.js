import fs from 'node:fs';
import path from 'node:path';
import { uploadsDir } from '@/lib/content';
import { requireAuth } from '@/lib/requireAuth';

export const dynamic = 'force-dynamic';

const MAX_SIZE = 10 * 1024 * 1024; // 10MB
const EXT = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/gif': '.gif' };

/** POST /api/upload (multipart, 字段 image) → 保存图片,返回 { success, url }(鉴权) */
export async function POST(request) {
    const guard = await requireAuth();
    if (guard) return guard;

    const form = await request.formData().catch(() => null);
    const file = form?.get('image');
    if (!file || typeof file === 'string') return Response.json({ success: false, error: '未收到图片文件' }, { status: 400 });
    if (file.size > MAX_SIZE) return Response.json({ success: false, error: '图片大小不能超过 10MB' }, { status: 413 });

    const ext = EXT[file.type] || path.extname(file.name || '') || '.jpg';
    const name = `snap-${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
    const dir = uploadsDir();
    fs.mkdirSync(dir, { recursive: true });
    const buf = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(path.join(dir, name), buf);

    return Response.json({ success: true, url: `/uploads/${name}` });
}
