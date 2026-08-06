'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, ExternalLink, Wand2, Languages, FolderTree, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useConfirm } from '@/components/useConfirm';
import { apiGet, apiCreate, apiUpdate, apiDelete } from '@/lib/adminApi';
import { aiGuessTitleDesc, aiTranslate, hasAiKey } from '@/lib/aiClient';
import AdminHeader from '@/components/admin/AdminHeader';
import AdminPage from '@/components/admin/AdminPage';
import { TableSkeleton } from '@/components/admin/AdminSkeleton';
import BookmarkCategoryDialog from '@/components/admin/BookmarkCategoryDialog';

const EMPTY = { url: '', title: '', category: '', subcategory: '', tags: '', description: '' };

const NONE = '__none__'; // base-ui 的 Select 不接受空字符串作为选项值

/**
 * 拼下拉选项:已登记的分类 + 当前这条收藏用的老 slug(可能没登记过,不能让它在编辑时丢掉)。
 *
 * 起过中文名的就只显示中文名 —— 弹层宽度锁死等于触发器宽度(components/ui/select.jsx
 * 的 w-(--anchor-width)),再拼上 slug 会被截断成半个词。slug 对应关系在分类管理里看。
 */
function buildOptions(entries, current) {
    const opts = [{ value: NONE, label: '— 不分类 —' }];
    for (const [slug, name] of entries) {
        opts.push({ value: slug, label: name || slug });
    }
    if (current && !entries.some(([slug]) => slug === current)) {
        opts.push({ value: current, label: `${current}(未登记)` });
    }
    return opts;
}

