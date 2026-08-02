'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { FileText, FolderTree, Tags, Bot, Search, SearchX, TriangleAlert, Filter, ChevronDown, Rss, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Pagination, PaginationContent, PaginationItem,
    PaginationLink, PaginationPrevious, PaginationNext, PaginationEllipsis,
} from '@/components/ui/pagination';
import Footer from '@/components/Footer';
import BackToTop from '@/components/BackToTop';
import { fetchPosts, fetchAiDailyIndex } from '@/lib/api';
import { cardSurface, cn, withBase } from '@/lib/utils';
import { postHref, aiDailyHref } from '@/lib/links';
import { mirrorCover } from '@/lib/coverMirror';

const PER_PAGE = 12;

/**
 * 可点的筛选胶囊（侧栏标签 / 窄屏筛选 / 标签云）的交互态。
 *
 * ⚠ 必须显式写 hover —— Badge 基类里 outline/secondary 的 hover 规则全是
 * `[a]:hover:*`，只对渲染成 <a> 的 Badge 生效。这几处都是 render={<button>}，
 * 于是鼠标划过去一条规则都不匹配，看着像死控件。
 * 选中态（default variant，底色已经是 primary）不能套同一份，否则一悬停就变成
 * accent 底 —— 看着像「已取消选中」，正好把状态说反。
 */
function chipInteractive(active) {
    return cn(
        'cursor-pointer transition-all duration-200 motion-safe:hover:-translate-y-px',
        active
            ? 'hover:bg-primary/85 hover:shadow-sm'
            : 'hover:border-primary/50 hover:bg-accent hover:text-accent-foreground hover:shadow-sm'
    );
}

const VIEWS = [
    { id: 'grid', label: '文章' },
    { id: 'directory', label: '目录' },
    { id: 'tags', label: '标签云' },
    { id: 'aidaily', label: 'AI日报' },
];

/**
 * 摘要开头常常把标题又抄了一遍(生成摘要时连标题一起截进去了),
 * 卡片上只有两行摘要,重复一遍等于白丢一行。展示时剥掉这个前缀。
 * 比较时忽略标点空格,避免「（使用 iframe）」这种括号差异导致匹配不上。
 */
function trimTitlePrefix(excerpt, title) {
    const text = (excerpt || '').trim();
    const t = (title || '').trim();
    if (!text || t.length < 6) return text;

    const norm = (s) => s.replace(/[\s\p{P}]/gu, '');
    const nt = norm(t);
    // 逐字符扫,找出正文里对应标题结束的位置(标题里的标点可能和正文写法不同)
    let ni = 0;
    let i = 0;
    for (; i < text.length && ni < nt.length; i++) {
        if (!/[\s\p{P}]/u.test(text[i])) {
            if (text[i] !== nt[ni]) return text; // 开头不是标题,原样返回
            ni++;
        }
    }
    if (ni < nt.length) return text;
    return text.slice(i).replace(/^[\s\p{P}]+/u, '') || text;
}

function formatDate(dateStr) {
    const d = new Date(dateStr);
    if (isNaN(d)) return { ds: dateStr || '', ys: '' };
    return {
        ds: d.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }),
        ys: String(d.getFullYear()),
    };
}

function Thumb({ post }) {
    if (post.coverImage) {
        return (
            <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-muted sm:h-20 sm:w-20">
                {/* hover 时封面轻微放大。只动 transform,不改盒子尺寸 —— 用宽高做动画会挤动整行 */}
                <img
                    src={mirrorCover(post.coverImage)}
                    loading="lazy"
                    alt=""
                    className="h-full w-full object-cover transition-transform duration-300 motion-safe:group-hover/row:scale-105"
                    onError={(e) => { e.currentTarget.parentElement.style.display = 'none'; }}
                />
            </div>
        );
    }
    return (
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground sm:h-20 sm:w-20">
            <FileText size={20} />
        </div>
    );
}

