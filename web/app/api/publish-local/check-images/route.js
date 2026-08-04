import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { requireAuth } from '@/lib/requireAuth';
import { devOnly, inspect } from '@/lib/publishLocal';
import { mirrorImage } from '../../../../scripts/lib/post-meta.mjs';

export const dynamic = 'force-dynamic';

/**
 * 试抓图片。
 * 走的是和发布时**完全同一条**路径（mirrorImage → curl，会读 HTTPS_PROXY），
 * 才测得准。镜像失败会中止发布，值得提前一步试出来而不是点了发布才知道。
 */
export async function POST(req) {
    const gone = devOnly();
    if (gone) return gone;
    const guard = await requireAuth();
    if (guard) return guard;

    try {
        const { file, src } = await req.json();
        const d = inspect(file, src);
        const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sq-check-'));
        const out = [];
        for (const url of d.images) {
            try {
                const r = await mirrorImage(url, tmp);
                out.push({ url, ok: true, kb: Math.round(r.bytes / 1024) });
            } catch (e) {
                out.push({ url, ok: false, msg: String(e.message).split('\n')[0] });
            }
        }
        fs.rmSync(tmp, { recursive: true, force: true });
        return Response.json(out);
    } catch (e) {
        return Response.json({ error: String(e.message) }, { status: 400 });
    }
}
