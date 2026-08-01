import { permanentRedirect, notFound } from 'next/navigation';
import { postHref, aiDailyHref } from '@/lib/links';

/**
 * 旧地址兼容层。
 *
 * 2026-08-01 之前文章的地址是 /post?file=<name>.md、日报是 /post?ai=<date>，
 * 现在分别是 /post/<slug> 和 /ai-daily/<date>。历史书签、外链、已被搜索引擎
 * 收录的地址都还指向旧形式，所以这一页保留下来，只做 308 永久跳转。
 *
 * 不要删：sitemap 里曾经提交过旧地址，删掉就是一批 404。
 */
export const metadata = { robots: { index: false, follow: true } };

export default async function Page({ searchParams }) {
    const { file, ai, ref } = await searchParams;

    if (ai) permanentRedirect(aiDailyHref(ai));
    if (file) permanentRedirect(postHref(file) + (ref ? `?ref=${encodeURIComponent(ref)}` : ''));

    notFound();
}
