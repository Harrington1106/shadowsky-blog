import * as cheerio from 'cheerio';
import { assertPublicUrl } from '@/lib/ssrf';
import { proxyFetch } from '@/lib/proxyFetch';

export const dynamic = 'force-dynamic';

const CONTENT_SELECTORS = [
    'article', '[role="main"]', 'main',
    '.post-content', '.article-content', '.post-body', '.article-body',
    '.entry-content', '.content', '#content', '#article',
    '.markdown-body', '.prose', '.post', '.article',
];

/** GET /api/article-content?url= → cheerio 抽正文,返回 { success, content, title } */
export async function GET(request) {
    const url = new URL(request.url).searchParams.get('url');
    try {
        await assertPublicUrl(url);
    } catch (e) {
        return Response.json({ success: false, error: e.message }, { status: 400 });
    }

    let html = '';
    try {
        const res = await proxyFetch(url, {
            directTimeout: 15000, proxyTimeout: 20000,
            headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ShadowQuake RSS Reader/1.0)' },
        });
        html = await res.text();
    } catch {
        return Response.json({ success: false, error: '直连和代理均无法获取原文' }, { status: 502 });
    }

    const $ = cheerio.load(html);
    // 语义标签之外,再按 id/class 关键词清一遍:老式站点的导航是 <div id="menu">
    // 而不是 <nav>,只删语义标签对它们没有任何作用
    $('script, style, nav, footer, header, iframe, .sidebar, .comment, .comments, .ad, .advertisement, [role="navigation"], [role="banner"], [role="contentinfo"]').remove();
    $('[id*="menu" i], [id*="nav" i], [id*="header" i], [id*="footer" i], [class*="menu" i], [class*="nav" i], [class*="header" i], [class*="footer" i], [class*="breadcrumb" i]').remove();

    /**
     * 链接密度 = 链接文字 / 全部文字。
     * 这是 Readability 的核心启发式:导航、目录、标签云几乎全是链接(接近 1),
     * 正文不是(通常 < 0.2)。只按「文字最多」挑,会稳稳挑中包着整页的那个 wrapper。
     */
    function linkDensity(el) {
        const text = $(el).text().replace(/\s+/g, '').length;
        if (!text) return 1;
        return $(el).find('a').text().replace(/\s+/g, '').length / text;
    }

    const MAX_LINK_DENSITY = 0.5;

    let content = null;
    for (const sel of CONTENT_SELECTORS) {
        const el = $(sel).first();
        if (el.length && el.text().trim().length > 200 && linkDensity(el) < MAX_LINK_DENSITY) {
            content = el.html();
            break;
        }
    }
    if (!content) {
        /*
          打分而不是纯比长度:长且链接少的才是正文。
          ⚠ 试过再叠一层「按 <p> 文字量挑最紧凑的容器」,反而更糟 ——
          有的站点正文是裸文本、页脚才用 <p>,那条规则会稳稳选中页脚。
          能力边界就摆在这:抽不出来时宁可返回 success:false 留住摘要,
          也不要拿一个"看起来更长"的东西盖掉好内容。
        */
        let best = null, bestScore = 0;
        $('div, section, td, article').each((_, el) => {
            const len = $(el).text().trim().replace(/\s+/g, '').length;
            if (len < 300) return;
            const d = linkDensity(el);
            if (d >= MAX_LINK_DENSITY) return;
            const score = len * (1 - d);
            if (score > bestScore) { best = el; bestScore = score; }
        });
        if (best) content = $(best).html();
    }

    /*
      ⚠ 抽不出来就老实说抽不出来,**不要**回落到整个 <body>。
      原来那一档会把整页(导航/登录/皮肤切换/页脚)当成正文返回 —— 2026-08-04
      Solidot 实测抽到 933 字,全是「登录 注册 往日文章 皮肤 蓝色 橙色」这类东西,
      而它的 RSS 摘要本身有 286 字干净正文。前端拿到「更长」的结果就把好的换成了坏的。
      返回 success:false,前端保留摘要,是更诚实也更好看的结果。
    */
    if (!content || $('<div>').html(content).text().trim().length < 200) {
        return Response.json({ success: false, error: '未能从原文中识别出正文' });
    }

    return Response.json({
        success: true,
        content: content.replace(/\s+(href|src)=/g, ' $1='),
        title: $('title').text().trim() || '',
    });
}
