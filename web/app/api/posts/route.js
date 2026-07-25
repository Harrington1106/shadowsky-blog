import fs from 'node:fs';
import path from 'node:path';
import { postsDir } from '@/lib/content';

export const dynamic = 'force-dynamic';

/** GET /api/posts → 文章索引数组(读 posts.json,按日期倒序)。 */
export async function GET() {
    const file = path.join(postsDir(), 'posts.json');
    try {
        const posts = JSON.parse(fs.readFileSync(file, 'utf8')) || [];
        posts.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
        return Response.json(posts);
    } catch (e) {
        return Response.json([], { status: 200 });
    }
}