function ArticleRow({ post, refHash }) {
    const { ds, ys } = formatDate(post.date);
    const tags = (post.tags || []).slice(0, 3);
    // 新地址 /post/<slug> 本身不带 query,所以这里是 ?ref= 而不是 &ref=
    const ref = refHash ? `?ref=${encodeURIComponent(refHash)}` : '';
    return (
        <a href={withBase(postHref(post.file) + ref)} className={cn(cardSurface, 'group/row flex gap-4 p-3 transition-colors hover:bg-accent/40 hover:ring-primary/40')}>
            {/* w-12(48px)装不下「12月28日」,会把最后那个「日」挤到第三行去。
                加宽到 w-14 并 whitespace-nowrap,让日期永远一行。 */}
            <div className="hidden w-14 shrink-0 text-center font-mono text-xs whitespace-nowrap text-muted-foreground sm:block">
                <div>{ys}</div>
                <div className="font-semibold text-foreground">{ds}</div>
            </div>
            <Thumb post={post} />
            <div className="min-w-0 flex-1">
                <h3 className="line-clamp-1 text-sm font-semibold">{post.title}</h3>
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{trimTitlePrefix(post.excerpt, post.title)}</p>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    {/* 左侧那列日期在 <sm 是隐藏的,窄屏原本一个日期都看不到 —— 这里补回来 */}
                    <span className="font-mono text-[0.65rem] text-muted-foreground sm:hidden">{ys}/{ds}</span>
                    <Badge variant="secondary" className="text-[0.65rem]">{post.category || '笔记'}</Badge>
                    {tags.map((t) => <Badge key={t} variant="outline" className="text-[0.65rem]">#{t}</Badge>)}
                    <span className="text-[0.65rem] text-muted-foreground">{post.readTime || 5} min</span>
                </div>
            </div>
        </a>
    );
}

// initialPosts 由服务端 page.js 直接传进来(见那边的注释),所以首屏 HTML 里就有文章;
// 只有拿不到时(比如 basePath 预览环境)才退回客户端拉一次。
export default function BlogPage({ initialPosts = [], initialFilter = {} }) {
    const [posts, setPosts] = useState(initialPosts);
    const [loadError, setLoadError] = useState(null);
    const [view, setView] = useState('grid');
    // 筛选状态由服务端从 query 解析好传进来(见 page.js),客户端不再挂载后补读 URL ——
    // 否则分享出去的 ?tag=xxx 链接会先闪一屏无关文章。视图仍走 hash,服务端读不到。
    const [page, setPage] = useState(initialFilter.page || 1);
    const [activeCat, setActiveCat] = useState(initialFilter.cat || null);
    const [activeTag, setActiveTag] = useState(initialFilter.tag || null);
    const [search, setSearch] = useState(initialFilter.search || '');
    const [aiDailyIndex, setAiDailyIndex] = useState(null);
    const [aiDailyError, setAiDailyError] = useState(null);

    // 筛选状态从 URL 恢复完之前,不要把 URL 写回去(否则会先被空状态清掉)
    const urlReady = useRef(false);

    useEffect(() => {
        // 切视图时会写 window.location.hash,所以要跟着 hash 走 —— 只在挂载时读一次的话,
        // 用户切几个视图再按浏览器后退,地址变了页面却不动。
        const applyHash = () => {
            const id = window.location.hash.slice(1);
            setView(VIEWS.some((v) => v.id === id) ? id : 'grid');
        };
        applyHash();
        window.addEventListener('hashchange', applyHash);
        urlReady.current = true;

        if (initialPosts.length === 0) {
            fetchPosts().then(setPosts).catch((e) => setLoadError(e.message));
        }
        return () => window.removeEventListener('hashchange', applyHash);
    }, []);

    // 把筛选状态写回地址栏。用 replaceState 而不是 push:输入搜索词是逐字触发的,
    // push 会往历史里塞一堆记录,后退键就废了。视图切换仍走 hash(那个该进历史)。
    useEffect(() => {
        if (!urlReady.current) return;
        const sp = new URLSearchParams(window.location.search);
        const set = (k, v) => (v ? sp.set(k, v) : sp.delete(k));
        set('q', search.trim());
        set('cat', activeCat);
        set('tag', activeTag);
        set('p', page > 1 ? String(page) : '');
        const qs = sp.toString();
        window.history.replaceState(null, '', window.location.pathname + (qs ? `?${qs}` : '') + window.location.hash);
    }, [search, activeCat, activeTag, page]);

    // 搜索词一变就回到第 1 页 —— 否则在第 2 页搜一个只有 3 条结果的词,会停在空白页。
    //
    // ⚠ 必须跳过挂载时那一次。effect 按声明顺序跑,上面那个已经把 urlReady 置 true,
    //   于是这里会在挂载时立刻 setPage(1),把 ?p=2 带进来的页码盖掉 ——
    //   「分享第 2 页的链接」以前一直是坏的,打开永远停在第 1 页。
    const searchSettled = useRef(false);
    useEffect(() => {
        if (!searchSettled.current) { searchSettled.current = true; return; }
        setPage(1);
    }, [search]);

    useEffect(() => {
        if (view === 'aidaily' && aiDailyIndex === null) {
            fetchAiDailyIndex().then(setAiDailyIndex).catch((e) => setAiDailyError(e.message));
        }
    }, [view, aiDailyIndex]);

    const { cats, topTags, tagTotal } = useMemo(() => {
        const c = Object.create(null);
        const t = Object.create(null);
        posts.forEach((p) => {
            const cat = p.category || '其他';
            c[cat] = (c[cat] || 0) + 1;
            (p.tags || []).forEach((tag) => { t[tag] = (t[tag] || 0) + 1; });
        });
        const allTags = Object.entries(t).sort((a, b) => b[1] - a[1]);
        return {
            cats: Object.entries(c),
            // 侧栏只放得下前 15 个,但**总数必须单独算** ——
            // 原来统计那行写的是 topTags.length,而 topTags 是截断后的,
            // 于是不管站上有多少标签都永远显示「15 个标签」,
            // 而标签云(全量)显示 66,两个数字自相矛盾。
            topTags: allTags.slice(0, 15),
            tagTotal: allTags.length,
        };
    }, [posts]);

    /**
     * 只按搜索词过滤的中间结果 —— 标签云要用它。
     *
     * 为什么要拆:标签云是**导航索引**,原来它吃的是 filteredPosts,于是
     * 「点云里的标签 → 跳文章视图筛选 → 再切回云」时,云只剩那几篇文章的标签
     * (实测 66 个 → 10 个),而且再也回不去,除非手动清除筛选。自己产生的筛选
     * 又喂回给自己,索引就废了。
     * 但搜索框在标签云视图里是可见的,云要是完全不响应搜索,它又成了死控件。
     * 所以:搜索照样收窄云(当场输入,要有即时反馈),分类/标签只做高亮不做过滤。
     */
    const searchedPosts = useMemo(() => {
        const term = search.toLowerCase().trim();
        if (!term) return posts;
        // 也搜分类名 —— 之前只搜标题/摘要/标签,「博客运维」这种只存在于分类的词
        // 一条都搜不到,而它就明晃晃列在左边侧栏里
        return posts.filter((p) =>
            (p.title || '').toLowerCase().includes(term) ||
            (p.excerpt || '').toLowerCase().includes(term) ||
            (p.category || '').toLowerCase().includes(term) ||
            (p.tags || []).some((t) => t.toLowerCase().includes(term))
        );
    }, [posts, search]);

    const filteredPosts = useMemo(() => {
        let list = searchedPosts;
        if (activeCat) list = list.filter((p) => (p.category || '其他') === activeCat);
        if (activeTag) list = list.filter((p) => (p.tags || []).includes(activeTag));
        return list;
    }, [searchedPosts, activeCat, activeTag]);

    /**
     * 日报也跟着搜索框走。
     * 之前搜索框在日报视图下是个**死控件**:输进去什么都不会发生,
     * 因为它只过滤 filteredPosts,而日报走的是另一份 aiDailyIndex。
     * 分类/标签是文章的属性,对日报无意义,所以只接搜索这一项。
     */
    const filteredAiDaily = useMemo(() => {
        if (!aiDailyIndex) return aiDailyIndex;
        const term = search.toLowerCase().trim();
        if (!term) return aiDailyIndex;
        return aiDailyIndex.filter((d) =>
            (d.title || '').toLowerCase().includes(term) ||
            (d.summary || '').toLowerCase().includes(term) ||
            (d.date || '').includes(term)
        );
    }, [aiDailyIndex, search]);

    /**
     * 切视图。筛选条件**保留** —— 原来一切视图就清空分类/标签,
     * 「筛出分类再换个视图看看」这个很自然的动作会莫名其妙丢掉筛选。
     * 之所以当初要清,是因为侧栏在标签云/日报视图里是隐藏的、筛选变得不可见;
     * 现在筛选条在所有视图都显示(见下面 hasFilter 那块),就没有隐身问题了。
     */
    function switchView(id) {
        setView(id);
        setPage(1);
        window.location.hash = id === 'grid' ? '' : '#' + id;
    }

    /**
     * 从标签云点一个标签。
     * 原来只是 setActiveTag,视图仍停在标签云 —— 用户点标签是想「看这个标签下的文章」,
     * 结果留在原地看着标签云自己缩水一圈,文章一篇都看不到。这里直接跳到文章视图。
     */
    function pickTagFromCloud(tag) {
        setActiveTag(tag);
        setActiveCat(null);
        setPage(1);
        setView('grid');
        window.location.hash = '';
    }

    function toggleCat(cat) {
        setActiveCat((v) => (v === cat ? null : cat));
        setActiveTag(null);
        setPage(1);
    }

    function toggleTag(tag) {
        setActiveTag((v) => (v === tag ? null : tag));
        setActiveCat(null);
        setPage(1);
    }

    const hasFilter = Boolean(search.trim() || activeCat || activeTag);

    /**
     * 给分页条拼真实 href。只用 state 拼、不读 window —— 服务端和客户端必须拼出同一个字符串,
     * 否则 hydration 会报 mismatch。
     */
    function pageHref(n) {
        const sp = new URLSearchParams();
        if (search.trim()) sp.set('q', search.trim());
        if (activeCat) sp.set('cat', activeCat);
        if (activeTag) sp.set('tag', activeTag);
        if (n > 1) sp.set('p', String(n));
        const qs = sp.toString();
        return withBase(`/blog${qs ? `?${qs}` : ''}`);
    }

    function clearFilters() {
        setSearch('');
        setActiveCat(null);
        setActiveTag(null);
        setPage(1);
    }

    // 侧边栏是「按分类/标签筛文章」的工具,只对文章类视图有意义:
    //   标签云视图 —— 主区就是全部 60+ 个标签,侧栏那 15 个是同屏重复
    //   AI 日报视图 —— 分类/标签筛的是文章,对日报无效,却占着 220px
    const showSidebar = view !== 'tags' && view !== 'aidaily';

    return (
        <>
            <main className={cn(
                'mx-auto grid w-full max-w-6xl flex-1 gap-8 px-4 py-8',
                showSidebar && 'lg:grid-cols-[220px_1fr]'
            )}>
                {/*
                  吸附位置必须等于它「本来待着」的位置,否则一开始滚动会先往上挪一截才钉住
                  (原来写 top-20=80px,而自然位置是 89px —— 滚动时侧栏会突兀地跳 9px)。
                  89px = 顶栏 3.5rem(h-14) + 1px 边框 + main 的 py-8(2rem)。
                  改顶栏高度或 main 内边距时,这里要跟着改。
                */}
                <aside className={cn(
                    'lg:sticky lg:top-[calc(3.5rem+1px+2rem)] lg:self-start',
                    !showSidebar && 'hidden'
                )}>
                    <h2 className="text-lg font-bold">星空笔记</h2>
                    <p className="mt-1 text-xs text-muted-foreground">记录技术、天文与生活</p>
                    <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground lg:block lg:space-y-1.5">
                        <div className="flex items-center gap-1.5"><FileText size={13} className="opacity-50" /><strong className="text-foreground">{posts.length}</strong> 篇文章</div>
                        <div className="flex items-center gap-1.5"><FolderTree size={13} className="opacity-50" /><strong className="text-foreground">{cats.length}</strong> 个分类</div>
                        <div className="flex items-center gap-1.5"><Tags size={13} className="opacity-50" /><strong className="text-foreground">{tagTotal}</strong> 个标签</div>
                    </div>

                    {/* 订阅入口。/feed.xml 早就有了,但只写在 <head> 的 <link rel=alternate> 里 ——
                        阅读器能自动发现,人眼看不到,等于藏起来了。 */}
                    <a
                        href={withBase('/feed.xml')}
                        className="mt-3 inline-flex items-center gap-1.5 rounded-md text-xs text-muted-foreground transition-colors hover:text-primary focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                    >
                        <Rss size={13} className="opacity-60" /> 订阅更新
                    </a>

                    {/*
                      窄屏(<lg)是单列布局,侧栏整块排在文章之前 —— 6 个分类 + 15 个标签
                      竖着铺开有 559px,手机首屏几乎全是筛选器,划半天才看到第一篇文章。
                      所以窄屏折叠成 <details>(默认收起,只留一行"筛选"),桌面端还原成常驻侧栏。
                    */}
                    <details className="group mt-4 lg:hidden">
                        <summary className="flex cursor-pointer list-none items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase">
                            <Filter size={13} className="opacity-60" />
                            筛选
                            {(activeCat || activeTag) && (
                                <Badge variant="secondary" className="text-[0.65rem]">{activeCat || activeTag}</Badge>
                            )}
                            <ChevronDown size={14} className="ml-auto opacity-60 transition-transform group-open:rotate-180" />
                        </summary>
                        <MobileFilters
                            cats={cats}
                            topTags={topTags}
                            activeCat={activeCat}
                            activeTag={activeTag}
                            toggleCat={toggleCat}
                            toggleTag={toggleTag}
                        />
                    </details>

                    <Separator className="mt-4 hidden lg:block" />

                    <div className="mt-4 mb-2 hidden text-xs font-semibold text-muted-foreground uppercase lg:block">分类</div>
                    <div className="hidden flex-col gap-1 lg:flex">
                        {cats.map(([cat, n]) => (
                            // 这里原本是手写 <button> + 一串 class,与规范(统一用 shadcn Button)不符
                            <Button
                                key={cat}
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleCat(cat)}
                                aria-pressed={activeCat === cat}
                                className={cn(
                                    'h-auto justify-between px-2 py-1.5 text-sm font-normal',
                                    activeCat === cat ? 'bg-accent font-semibold text-accent-foreground' : 'text-muted-foreground'
                                )}
                            >
                                {cat}<span className="text-xs opacity-60">{n}</span>
                            </Button>
                        ))}
                    </div>
                    {/* 这里只有前 15 个,标题必须说清楚,否则和统计里的 66 看着像矛盾;
                        剩下的 51 个在标签云里,给个直达入口 */}
                    <Separator className="mt-4 hidden lg:block" />

                    <div className="mt-4 mb-2 hidden items-center justify-between text-xs font-semibold text-muted-foreground uppercase lg:flex">
                        <span>常用标签</span>
                        {tagTotal > topTags.length && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => switchView('tags')}
                                className="h-auto px-1.5 py-0.5 text-[0.65rem] font-normal normal-case"
                            >
                                全部 {tagTotal}
                            </Button>
                        )}
                    </div>
                    <div className="hidden flex-wrap gap-1.5 lg:flex">
                        {topTags.map(([tag, n]) => (
                            <Badge
                                key={tag}
                                variant={activeTag === tag ? 'default' : 'outline'}
                                className={chipInteractive(activeTag === tag)}
                                render={<button type="button" aria-pressed={activeTag === tag} onClick={() => toggleTag(tag)} />}
                            >
                                {tag} <span className="opacity-60">{n}</span>
                            </Badge>
                        ))}
                    </div>
                </aside>

                <section className="min-w-0">
                    {/*
                      页面此前没有任何 h1,标题层级从 h2 直接起跳(实测 /blog 的 h1 数量 = 0)。
                      不能简单地把侧栏那个「星空笔记」升成 h1 —— 侧栏在标签云/日报视图里是
                      hidden(display:none),那两个视图会连一个 h1 都不剩。
                      所以在主区放一个 sr-only 的,四个视图都在,视觉零变化。
                    */}
                    <h1 className="sr-only">星空笔记 — 文章列表</h1>
                    <div className="relative mb-4">
                        <Search className="absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            type="search"
                            aria-label={view === 'aidaily' ? '搜索 AI 日报' : '搜索笔记'}
                            placeholder={view === 'aidaily' ? '搜索日报...' : '搜索笔记...'}
                            value={search}
                            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                            className="pl-8"
                        />
                    </div>

                    <Tabs value={view} onValueChange={switchView} className="mb-5">
                        <TabsList>
                            {VIEWS.map((v) => <TabsTrigger key={v.id} value={v.id}>{v.label}</TabsTrigger>)}
                        </TabsList>
                    </Tabs>

                    {/*
                      筛选结果反馈:之前搜完/筛完页面上没有任何计数,侧栏那个「19 篇文章」
                      是全站总数、不跟着变 —— 用户不知道自己筛出了几条。
                      顺带给一个「清除」出口:原本只能再点一次那个已选中的分类才能取消。
                    */}
                    {/* aria-live:筛选/搜索后条数是静默变化的,读屏用户完全不知道筛出了几条 */}
                    {hasFilter && (
                        <div className="mb-4 flex flex-wrap items-center gap-2 text-xs text-muted-foreground" aria-live="polite">
                            {/* 标签云展示的是全部标签、不受分类/标签筛选影响,
                                这里再报「共 N 篇」会和眼前看到的东西对不上,换成说明这个筛选通向哪里 */}
                            {view === 'tags' ? (
                                <span>已选，切到<strong className="text-foreground">文章</strong>查看 <strong className="text-foreground">{filteredPosts.length}</strong> 篇</span>
                            ) : (
                                <span>共 <strong className="text-foreground">
                                    {view === 'aidaily' ? (filteredAiDaily?.length ?? 0) : filteredPosts.length}
                                </strong> 篇</span>
                            )}
                            {/* 分类/标签只筛文章,在日报视图下标成"不生效",免得用户以为筛了没反应 */}
                            {activeCat && <Badge variant="secondary" className={cn(view === 'aidaily' && 'opacity-50')}>分类：{activeCat}</Badge>}
                            {activeTag && <Badge variant="secondary" className={cn(view === 'aidaily' && 'opacity-50')}>标签：{activeTag}</Badge>}
                            {search.trim() && <Badge variant="secondary">搜索：{search.trim()}</Badge>}
                            {view === 'aidaily' && (activeCat || activeTag) && <span className="opacity-70">（分类/标签不筛日报）</span>}
                            <Button variant="ghost" size="sm" onClick={clearFilters} className="h-6 gap-1 px-2 text-xs">
                                <X size={12} /> 清除
                            </Button>
                        </div>
                    )}

                    <div style={{ minHeight: '60vh' }}>
                        {loadError && <EmptyMsg icon={TriangleAlert}>加载失败: {loadError}</EmptyMsg>}
                        {!loadError && view === 'grid' && <GridView posts={filteredPosts} page={page} setPage={setPage} hrefFor={pageHref} onClear={clearFilters} hasFilter={hasFilter} />}
                        {!loadError && view === 'directory' && <DirectoryView posts={filteredPosts} onClear={clearFilters} hasFilter={hasFilter} />}
                        {!loadError && view === 'tags' && <TagsView posts={searchedPosts} activeTag={activeTag} onPick={pickTagFromCloud} />}
                        {!loadError && view === 'aidaily' && <AiDailyView index={filteredAiDaily} error={aiDailyError} page={page} setPage={setPage} filtered={Boolean(search.trim())} hrefFor={pageHref} />}
                    </div>
                </section>
            </main>
            <Footer pageId="blog" />
            <BackToTop />
        </>
    );
}

