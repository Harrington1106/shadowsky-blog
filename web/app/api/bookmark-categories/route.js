import { getDb } from '@/lib/db';
import { bookmarks, bookmarkCategories } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import { requireAuth } from '@/lib/requireAuth';

export const dynamic = 'force-dynamic';

/**
 * slug 只允许小写字母/数字/下划线/连字符,避免出现带空格或中文的键。
 * ⚠ 下划线必须放行 —— 现有数据里全是 dev_tech / open_source / ai_tools 这种写法。
 */
const SLUG_RE = /^[a-z0-9][a-z0-9_-]*$/;

/**
 * 把前端传来的子分类整理成 { slug: 中文名 }。
 * 接受对象或 [{slug,name}] 数组两种写法;丢掉空 slug,名字缺省时退回 slug。
 */
function normalizeSubs(input) {
    const pairs = Array.isArray(input)
        ? input.map((s) => [s?.slug, s?.name])
        : Object.entries(input || {});
    const out = {};
    for (const [slug, name] of pairs) {
        const key = String(slug || '').trim().toLowerCase();
        if (!key || !SLUG_RE.test(key)) continue;
        out[key] = String(name || '').trim() || key;
    }
    return out;
}

/** GET /api/bookmark-categories → [{ slug, name, subcategories, count, subCounts }] */
export async function GET() {
    const db = getDb();
    const cats = db.select().from(bookmarkCategories).all();
    const rows = db.select().from(bookmarks).all();

    // 顺带统计每个分类/子分类被多少条收藏引用,后台删除前能看见影响面
    const count = {};
    const subCount = {};
    for (const b of rows) {
        if (!b.category) continue;
        count[b.category] = (count[b.category] || 0) + 1;
        if (b.subcategory) {
            subCount[b.category] = subCount[b.category] || {};
            subCount[b.category][b.subcategory] = (subCount[b.category][b.subcategory] || 0) + 1;
        }
    }

    const list = cats.map((c) => ({
        slug: c.slug,
        name: c.name,
        subcategories: JSON.parse(c.subcategories || '{}'),
        count: count[c.slug] || 0,
        subCounts: subCount[c.slug] || {},
    }));

    // 收藏里用到、但分类表里没有的孤儿 slug —— 后台要能看见并补上名字。
    // 带上条数和它下面用过的子分类,后台一键补录时能直接把子分类也带出来。
    const known = new Set(cats.map((c) => c.slug));
    const orphans = Object.keys(count).filter((s) => !known.has(s)).sort()
        .map((slug) => ({ slug, count: count[slug], subCounts: subCount[slug] || {} }));

    return Response.json({ categories: list, orphans });
}

/** PUT /api/bookmark-categories → 新增或更新一个分类(鉴权) */
export async function PUT(request) {
    const guard = await requireAuth();
    if (guard) return guard;

    const body = await request.json().catch(() => null);
    const slug = String(body?.slug || '').trim().toLowerCase();
    if (!slug) return Response.json({ error: 'slug 必填' }, { status: 400 });
    if (!SLUG_RE.test(slug)) return Response.json({ error: 'slug 只能用小写字母、数字、下划线和连字符' }, { status: 400 });

    const name = String(body?.name || '').trim() || slug;
    const subcategories = JSON.stringify(normalizeSubs(body?.subcategories));

    const db = getDb();
    const exists = db.select().from(bookmarkCategories).where(eq(bookmarkCategories.slug, slug)).get();
    if (exists) {
        db.update(bookmarkCategories).set({ name, subcategories })
            .where(eq(bookmarkCategories.slug, slug)).run();
    } else {
        db.insert(bookmarkCategories).values({ slug, name, subcategories }).run();
    }
    return Response.json({ ok: true, slug });
}

/**
 * DELETE /api/bookmark-categories?slug=xxx(鉴权)
 * 还有收藏挂在下面时拒绝删除 —— 否则那些收藏会变成孤儿,页面上又只剩 slug。
 */
export async function DELETE(request) {
    const guard = await requireAuth();
    if (guard) return guard;

    const slug = new URL(request.url).searchParams.get('slug');
    if (!slug) return Response.json({ error: 'slug 必填' }, { status: 400 });

    const db = getDb();
    const used = db.select().from(bookmarks).where(eq(bookmarks.category, slug)).all();
    if (used.length) {
        return Response.json({ error: `还有 ${used.length} 条收藏属于该分类,请先改掉它们的分类` }, { status: 409 });
    }
    db.delete(bookmarkCategories).where(eq(bookmarkCategories.slug, slug)).run();
    return Response.json({ ok: true });
}
