import fs from 'node:fs';
import path from 'node:path';
import { postsDir, safeName } from '@/lib/content';

export const dynamic = 'force-dynamic';

/** GET /api/posts/[file] → 单篇文章原始 Markdown(text/markdown)。 */
export async function GET(request, { params }) {
    const { file } = await params;
    const name = safeName(file, '.md');
    if (!name) return new Response('Bad request', { status: 400 });

    const full = path.join(postsDir(), name);
    try {
        const text = fs.readFileSync(full, 'utf8');
        return new Response(text, {
            headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
        });
    } catch (e) {
        return new Response('Not found', { status: 404 });
    }
}
