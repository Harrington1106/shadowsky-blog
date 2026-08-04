import fs from 'node:fs';
import { requireAuth } from '@/lib/requireAuth';
import { devOnly, writeMeta, resolveFile } from '@/lib/publishLocal';

export const dynamic = 'force-dynamic';

export async function PUT(req) {
    const gone = devOnly();
    if (gone) return gone;
    const guard = await requireAuth();
    if (guard) return guard;

    try {
        const b = await req.json();
        writeMeta(b.file, b, b.src);
        return Response.json({ ok: true });
    } catch (e) {
        return Response.json({ error: String(e.message) }, { status: 400 });
    }
}

export async function DELETE(req) {
    const gone = devOnly();
    if (gone) return gone;
    const guard = await requireAuth();
    if (guard) return guard;

    const { searchParams } = new URL(req.url);
    // 只允许删草稿。content/posts 是线上内容的本地留档，从这里删既不影响线上，
    // 又把唯一的本地副本弄没了 —— 是个只有坏处的操作。
    if (searchParams.get('src') === 'post') {
        return Response.json({ error: '已发布的文章不能在这里删' }, { status: 400 });
    }
    try {
        fs.unlinkSync(resolveFile(searchParams.get('file') || '', 'draft'));
        return Response.json({ ok: true });
    } catch (e) {
        return Response.json({ error: String(e.message) }, { status: 400 });
    }
}
