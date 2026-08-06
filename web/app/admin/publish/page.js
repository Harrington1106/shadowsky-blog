'use client';

/**
 * 发布台（后台版）—— 把原来那个手写 CSS 的独立小服务搬进后台，
 * 用和其它后台页同一套 shadcn 组件，风格自动跟着后台走。
 *
 * ⚠ 只在 dev 存在：发布要 ssh/scp 到服务器，线上容器里没有也不该有私钥。
 *   后端每个 route 都有 devOnly() 守卫，这里只是不给入口。
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
    FileText, Globe, Image as ImageIcon, Loader2, Rocket, Trash2, Eye, RefreshCw, AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { apiGet, apiUpdate, apiDelete } from '@/lib/adminApi';
import { useConfirm } from '@/components/useConfirm';
import AdminHeader from '@/components/admin/AdminHeader';
import AdminPage from '@/components/admin/AdminPage';
import { cn } from '@/lib/utils';

const ago = (ms) => {
    const m = Math.floor((Date.now() - ms) / 60000);
    if (m < 1) return '刚刚';
    if (m < 60) return `${m} 分钟前`;
    const h = Math.floor(m / 60);
    return h < 24 ? `${h} 小时前` : `${Math.floor(h / 24)} 天前`;
};

/** 左栏的一条。草稿显示相对时间，已发布显示日期。 */
function ListItem({ item, active, onPick }) {
    return (
        <button
            type="button"
            onClick={onPick}
            className={cn(
                'w-full cursor-pointer rounded-lg border px-3 py-2.5 text-left transition-colors',
                active ? 'border-border bg-muted' : 'border-transparent hover:bg-muted/60',
            )}
        >
            <div className={cn('line-clamp-2 text-sm leading-snug', item.src === 'draft' ? 'font-semibold' : 'font-medium')}>
                {item.title}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
                <span className="tabular-nums">{item.src === 'draft' ? ago(item.mtime) : item.date}</span>
                {item.category ? <span>· {item.category}</span> : null}
                <span>· {item.words} 字</span>
                {item.src === 'draft' && (
                    <Badge variant={item.live ? 'secondary' : 'outline'} className="h-4 px-1.5 text-[10px]">
                        {item.live ? '站上已有' : '新文章'}
                    </Badge>
                )}
                {item.issues > 0 && (
                    <Badge variant="outline" className="h-4 gap-0.5 px-1.5 text-[10px] text-amber-600 dark:text-amber-500">
                        <AlertTriangle className="size-2.5" />{item.issues}
                    </Badge>
                )}
            </div>
        </button>
    );
}

