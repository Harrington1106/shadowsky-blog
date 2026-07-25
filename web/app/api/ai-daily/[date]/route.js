import fs from 'node:fs';
import path from 'node:path';
import { aiDailyDir, safeName } from '@/lib/content';

export const dynamic = 'force-dynamic';

/** GET /api/ai-daily/[date] → 某天日报 Markdown。date 形如 2026-06-27。 */
export async function GET(request, { params }) {
    const { date } = await params;
    const name = safeName(date, '.md');
    if (!name) return new Response('Bad request', { status: 400 });

    const full = path.join(aiDailyDir(), name);
    try {
        const text = fs.readFileSync(full, 'utf8');
        return new Response(text, {
            headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
        });
    } catch (e) {
        return new Response('日报不存在', { status: 404 });
    }
}