export default function BookmarksAdmin() {
    const [items, setItems] = useState([]);
    const [categories, setCategories] = useState({});
    const [loading, setLoading] = useState(true);
    const [q, setQ] = useState('');
    const [open, setOpen] = useState(false);
    const [catOpen, setCatOpen] = useState(false);
    const [form, setForm] = useState(EMPTY);
    const [editing, setEditing] = useState(null);
    const [saving, setSaving] = useState(false);
    const [fetching, setFetching] = useState(false);
    const [translating, setTranslating] = useState(false);
    const [confirm, confirmDialog] = useConfirm();

    async function load() {
        try {
            const data = await apiGet('/api/bookmarks');
            setItems(data.bookmarks);
            setCategories(data.categories || {});
        } catch (e) { toast.error(e.message); }
        finally { setLoading(false); }
    }
    useEffect(() => { load(); }, []);

    // 标题/URL/标签/分类中文名一起搜 —— 收藏是后台条目最多的一页,靠肉眼翻已经不现实
    const shown = useMemo(() => {
        const kw = q.trim().toLowerCase();
        if (!kw) return items;
        return items.filter((b) => [
            b.title, b.url, b.description,
            categories[b.category]?.name, b.category,
            ...(b.tags || []),
        ].some((v) => String(v || '').toLowerCase().includes(kw)));
    }, [items, q, categories]);

    // 下拉选项:分类来自 categories,子分类跟着当前选中的分类走
    const catOptions = buildOptions(
        Object.entries(categories).map(([slug, c]) => [slug, c.name]),
        form.category,
    );
    const subOptions = buildOptions(
        Object.entries(categories[form.category]?.subcategories || {}),
        form.subcategory,
    );

    // 自动获取标题+简介:先服务端抓网页元信息,抓不到再用 AI 按域名推测
    async function autoFetch() {
        if (!form.url) { toast.error('请先填链接'); return; }
        setFetching(true);
        try {
            const res = await apiGet(`/api/metadata?url=${encodeURIComponent(form.url)}`).catch(() => ({}));
            if (res?.title) {
                setForm((f) => ({ ...f, title: res.title, description: res.description || f.description }));
                toast.success('已获取标题/简介');
            } else if (hasAiKey()) {
                const g = await aiGuessTitleDesc(form.url);
                setForm((f) => ({ ...f, title: g.title || f.title, description: g.desc || f.description }));
                toast.success('AI 已推测标题/简介');
            } else {
                try { setForm((f) => ({ ...f, title: new URL(form.url).hostname.replace(/^www\./, '') })); } catch { /* noop */ }
                toast.warning('抓取失败,已填域名(配置 AI 可自动推测)');
            }
        } catch (e) { toast.error(e.message); }
        finally { setFetching(false); }
    }

    // AI 翻译简介为中文
    async function translate() {
        if (!form.description) { toast.error('请先获取或填写简介'); return; }
        if (!hasAiKey()) { toast.error('请先在「设置 → AI 翻译」配置 API Key'); return; }
        setTranslating(true);
        try {
            const zh = await aiTranslate(form.description);
            if (zh) { setForm((f) => ({ ...f, description: zh })); toast.success('翻译完成'); }
        } catch (e) { toast.error('翻译失败: ' + e.message); }
        finally { setTranslating(false); }
    }

    function openNew() { setForm(EMPTY); setEditing(null); setOpen(true); }
    function openEdit(b) {
        setForm({ ...b, tags: (b.tags || []).join(', ') });
        setEditing(b.id); setOpen(true);
    }

    async function save() {
        if (!form.url || !form.title) { toast.error('url 和标题必填'); return; }
        setSaving(true);
        const body = { ...form, tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean) };
        try {
            if (editing) { await apiUpdate('/api/bookmarks', { ...body, id: editing }); toast.success('已更新'); }
            else { await apiCreate('/api/bookmarks', body); toast.success('已新增'); }
            setOpen(false); load();
        } catch (e) { toast.error(e.message); }
        finally { setSaving(false); }
    }

    async function remove(b) {
        if (!await confirm({ title: `删除「${b.title}」?`, description: '该收藏会从列表中移除。' })) return;
        try { await apiDelete(`/api/bookmarks?id=${encodeURIComponent(b.id)}`); toast.success('已删除'); load(); }
        catch (e) { toast.error(e.message); }
    }

    return (
        <AdminPage>
            {confirmDialog}
            <AdminHeader title="收藏管理" count={items.length} action={
                <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => setCatOpen(true)}><FolderTree className="size-4" /> 分类管理</Button>
                    <Button size="sm" onClick={openNew}><Plus className="size-4" /> 新增</Button>
                </div>
            } />

            <BookmarkCategoryDialog open={catOpen} onOpenChange={setCatOpen} onSaved={load} />

            <div className="relative mt-4">
                <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="搜索标题 / 链接 / 简介 / 分类 / 标签…" className="pl-9" />
            </div>

            <Card className="mt-4 overflow-hidden py-0">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>标题</TableHead>
                            {/* 窄屏只留标题和操作:四列塞进 375px 只会触发横滚,而横滚里最先看不见的正是操作按钮 */}
                            <TableHead className="hidden md:table-cell">分类</TableHead>
                            <TableHead className="hidden lg:table-cell">标签</TableHead>
                            <TableHead className="text-right">操作</TableHead>
                        </TableRow>
                    </TableHeader>
                    {loading ? <TableSkeleton rows={6} cols={4} /> : (
                        <TableBody>
                            {shown.map((b) => (
                                <TableRow key={b.id}>
                                    <TableCell className="max-w-xs">
                                        <div className="truncate font-medium">{b.title}</div>
                                        <a href={b.url} target="_blank" rel="noreferrer" className="flex items-center gap-1 truncate text-xs text-muted-foreground hover:text-primary">
                                            <ExternalLink className="size-3 shrink-0" />{b.url}
                                        </a>
                                        {/* 分类列在窄屏收起来了,那这行信息得在标题下面补回来,不能直接丢 */}
                                        <div className="mt-1 text-xs text-muted-foreground md:hidden">
                                            {categories[b.category]?.name || b.category || '未分类'}
                                            {b.subcategory ? ` / ${categories[b.category]?.subcategories?.[b.subcategory] || b.subcategory}` : ''}
                                        </div>
                                    </TableCell>
                                    <TableCell className="hidden text-muted-foreground md:table-cell">
                                        {categories[b.category]?.name || b.category || '—'}
                                        {b.subcategory ? ` / ${categories[b.category]?.subcategories?.[b.subcategory] || b.subcategory}` : ''}
                                    </TableCell>
                                    <TableCell className="hidden lg:table-cell">
                                        <div className="flex flex-wrap gap-1">
                                            {(b.tags || []).slice(0, 3).map((t) => <Badge key={t} variant="outline" className="text-[0.65rem]">{t}</Badge>)}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex justify-end gap-1">
                                            <Button variant="ghost" size="icon" aria-label="编辑" onClick={() => openEdit(b)}><Pencil className="size-4" /></Button>
                                            <Button variant="ghost" size="icon" aria-label="删除" onClick={() => remove(b)}><Trash2 className="size-4 text-destructive" /></Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {shown.length === 0 && (
                                <TableRow><TableCell colSpan={4} className="py-10 text-center text-muted-foreground">
                                    {q ? `没有匹配「${q}」的收藏` : '暂无收藏'}
                                </TableCell></TableRow>
                            )}
                        </TableBody>
                    )}
                </Table>
            </Card>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent>
                    <DialogHeader><DialogTitle>{editing ? '编辑收藏' : '新增收藏'}</DialogTitle></DialogHeader>
                    <div className="flex flex-col gap-3">
                        <div className="flex gap-2">
                            <Input placeholder="URL *" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} />
                            <Button type="button" variant="outline" disabled={fetching} onClick={autoFetch} title="自动获取标题/简介(抓网页,失败用 AI 推测)">
                                <Wand2 className="size-4" /> {fetching ? '获取中…' : '自动获取'}
                            </Button>
                        </div>
                        <Input placeholder="标题 *" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            {/* 换分类时清掉子分类 —— 子分类是挂在分类下面的,留着就成了跨分类的孤儿 slug */}
                            <Select items={catOptions} value={form.category || NONE}
                                onValueChange={(v) => setForm({ ...form, category: v === NONE ? '' : v, subcategory: '' })}>
                                <SelectTrigger><SelectValue placeholder="分类" /></SelectTrigger>
                                <SelectContent>
                                    {catOptions.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                                </SelectContent>
                            </Select>
                            <Select items={subOptions} value={form.subcategory || NONE}
                                onValueChange={(v) => setForm({ ...form, subcategory: v === NONE ? '' : v })}>
                                <SelectTrigger><SelectValue placeholder="子分类" /></SelectTrigger>
                                <SelectContent>
                                    {subOptions.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <Input placeholder="标签(逗号分隔)" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} />
                        <div className="relative">
                            <Textarea placeholder="描述" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="pr-24" />
                            <Button type="button" variant="ghost" size="sm" disabled={translating} onClick={translate} className="absolute right-1.5 top-1.5 h-7 gap-1 text-xs" title="AI 翻译为中文">
                                <Languages className="size-3.5" /> {translating ? '翻译中' : '翻译'}
                            </Button>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setOpen(false)}>取消</Button>
                        <Button onClick={save} disabled={saving}>{saving ? '保存中…' : '保存'}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AdminPage>
    );
}
