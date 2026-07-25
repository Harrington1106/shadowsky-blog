'use client';

import { useEffect, useMemo, useState } from 'react';
import { FileText, FolderTree, Tags, Bot, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Footer from '@/components/Footer';
import BackToTop from '@/components/BackToTop';
import { fetchPosts, fetchAiDailyIndex } from '@/lib/api';
import { withBase } from '@/lib/utils';

const PER_PAGE = 12;
const VIEWS = [
    { id: 'grid', label: '文章' },
    { id: 'timeline', label: '时间轴' },
    { id: 'directory', label: '目录' },
    { id: 'tags', label: '标签云' },
    { id: 'aidaily', label: 'AI日报' },
];

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
                <img src={post.coverImage} loading="lazy" alt="" className="h-full w-full object-cover" onError={(e) => { e.currentTarget.parentElement.style.display = 'none'; }} />
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
    const ref = refHash ? `&ref=${encodeURIComponent(refHash)}` : '';
    return (
        <a href={withBase(`/post?file=${encodeURIComponent(post.file)}${ref}`)} className="flex gap-4 rounded-lg border p-3 transition-colors hover:border-primary/50 hover:bg-accent/40">
            <div className="hidden w-12 shrink-0 text-center font-mono text-xs text-muted-foreground sm:block">
                <div>{ys}</div>
                <div className="font-semibold text-foreground">{ds}</div>
            </div>
            <Thumb post={post} />
            <div className="min-w-0 flex-1">
                <h3 className="line-clamp-1 text-sm font-semibold">{post.title}</h3>
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{post.excerpt || ''}</p>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <Badge variant="secondary" className="text-[0.65rem]">{post.category || '笔记'}</Badge>
                    {tags.map((t) => <Badge key={t} variant="outline" className="text-[0.65rem]">#{t}</Badge>)}
                    <span className="text-[0.65rem] text-muted-foreground">{post.readTime || 5} min</span>
                </div>
            </div>
        </a>
    );
}

export default function BlogPage() {
    const [posts, setPosts] = useState([]);
    const [loadError, setLoadError] = useState(null);
    const [view, setView] = useState('grid');
    const [page, setPage] = useState(1);
    const [activeCat, setActiveCat] = useState(null);
    const [activeTag, setActiveTag] = useState(null);
    const [search, setSearch] = useState('');
    const [aiDailyIndex, setAiDailyIndex] = useState(null);
    const [aiDailyError, setAiDailyError] = useState(null);

    useEffect(() => {
        const hash = window.location.hash;
        if (hash === '#timeline' || hash === '#directory' || hash === '#tags' || hash === '#aidaily') {
            setView(hash.slice(1));
        }
        fetchPosts().then(setPosts).catch((e) => setLoadError(e.message));
    }, []);

    useEffect(() => {
        if (view === 'aidaily' && aiDailyIndex === null) {
            fetchAiDailyIndex().then(setAiDailyIndex).catch((e) => setAiDailyError(e.message));
        }
    }, [view, aiDailyIndex]);

    const { cats, topTags } = useMemo(() => {
        const c = {};
        const t = {};
        posts.forEach((p) => {
            const cat = p.category || '其他';
            c[cat] = (c[cat] || 0) + 1;
            (p.tags || []).forEach((tag) => { t[tag] = (t[tag] || 0) + 1; });
        });
        return {
            cats: Object.entries(c),
            topTags: Object.entries(t).sort((a, b) => b[1] - a[1]).slice(0, 15),
        };
    }, [posts]);

    const filteredPosts = useMemo(() => {
        let list = posts;
        const term = search.toLowerCase().trim();
        if (term) {
            list = list.filter((p) =>
                (p.title || '').toLowerCase().includes(term) ||
                (p.excerpt || '').toLowerCase().includes(term) ||
                (p.tags || []).some((t) => t.toLowerCase().includes(term))
            );
        }
        if (activeCat) list = list.filter((p) => (p.category || '其他') === activeCat);
        if (activeTag) list = list.filter((p) => (p.tags || []).includes(activeTag));
        return list;
    }, [posts, search, activeCat, activeTag]);

    function switchView(id) {
        setView(id);
        setPage(1);
        setActiveCat(null);
        setActiveTag(null);
        window.location.hash = id === 'grid' ? '' : '#' + id;
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

    return (
        <>
            <main className="mx-auto grid w-full max-w-6xl flex-1 gap-8 px-4 py-8 lg:grid-cols-[220px_1fr]">
                <aside className="lg:sticky lg:top-20 lg:self-start">
                    <h2 className="text-lg font-bold">星空笔记</h2>
                    <p className="mt-1 text-xs text-muted-foreground">记录技术、天文与生活</p>
                    <div className="mt-4 space-y-1.5 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1.5"><FileText size={13} className="opacity-50" /><strong className="text-foreground">{posts.length}</strong> 篇文章</div>
                        <div className="flex items-center gap-1.5"><FolderTree size={13} className="opacity-50" /><strong className="text-foreground">{cats.length}</strong> 个分类</div>
                        <div className="flex items-center gap-1.5"><Tags size={13} className="opacity-50" /><strong className="text-foreground">{topTags.length}</strong> 个标签</div>
                    </div>
                    <div className="mt-5 mb-2 text-xs font-semibold text-muted-foreground uppercase">分类</div>
                    <div className="flex flex-col gap-1">
                        {cats.map(([cat, n]) => (
                            <button
                                key={cat}
                                onClick={() => toggleCat(cat)}
                                className={`flex items-center justify-between rounded-md px-2 py-1.5 text-left text-sm transition-colors ${activeCat === cat ? 'bg-accent font-semibold text-accent-foreground' : 'text-muted-foreground hover:bg-accent/50'}`}
                            >
                                {cat}<span className="text-xs opacity-60">{n}</span>
                            </button>
                        ))}
                    </div>
                    <div className="mt-5 mb-2 text-xs font-semibold text-muted-foreground uppercase">标签</div>
                    <div className="flex flex-wrap gap-1.5">
                        {topTags.map(([tag, n]) => (
                            <Badge
                                key={tag}
                                variant={activeTag === tag ? 'default' : 'outline'}
                                className="cursor-pointer"
                                render={<button type="button" onClick={() => toggleTag(tag)} />}
                            >
                                {tag} <span className="opacity-60">{n}</span>
                            </Badge>
                        ))}
                    </div>
                </aside>

                <section className="min-w-0">
                    <div className="relative mb-4">
                        <Search className="absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            placeholder="搜索笔记..."
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

                    <div style={{ minHeight: '60vh' }}>
                        {loadError && <EmptyMsg>加载失败: {loadError}</EmptyMsg>}
                        {!loadError && view === 'grid' && <GridView posts={filteredPosts} page={page} setPage={setPage} />}
                        {!loadError && view === 'timeline' && <TimelineView posts={filteredPosts} />}
                        {!loadError && view === 'directory' && <DirectoryView posts={filteredPosts} />}
                        {!loadError && view === 'tags' && <TagsView posts={filteredPosts} onPick={toggleTag} />}
                        {!loadError && view === 'aidaily' && <AiDailyView index={aiDailyIndex} error={aiDailyError} />}
                    </div>
                </section>
            </main>
            <Footer pageId="blog" />
            <BackToTop />
        </>
    );
}

function EmptyMsg({ children }) {
    return <div className="py-16 text-center text-sm text-muted-foreground">{children}</div>;
}

function GridView({ posts, page, setPage }) {
    if (posts.length === 0) return <EmptyMsg>没有匹配的文章</EmptyMsg>;
    const totalPages = Math.ceil(posts.length / PER_PAGE);
    const start = (page - 1) * PER_PAGE;
    const pagePosts = posts.slice(start, start + PER_PAGE);
    return (
        <>
            <div className="flex flex-col gap-2">
                {pagePosts.map((p) => <ArticleRow key={p.file} post={p} />)}
            </div>
            {totalPages > 1 && (
                <div className="mt-6 flex flex-wrap justify-center gap-1.5">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                        <Button
                            key={n}
                            variant={n === page ? 'default' : 'outline'}
                            size="icon"
                            onClick={() => { setPage(n); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                        >
                            {n}
                        </Button>
                    ))}
                </div>
            )}
        </>
    );
}

function TimelineView({ posts }) {
    if (posts.length === 0) return <EmptyMsg>没有匹配的文章</EmptyMsg>;
    const groups = {};
    posts.forEach((p) => {
        const ym = (p.date || '').substring(0, 7);
        (groups[ym] ||= []).push(p);
    });
    const entries = Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
    return entries.map(([ym, items]) => (
        <div key={ym} className="mb-6">
            <h3 className="mb-3 border-l-2 border-primary pl-3 text-sm font-semibold text-muted-foreground">
                {ym} <span className="text-xs opacity-60">{items.length}篇</span>
            </h3>
            <div className="flex flex-col gap-2">
                {items.map((p) => <ArticleRow key={p.file} post={p} refHash="#timeline" />)}
            </div>
        </div>
    ));
}

function DirectoryView({ posts }) {
    if (posts.length === 0) return <EmptyMsg>没有匹配的文章</EmptyMsg>;
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

function TagsView({ posts, onPick }) {
    const tags = {};
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
                        variant="outline"
                        className="cursor-pointer"
                        style={{ fontSize: `${size}rem` }}
                        render={<button type="button" onClick={() => onPick(t)} />}
                    >
                        {t} <span className="opacity-60">{n}</span>
                    </Badge>
                );
            })}
        </div>
    );
}

