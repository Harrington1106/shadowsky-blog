'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Pencil, Trash2, ExternalLink, FileText, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { apiGet, apiUpdate, apiDelete } from '@/lib/adminApi';
import { useConfirm } from '@/components/useConfirm';
import AdminHeader from '@/components/admin/AdminHeader';
import AdminPage from '@/components/admin/AdminPage';
import { ListSkeleton } from '@/components/admin/AdminSkeleton';
import { postHref } from '@/lib/links';

export default function PostsAdmin() {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [q, setQ] = useState('');
    const [open, setOpen] = useState(false);
    const [form, setForm] = useState(null);
    const [saving, setSaving] = useState(false);
    const [confirm, confirmDialog] = useConfirm();

    async function load() {
        try { setItems(await apiGet('/api/posts')); }
        catch (e) { toast.error(e.message); }
        finally { setLoading(false); }
    }
    useEffect(() => { load(); }, []);

    // 标题/文件名/分类/标签一起搜,大小写不敏感
    const shown = useMemo(() => {
        const kw = q.trim().toLowerCase();
        if (!kw) return items;
        return items.filter((p) => [p.title, p.file, p.category, ...(p.tags || [])]
            .some((v) => String(v || '').toLowerCase().includes(kw)));
    }, [items, q]);

    function openEdit(p) {
        setForm({ file: p.file, title: p.title || '', category: p.category || '', tags: (p.tags || []).join(', '), excerpt: p.excerpt || '', coverImage: p.coverImage || '' });
        setOpen(true);
    }

    async function save() {
        setSaving(true);
        try {
            await apiUpdate('/api/posts', { ...form, tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean) });
            toast.success('已更新 frontmatter'); setOpen(false); load();
        } catch (e) { toast.error(e.message); } finally { setSaving(false); }
    }

    async function remove(p) {
        if (!await confirm({ title: `删除文章「${p.title}」?`, description: 'Markdown 文件将被移除，不可恢复。' })) return;
        try { await apiDelete(`/api/posts?file=${encodeURIComponent(p.file)}`); toast.success('已删除'); load(); }
        catch (e) { toast.error(e.message); }
    }

    return (
        <AdminPage>
            {confirmDialog}
            <AdminHeader title="博客文章" count={items.length} />
            <p className="mt-3 text-xs text-muted-foreground">文章正文以 Markdown 文件形式管理(发文=新增 .md 文件)。此处可编辑元信息或删除。</p>

            <div className="relative mt-4">
                <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="搜索标题 / 文件名 / 分类 / 标签…" className="pl-9" />
            </div>

            <div className="mt-4 flex flex-col gap-2">
                {loading ? <ListSkeleton rows={6} /> : shown.map((p) => (
                    // 窄屏改成上下两段:标题一行,元信息+操作按钮一行。
                    // 原来一整行横排,375px 上三个按钮把标题挤成两三个字。
                    <Card key={p.file} className="flex-row items-start gap-3 p-3 sm:items-center">
                        <FileText className="mt-0.5 size-5 shrink-0 text-muted-foreground sm:mt-0" />
                        <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-medium">{p.title || p.file}</div>
                            <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                                <span>{p.date}</span>
                                <Badge variant="secondary" className="text-[0.6rem]">{p.category}</Badge>
                                {(p.tags || []).slice(0, 3).map((t) => <Badge key={t} variant="outline" className="text-[0.6rem]">{t}</Badge>)}
                                {/* 文件名只在宽屏露出:窄屏它总是最先把标题挤没的那一段 */}
                                <span className="hidden font-mono opacity-60 sm:inline">{p.file}</span>
                            </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-0.5">
                            <Button variant="ghost" size="icon" nativeButton={false} render={<a href={postHref(p.file)} target="_blank" rel="noreferrer" aria-label="在站点查看" />}>
                                <ExternalLink className="size-4" />
                            </Button>
                            <Button variant="ghost" size="icon" aria-label="编辑" onClick={() => openEdit(p)}><Pencil className="size-4" /></Button>
                            <Button variant="ghost" size="icon" aria-label="删除" onClick={() => remove(p)}><Trash2 className="size-4 text-destructive" /></Button>
                        </div>
                    </Card>
                ))}
                {!loading && shown.length === 0 && (
                    <p className="py-10 text-center text-sm text-muted-foreground">{q ? `没有匹配「${q}」的文章` : '暂无文章'}</p>
                )}
            </div>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent>
                    <DialogHeader><DialogTitle>编辑文章元信息</DialogTitle></DialogHeader>
                    {form && (
                        <div className="flex flex-col gap-3">
                            <div className="text-xs text-muted-foreground">文件:<span className="font-mono">{form.file}</span></div>
                            <Input placeholder="标题" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                <Input placeholder="分类" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
                                <Input placeholder="标签(逗号分隔)" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} />
                            </div>
                            <Input placeholder="封面图 URL" value={form.coverImage} onChange={(e) => setForm({ ...form, coverImage: e.target.value })} />
                            <Textarea placeholder="摘要" value={form.excerpt} onChange={(e) => setForm({ ...form, excerpt: e.target.value })} />
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setOpen(false)}>取消</Button>
                        <Button onClick={save} disabled={saving}>{saving ? '保存中…' : '保存'}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AdminPage>
    );
}