/** 窄屏折叠面板里的分类 + 标签(桌面端用侧栏那份常驻列表) */
function MobileFilters({ cats, topTags, activeCat, activeTag, toggleCat, toggleTag }) {
    return (
        <div className="mt-3 space-y-3">
            <div className="flex flex-wrap gap-1.5">
                {cats.map(([cat, n]) => (
                    <Badge
                        key={cat}
                        variant={activeCat === cat ? 'default' : 'outline'}
                        className={chipInteractive(activeCat === cat)}
                        render={<button type="button" aria-pressed={activeCat === cat} onClick={() => toggleCat(cat)} />}
                    >
                        {cat} <span className="opacity-60">{n}</span>
                    </Badge>
                ))}
            </div>
            <div className="flex flex-wrap gap-1.5">
                {topTags.map(([tag, n]) => (
                    <Badge
                        key={tag}
                        variant={activeTag === tag ? 'default' : 'outline'}
                        className={cn(chipInteractive(activeTag === tag), 'text-[0.7rem]')}
                        render={<button type="button" aria-pressed={activeTag === tag} onClick={() => toggleTag(tag)} />}
                    >
                        {tag} <span className="opacity-60">{n}</span>
                    </Badge>
                ))}
            </div>
        </div>
    );
}

/**
 * 空状态。原来是一行灰字扔在中间,信息量和观感都太薄。
 * 现在给个图标 + 说明,并且**可操作** —— 空结果多半是筛过头了,
 * 直接把「清除筛选」放在这里,不用回头去找上面那个小按钮。
 */
