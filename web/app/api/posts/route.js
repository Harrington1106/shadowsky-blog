import { getPostsIndex } from '@/lib/posts';

export const dynamic = 'force-dynamic';

/** GET /api/posts → 文章索引(从 md frontmatter 实时生成,守 C5)。 */
export async function GET() {
    return Response.json(getPostsIndex());
}