function AiDailyView({ index, error }) {
    if (error) return <EmptyMsg>AI 日报加载失败: {error}</EmptyMsg>;
    if (index === null) return <EmptyMsg>加载中...</EmptyMsg>;
    if (!index.length) return <EmptyMsg>暂无 AI 日报，等待每日自动生成...</EmptyMsg>;
    return (
        <div className="flex flex-col gap-2">
            {index.map((d) => {
                const date = new Date(d.date);
                const ds = isNaN(date) ? d.date : date.toLocaleDateString('zh-CN', { weekday: 'short', month: 'short', day: 'numeric' });
                const cleanTitle = (d.title || '')
                    .replace(/^[^\w一-鿿]+/, '')
                    .replace(/^(AI|📰)\s*[-—]?\s*/i, '')
                    .trim();
                return (
                    <a key={d.date} href={withBase(`/post?ai=${encodeURIComponent(d.date)}`)} className="flex gap-4 rounded-lg border p-3 transition-colors hover:border-primary/50 hover:bg-accent/40">
                        <div className="hidden w-16 shrink-0 text-center text-xs text-muted-foreground sm:block">{ds}</div>
                        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                            <Bot size={20} />
                        </div>
                        <div className="min-w-0 flex-1">
                            <h3 className="line-clamp-1 text-sm font-semibold"><Badge className="mr-1.5 align-middle text-[0.6rem]">AI</Badge>{cleanTitle}</h3>
                            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{(d.summary || '').replace(/\*\*/g, '').replace(/🥇|🥈|🥉/g, '')}</p>
                            <div className="mt-2">
                                <Badge variant="secondary" className="text-[0.65rem]">{d.articleCount || '—'} 篇</Badge>
                            </div>
                        </div>
                    </a>
                );
            })}
        </div>
    );
}