function EmptyMsg({ icon: Icon = SearchX, children, action }) {
    return (
        <div className="flex flex-col items-center gap-3 py-20 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <Icon size={22} />
            </div>
            <p className="text-sm text-muted-foreground">{children}</p>
            {action}
        </div>
    );
}

/** 列表骨架屏 —— 尺寸照抄 ArticleRow,免得数据到位时高度突变 */
function RowSkeleton({ count = 5 }) {
    return (
        <div className="flex flex-col gap-2">
            {Array.from({ length: count }, (_, i) => (
                <div key={i} className={cn(cardSurface, 'flex gap-4 p-3')}>
                    <Skeleton className="hidden h-10 w-14 shrink-0 sm:block" />
                    <Skeleton className="h-16 w-16 shrink-0 rounded-lg sm:h-20 sm:w-20" />
                    <div className="min-w-0 flex-1 space-y-2 py-0.5">
                        <Skeleton className="h-4 w-2/3" />
                        <Skeleton className="h-3 w-full" />
                        <Skeleton className="h-3 w-4/5" />
                        <div className="flex gap-1.5 pt-1">
                            <Skeleton className="h-4 w-12 rounded-full" />
                            <Skeleton className="h-4 w-14 rounded-full" />
                            <Skeleton className="h-4 w-10 rounded-full" />
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}

/**
 * 算出要显示哪些页码:首页、末页、当前页 ±1,中间断开处用 null 表示省略号。
 * 7 页以内直接全列(补省略号反而更长)。
 *
 * 为什么需要:日报每天 cron 加一条、只增不减,原来是把页码全铺出来 ——
 * 现在 25 条(3 个按钮)看不出问题,一年后 390 条就是 33 个按钮糊满一行。
 */
function pageWindow(page, totalPages) {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const keep = new Set([1, totalPages, page, page - 1, page + 1]);
    const out = [];
    for (let n = 1; n <= totalPages; n++) {
        if (keep.has(n)) out.push(n);
        else if (out[out.length - 1] !== null) out.push(null);
    }
    return out;
}

/**
 * 翻页条(文章列表与 AI 日报共用),用 shadcn 的 Pagination。
 *
 * 每一项都是**真链接**:筛选状态本来就在 URL 里(?q=/?cat=/?tag=/?p=),
 * 所以 href 能直接拼出来 —— 中键能在新标签打开、能复制、爬虫能跟。
 * 同时拦截左键走客户端翻页,不真的重新加载。
 * href 只由 React state 拼,不读 window,否则服务端/客户端拼出来的不一样会 hydration 报错。
 */
function Pager({ page, totalPages, setPage, hrefFor }) {
    if (totalPages <= 1) return null;
    // 翻页后回到顶部;跟随系统的"减少动态效果"设置,免得晕动症用户被强制平滑滚动
    const go = (e, n) => {
        e.preventDefault();
        if (n < 1 || n > totalPages || n === page) return;
        setPage(n);
        const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        window.scrollTo({ top: 0, behavior: smooth ? 'smooth' : 'auto' });
    };

    return (
        <Pagination className="mt-8">
            <PaginationContent>
                <PaginationItem>
                    <PaginationPrevious
                        text="上一页"
                        href={hrefFor(Math.max(1, page - 1))}
                        aria-disabled={page <= 1}
                        className={cn(page <= 1 && 'pointer-events-none opacity-40')}
                        onClick={(e) => go(e, page - 1)}
                    />
                </PaginationItem>

                {pageWindow(page, totalPages).map((n, i) => (
                    <PaginationItem key={n === null ? `gap-${i}` : n}>
                        {n === null ? <PaginationEllipsis /> : (
                            <PaginationLink isActive={n === page} href={hrefFor(n)} onClick={(e) => go(e, n)}>
                                {n}
                            </PaginationLink>
                        )}
                    </PaginationItem>
                ))}

                <PaginationItem>
                    <PaginationNext
                        text="下一页"
                        href={hrefFor(Math.min(totalPages, page + 1))}
                        aria-disabled={page >= totalPages}
                        className={cn(page >= totalPages && 'pointer-events-none opacity-40')}
                        onClick={(e) => go(e, page + 1)}
                    />
                </PaginationItem>
            </PaginationContent>
        </Pagination>
    );
}

function GridView({ posts, page, setPage, hrefFor, onClear, hasFilter }) {
    if (posts.length === 0) return <EmptyMsg action={hasFilter && <Button variant="outline" size="sm" onClick={onClear}><X size={14} /> 清除筛选</Button>}>没有匹配的文章</EmptyMsg>;
    const totalPages = Math.ceil(posts.length / PER_PAGE);
    const start = (page - 1) * PER_PAGE;
    const pagePosts = posts.slice(start, start + PER_PAGE);
    return (
        <>
            <div className="flex flex-col gap-2">
                {pagePosts.map((p) => <ArticleRow key={p.file} post={p} />)}
            </div>
            <Pager page={page} totalPages={totalPages} setPage={setPage} hrefFor={hrefFor} />
        </>
    );
}


function DirectoryView({ posts, onClear, hasFilter }) {
    if (posts.length === 0) return <EmptyMsg action={hasFilter && <Button variant="outline" size="sm" onClick={onClear}><X size={14} /> 清除筛选</Button>}>没有匹配的文章</EmptyMsg>;
    const groups = {};
    posts.forEach((p) => {
        const cat = p.category || '其他';
        (groups[cat] ||= []).push(p);
    });
    const entries = Object.entries(groups).sort((a, b) => a[0].localeCompare(b[0]));
    return entries.map(([cat, items]) => (
        <div key={cat} className="mb-6">
            <h3 className="mb-3 border-l-2 border-primary pl-3 text-sm font-semibold text-muted-foreground">
                {cat} <span className="text-xs opacity-60">{items.length}篇</span>
            </h3>
            <div className="flex flex-col gap-2">
                {items.map((p) => <ArticleRow key={p.file} post={p} refHash="#directory" />)}
            </div>
        </div>
    ));
}

// posts 传的是 searchedPosts(只过搜索,不过分类/标签)—— 见上面 searchedPosts 的注释。
// 当前选中的标签在这里只做高亮,不参与过滤,否则云会被自己的选择吃掉。
function TagsView({ posts, activeTag, onPick }) {
    const tags = Object.create(null);   // 用无原型对象:万一有标签叫 constructor/toString,普通 {} 会算错
    posts.forEach((p) => (p.tags || []).forEach((t) => { tags[t] = (tags[t] || 0) + 1; }));
    const sorted = Object.entries(tags).sort((a, b) => b[1] - a[1]);
    if (sorted.length === 0) return <EmptyMsg>没有标签</EmptyMsg>;
    const max = sorted[0]?.[1] || 1;
    return (
        <div className="flex flex-wrap gap-2 py-4">
            {sorted.map(([t, n]) => {
                const size = 0.7 + (n / max) * 0.9;
                return (
                    <Badge
                        key={t}
                        variant={activeTag === t ? 'default' : 'outline'}
                        /*
                          h-auto / py-0 是必须的:Badge 基类写死了 h-5(20px)且 overflow-hidden,
                          它是给固定小尺寸设计的。标签云却按文章数把字号放大到 1.6rem ——
                          高度不跟着长,字就被从上下切掉。实测 66 个标签**全部**被裁,
                          「教程 10」需要 28px 只给 18px,越大的标签裁得越狠,正好把
                          「文章多 = 标签大」这个唯一的视觉信息毁掉。
                          内边距用 em,让胶囊跟着字号一起缩放,而不是大字配小框。
                        */
                        className={cn('h-auto py-0 leading-normal', chipInteractive(activeTag === t))}
                        style={{ fontSize: `${size}rem`, padding: '0.3em 0.75em' }}
                        render={<button type="button" onClick={() => onPick(t)} />}
                    >
                        {t} <span className="opacity-60">{n}</span>
                    </Badge>
                );
            })}
        </div>
    );
}

// 日报每天由 cron 加一条,只增不减 —— 文章列表早就分页了,这里一直是全量渲染,
// 一年后就是 300 多条一次性铺出来。用同一套翻页。
function AiDailyView({ index, error, page, setPage, filtered, hrefFor }) {
    if (error) return <EmptyMsg icon={TriangleAlert}>AI 日报加载失败: {error}</EmptyMsg>;
    // 原来是一行「加载中...」灰字,列表出现时高度突然撑开;换成同尺寸骨架屏
    if (index === null) return <RowSkeleton count={6} />;
    // 分清「一条都还没生成」和「搜索没搜到」—— 两者提示同一句话会让人以为日报没了
    if (!index.length) {
        return <EmptyMsg icon={filtered ? SearchX : Bot}>{filtered ? '没有匹配的日报' : '暂无 AI 日报，等待每日自动生成...'}</EmptyMsg>;
    }
    const totalPages = Math.ceil(index.length / PER_PAGE);
    const start = (page - 1) * PER_PAGE;
    return (
        <div className="flex flex-col gap-2">
            {index.slice(start, start + PER_PAGE).map((d) => {
                const date = new Date(d.date);
                // 原来把「星期」和「月日」塞在同一行 w-16 里,渲染成「7月31日周 / 五」——
                // 连"周五"都被拆开。拆成两行:月日一行、星期一行,各自不换行。
                const md = isNaN(date) ? d.date : date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
                const wd = isNaN(date) ? '' : date.toLocaleDateString('zh-CN', { weekday: 'short' });
                const cleanTitle = (d.title || '')
                    .replace(/^[^\w一-鿿]+/, '')
                    .replace(/^(AI|📰)\s*[-—]?\s*/i, '')
                    .trim();
                return (
                    <a key={d.date} href={withBase(aiDailyHref(d.date))} className={cn(cardSurface, 'flex gap-4 p-3 transition-colors hover:ring-primary/40 hover:bg-accent/40')}>
                        <div className="hidden w-14 shrink-0 text-center text-xs whitespace-nowrap text-muted-foreground sm:block">
                            <div className="font-medium text-foreground">{md}</div>
                            <div className="mt-0.5 opacity-70">{wd}</div>
                        </div>
                        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                            <Bot size={20} />
                        </div>
                        <div className="min-w-0 flex-1">
                            <h3 className="line-clamp-1 text-sm font-semibold"><Badge className="mr-1.5 align-middle text-[0.6rem]">AI</Badge>{cleanTitle}</h3>
                            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{(d.summary || '').replace(/\*\*/g, '').replace(/🥇|🥈|🥉/g, '')}</p>
                            <div className="mt-2 flex flex-wrap items-center gap-1.5">
                                {/* 同 ArticleRow:左列日期 <sm 隐藏,窄屏补一个行内日期 */}
                                <span className="text-[0.65rem] text-muted-foreground sm:hidden">{md} {wd}</span>
                                <Badge variant="secondary" className="text-[0.65rem]">{d.articleCount || '—'} 篇</Badge>
                            </div>
                        </div>
                    </a>
                );
            })}
            <Pager page={page} totalPages={totalPages} setPage={setPage} hrefFor={hrefFor} />
        </div>
    );
}