export default function PublishAdmin() {
    const [lists, setLists] = useState({ drafts: [], posts: [] });
    const [cur, setCur] = useState(null);          // { file, src }
    const [detail, setDetail] = useState(null);
    const [log, setLog] = useState('');
    const [busy, setBusy] = useState(false);
    const [stripH1, setStripH1] = useState(true);
    const [form, setForm] = useState(null);
    const [confirm, confirmDialog] = useConfirm();
    const mtimeRef = useRef(0);
    const previewRef = useRef(null);

    const loadLists = useCallback(async () => {
        try { setLists(await apiGet('/api/publish-local/list')); }
        catch (e) { toast.error(e.message); }
    }, []);

    const loadDetail = useCallback(async (file, src, keepScroll) => {
        try {
            const keep = keepScroll ? previewRef.current?.scrollTop ?? 0 : 0;
            const d = await apiGet(`/api/publish-local/inspect?file=${encodeURIComponent(file)}&src=${src}`);
            mtimeRef.current = d.mtime;
            setDetail(d);
            setForm({
                title: d.raw.title || '', category: d.raw.category || '',
                tags: (d.raw.tags || []).join(', '), coverImage: d.raw.coverImage || '',
                excerpt: d.raw.excerpt || '',
            });
            requestAnimationFrame(() => { if (previewRef.current) previewRef.current.scrollTop = keep; });
        } catch (e) { toast.error(e.message); }
    }, []);

    useEffect(() => { loadLists(); }, [loadLists]);

    // 首次加载后自动选第一篇草稿
    useEffect(() => {
        if (!cur && lists.drafts.length) setCur({ file: lists.drafts[0].file, src: 'draft' });
    }, [lists, cur]);

    useEffect(() => { if (cur) loadDetail(cur.file, cur.src); }, [cur, loadDetail]);

    /*
     * Obsidian 那边保存，这边自动刷新。
     * ⚠ 只在不忙的时候轮询：发布过程中重载会把正在流的日志擦掉。
     */
    useEffect(() => {
        if (!cur) return undefined;
        const t = setInterval(async () => {
            if (busy) return;
            try {
                const d = await apiGet(`/api/publish-local/inspect?file=${encodeURIComponent(cur.file)}&src=${cur.src}`);
                if (d.mtime !== mtimeRef.current) { loadDetail(cur.file, cur.src, true); toast.info('已更新'); }
            } catch { /* 文件正好被删/改名，下一轮会好 */ }
        }, 1500);
        return () => clearInterval(t);
    }, [cur, busy, loadDetail]);

    async function run(mode) {
        setBusy(true);
        setLog('执行中…\n');
        try {
            const res = await fetch('/api/publish-local/run', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ file: cur.file, src: cur.src, mode, stripH1: stripH1 && detail?.duplicateH1 }),
            });
            if (!res.body) { setLog(await res.text()); return; }
            const reader = res.body.getReader();
            const dec = new TextDecoder();
            let acc = '';
            for (;;) {
                const { value, done } = await reader.read();
                if (done) break;
                acc += dec.decode(value, { stream: true });
                setLog(acc);
            }
            if (/退出码 0/.test(acc)) toast.success(mode === 'preview' ? '已写入本地预览' : '发布完成');
            else toast.error('没有正常结束，看日志');
        } catch (e) {
            toast.error(e.message);
        } finally {
            setBusy(false);
            loadLists();
        }
    }

    async function checkImages() {
        setBusy(true);
        setLog('抓取中…\n');
        try {
            const res = await fetch('/api/publish-local/check-images', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ file: cur.file, src: cur.src }),
            });
            const r = await res.json();
            const bad = r.filter((x) => !x.ok);
            setLog(r.map((x) => (x.ok ? '✓ ' : '✗ ') + x.url + (x.ok ? `  (${x.kb}KB)` : `\n    ${x.msg}`)).join('\n')
                + (bad.length ? '\n\n跨境图床多半要过代理。关掉 dev server，带上代理再启动：\n  HTTPS_PROXY=http://127.0.0.1:7890 npm run dev' : ''));
            if (bad.length) toast.error(`${bad.length}/${r.length} 张抓不到`);
            else toast.success(`${r.length} 张都能抓`);
        } catch (e) { toast.error(e.message); } finally { setBusy(false); }
    }

    async function saveMeta() {
        try {
            await apiUpdate('/api/publish-local/meta', { file: cur.file, src: cur.src, ...form });
            toast.success('已写回文件');
            loadLists(); loadDetail(cur.file, cur.src, true);
        } catch (e) { toast.error(e.message); }
    }

    async function remove() {
        if (!await confirm({ title: `删除草稿「${detail.meta.title}」？`, description: '文件会被移除，不可恢复。' })) return;
        try {
            await apiDelete(`/api/publish-local/meta?file=${encodeURIComponent(cur.file)}&src=draft`);
            toast.success('已删除'); setCur(null); setDetail(null); loadLists();
        } catch (e) { toast.error(e.message); }
    }

    async function doPublish() {
        const what = detail.live ? '覆盖线上已有的文章' : '新发一篇';
        if (!await confirm({
            title: `${detail.live ? '更新' : '发布'} shadowquake.top/post/${detail.slug}？`,
            description: `${what}。会镜像图片、上传、清 CDN 缓存并验证。`,
        })) return;
        run('publish');
    }

    const d = detail;

    return (
        // 原来根节点只有 space-y-4,内容一路贴到视口边上,是全后台唯一没有留白的一页
        <AdminPage width="full" className="space-y-4">
            <AdminHeader
                title="发布台"
                count={lists.drafts.length}
                action={
                    <Button variant="outline" size="sm" onClick={loadLists} className="cursor-pointer">
                        <RefreshCw className="size-4" />刷新
                    </Button>
                }
            />

            {/* 三档：窄屏竖排 → 中屏两栏 → 宽屏三栏 */}
            <div className="grid gap-4 lg:grid-cols-[240px_minmax(0,1fr)] xl:grid-cols-[240px_minmax(0,1fr)_330px]">
                {/* 列表 */}
                <Card className="lg:sticky lg:top-4 lg:max-h-[calc(100vh-7rem)] lg:self-start">
                    <CardContent className="p-3">
                        <Tabs defaultValue="drafts">
                            <TabsList className="w-full">
                                <TabsTrigger value="drafts" className="flex-1 cursor-pointer">
                                    <FileText className="size-3.5" />草稿 {lists.drafts.length}
                                </TabsTrigger>
                                <TabsTrigger value="posts" className="flex-1 cursor-pointer">
                                    <Globe className="size-3.5" />已发布 {lists.posts.length}
                                </TabsTrigger>
                            </TabsList>
                            <TabsContent value="drafts">
                                <ScrollArea className="h-[min(60vh,26rem)] pr-2">
                                    <div className="space-y-1">
                                        {lists.drafts.length ? lists.drafts.map((it) => (
                                            <ListItem key={it.file} item={it}
                                                active={cur?.file === it.file && cur?.src === 'draft'}
                                                onPick={() => setCur({ file: it.file, src: 'draft' })} />
                                        )) : <p className="px-1 py-6 text-center text-sm text-muted-foreground">还没有草稿</p>}
                                    </div>
                                </ScrollArea>
                            </TabsContent>
                            <TabsContent value="posts">
                                <ScrollArea className="h-[min(60vh,26rem)] pr-2">
                                    <div className="space-y-1">
                                        {lists.posts.map((it) => (
                                            <ListItem key={it.file} item={it}
                                                active={cur?.file === it.file && cur?.src === 'post'}
                                                onPick={() => setCur({ file: it.file, src: 'post' })} />
                                        ))}
                                    </div>
                                </ScrollArea>
                            </TabsContent>
                        </Tabs>
                    </CardContent>
                </Card>

                {/* 预览 —— 用站点自己的 .post-prose 样式 */}
                <Card>
                    <CardContent ref={previewRef} className="max-h-[calc(100vh-7rem)] overflow-auto p-5">
                        {!d ? (
                            <p className="py-20 text-center text-sm text-muted-foreground">左边选一篇</p>
                        ) : (
                            <>
                                {d.meta.coverImage ? (
                                    <div className="mb-5 h-44 rounded-xl border bg-cover bg-center"
                                        style={{ backgroundImage: `url('${d.meta.coverImage}')` }} />
                                ) : (
                                    <div className="mb-5 flex h-20 items-center justify-center rounded-xl border bg-muted text-xs text-muted-foreground">
                                        未设封面 · 线上会用分类默认图
                                    </div>
                                )}
                                <h1 className="text-2xl font-extrabold tracking-tight">{d.meta.title}</h1>
                                <p className="mt-1 border-b pb-4 text-xs text-muted-foreground">
                                    {d.meta.date} · {d.meta.category} · {d.meta.readTime} 分钟阅读
                                </p>
                                <div className="post-prose mt-5" dangerouslySetInnerHTML={{ __html: d.html }} />
                            </>
                        )}
                    </CardContent>
                </Card>

                {/* 信息 + 操作 */}
                <Card className="xl:sticky xl:top-4 xl:max-h-[calc(100vh-7rem)] xl:self-start xl:overflow-auto">
                    <CardContent className="space-y-4 p-4">
                        {!d ? <p className="text-sm text-muted-foreground">—</p> : (
                            <>
                                {d.src === 'post' && (
                                    <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-xs leading-relaxed">
                                        这是<b>已发布文章的本地镜像</b>。在这里改只动本地副本 —— 要线上生效，改完必须点「更新线上文章」。
                                    </div>
                                )}
                                {d.problems.map((p) => (
                                    <div key={p} className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-xs">{p}</div>
                                ))}
                                {d.duplicateH1 && (
                                    <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-xs leading-relaxed">
                                        <input type="checkbox" checked={stripH1} onChange={(e) => setStripH1(e.target.checked)} className="mt-0.5 cursor-pointer" />
                                        <span>正文第一个 H1「{d.duplicateH1}」和标题重复，页面会有两个 h1。勾上则发布时删掉。</span>
                                    </label>
                                )}
                                {d.lint.map((i) => (
                                    <div key={i.kind} className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-xs leading-relaxed">
                                        {i.msg}
                                        <div className="mt-1 opacity-75">建议：{i.fix}</div>
                                    </div>
                                ))}

                                <div>
                                    <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">这次发布</div>
                                    <dl className="divide-y text-xs">
                                        <Row k="动作" v={d.live ? '更新站上已有的文章' : '新发一篇'} />
                                        <Row k="地址" v={`/post/${d.slug}`} />
                                        <Row k="待镜像图片" v={d.images.length ? `${d.images.length} 张` : '无跨境图片 ✓'} />
                                        <Row k="阅读时长" v={`${d.meta.readTime} 分钟（自动）`} />
                                        <Row k="摘要" v={d.excerptAuto ? '自动抽取' : '你写的'} />
                                    </dl>
                                    <p className="pt-2 text-xs leading-relaxed text-muted-foreground">{d.meta.excerpt || '（空）'}</p>
                                </div>

                                <Separator />

                                <details>
                                    <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">改字段</summary>
                                    <div className="mt-3 space-y-2.5">
                                        {[['title', '标题'], ['category', '分类'], ['tags', '标签（逗号分隔）'], ['coverImage', '封面地址']].map(([k, label]) => (
                                            <div key={k} className="space-y-1">
                                                <Label htmlFor={`f-${k}`} className="text-xs">{label}</Label>
                                                <Input id={`f-${k}`} value={form?.[k] ?? ''} onChange={(e) => setForm({ ...form, [k]: e.target.value })} />
                                            </div>
                                        ))}
                                        <div className="space-y-1">
                                            <Label htmlFor="f-excerpt" className="text-xs">摘要（留空则自动抽）</Label>
                                            <Textarea id="f-excerpt" rows={3} value={form?.excerpt ?? ''} onChange={(e) => setForm({ ...form, excerpt: e.target.value })} />
                                        </div>
                                        <Button variant="outline" size="sm" className="w-full cursor-pointer" onClick={saveMeta}>写回文件</Button>
                                    </div>
                                </details>

                                <div className="space-y-2">
                                    <Button className="w-full cursor-pointer" disabled={busy || d.problems.length > 0} onClick={doPublish}>
                                        {busy ? <Loader2 className="size-4 animate-spin" /> : <Rocket className="size-4" />}
                                        {d.live ? '更新线上文章' : '发布到线上'}
                                    </Button>
                                    <div className="flex gap-2">
                                        {d.images.length > 0 && (
                                            <Button variant="outline" size="sm" className="flex-1 cursor-pointer" disabled={busy} onClick={checkImages}>
                                                <ImageIcon className="size-3.5" />试抓图片
                                            </Button>
                                        )}
                                        {d.src === 'draft' && (
                                            <>
                                                <Button variant="outline" size="sm" className="flex-1 cursor-pointer" disabled={busy} onClick={() => run('preview')}>
                                                    <Eye className="size-3.5" />本地预览
                                                </Button>
                                                <Button variant="outline" size="sm" className="cursor-pointer text-destructive" disabled={busy} onClick={remove}>
                                                    <Trash2 className="size-3.5" />
                                                </Button>
                                            </>
                                        )}
                                    </div>
                                </div>

                                {log && (
                                    <pre className="max-h-72 overflow-auto whitespace-pre-wrap rounded-lg border bg-muted p-3 text-[11px] leading-relaxed">{log}</pre>
                                )}
                            </>
                        )}
                    </CardContent>
                </Card>
            </div>
            {confirmDialog}
        </AdminPage>
    );
}

function Row({ k, v }) {
    return (
        <div className="flex justify-between gap-3 py-1.5">
            <dt className="shrink-0 text-muted-foreground">{k}</dt>
            <dd className="min-w-0 break-all text-right">{v}</dd>
        </div>
    );
}
