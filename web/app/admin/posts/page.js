'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Pencil, Trash2, ExternalLink, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { apiGet, apiUpdate, apiDelete } from '@/lib/adminApi';
import { useConfirm } from '@/components/useConfirm';
import AdminHeader from '@/components/admin/AdminHeader';
import { postHref } from '@/lib/links';

export default function PostsAdmin() {
    const [items, setItems] = useState([]);
    const [open, setOpen] = useState(false);
    const [form, setForm] = useState(null);
    const [saving, setSaving] = useState(false);
    const [confirm, confirmDialog] = useConfirm();

    async function load() { try { setItems(await apiGet('/api/posts')); } catch (e) { toast.error(e.message); } }
    useEffect(() => { load(); }, []);

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
        <div className="mx-auto max-w-5xl px-8 py-10">
            {confirmDialog}
            <AdminHeader title="博客文章" count={items.length} />
            <p className="mt-3 text-xs text-muted-foreground">文章正文以 Markdown 文件形式管理(发文=新增 .md 文件)。此处可编辑元信息或删除。</p>

            <div className="mt-6 flex flex-col gap-2">
                {items.map((p) => (
                    <Card key={p.file} className="flex-row items-center gap-3 p-3">
                        <FileText className="size-5 shrink-0 text-muted-foreground" />
                        <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-medium">{p.title || p.file}</div>
                            <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                                <span>{p.date}</span>
                                <Badge variant="secondary" className="text-[0.6rem]">{p.category}</Badge>
                                {(p.tags || []).slice(0, 3).map((t) => <Badge key={t} variant="outline" className="text-[0.6rem]">{t}</Badge>)}
                                <span className="font-mono opacity-60">{p.file}</span>
                            </div>
                        </div>
                        <a href={postHref(p.file)} target="_blank" rel="noreferrer" className="shrink-0 text-muted-foreground hover:text-primary"><ExternalLink className="size-4" /></a>
                        <Button variant="ghost" size="icon" onClick={() => openEdit(p)}><Pencil className="size-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => remove(p)}><Trash2 className="size-4 text-destructive" /></Button>
                    </Card>
                ))}
                {items.length === 0 && <p className="py-10 text-center text-sm text-muted-foreground">暂无文章</p>}
            </div>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent>
                    <DialogHeader><DialogTitle>编辑文章元信息</DialogTitle></DialogHeader>
                    {form && (
                        <div className="flex flex-col gap-3">
                            <div className="text-xs text-muted-foreground">文件:<span className="font-mono">{form.file}</span></div>
                            <Input placeholder="标题" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                            <div className="grid grid-cols-2 gap-3">
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
        </div>
    );
}
