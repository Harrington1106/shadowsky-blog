'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Upload } from 'lucide-react';
import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { apiGet, apiCreate, apiUpdate, apiDelete } from '@/lib/adminApi';
import { useConfirm } from '@/components/useConfirm';
import AdminHeader from '@/components/admin/AdminHeader';

const EMPTY = { content: '', image: '', location: '', tags: '' };

export default function MomentsAdmin() {
    const [items, setItems] = useState([]);
    const [open, setOpen] = useState(false);
    const [form, setForm] = useState(EMPTY);
    const [editing, setEditing] = useState(null);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [confirm, confirmDialog] = useConfirm();
    const fileRef = useRef(null);

    async function load() {
        try { setItems(await apiGet('/api/moments')); } catch (e) { toast.error(e.message); }
    }
    useEffect(() => { load(); }, []);

    async function handleUpload(e) {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploading(true);
        try {
            const fd = new FormData();
            fd.append('image', file);
            const res = await fetch('/api/upload', { method: 'POST', body: fd });
            if (res.status === 401) { window.location.href = '/admin/login'; return; }
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || '上传失败');
            setForm((f) => ({ ...f, image: data.url }));
            toast.success('图片已上传');
        } catch (err) { toast.error(err.message); }
        finally { setUploading(false); if (fileRef.current) fileRef.current.value = ''; }
    }

    function openNew() { setForm(EMPTY); setEditing(null); setOpen(true); }
    function openEdit(m) { setForm({ content: m.content || '', image: m.image || '', location: m.location || '', tags: (m.tags || []).join(', ') }); setEditing(m.id); setOpen(true); }

    async function save() {
        if (!form.content && !form.image) { toast.error('内容或图片至少填一个'); return; }
        setSaving(true);
        const body = { ...form, tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean) };
        try {
            if (editing) { await apiUpdate('/api/moments', { ...body, id: editing }); toast.success('已更新'); }
            else { await apiCreate('/api/moments', body); toast.success('已发布'); }
            setOpen(false); load();
        } catch (e) { toast.error(e.message); } finally { setSaving(false); }
    }

    async function remove(m) {
        if (!await confirm({ title: '删除这条随手拍?', description: '删除后无法恢复。' })) return;
        try { await apiDelete(`/api/moments?id=${encodeURIComponent(m.id)}`); toast.success('已删除'); load(); }
        catch (e) { toast.error(e.message); }
    }

    return (
        <div className="mx-auto max-w-5xl px-8 py-10">
            {confirmDialog}
            <AdminHeader title="随手拍" count={items.length} action={<Button size="sm" onClick={openNew}><Plus className="size-4" /> 发布</Button>} />

            <div className="mt-6 flex flex-col gap-2">
                {items.map((m) => (
                    <div key={m.id} className="flex gap-3 rounded-lg border p-3">
                        {m.image && <img src={m.image} alt="" className="size-16 shrink-0 rounded-md object-cover" />}
                        <div className="min-w-0 flex-1">
                            <div className="line-clamp-2 text-sm">{m.content || <span className="text-muted-foreground">（无文字）</span>}</div>
                            <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                                <span>{new Date(m.date).toLocaleDateString('zh-CN')}</span>
                                {m.location && <span>· {m.location}</span>}
                                {m.fromGithub && <Badge variant="outline" className="text-[0.6rem]">GitHub</Badge>}
                                {(m.tags || []).slice(0, 3).map((t) => <Badge key={t} variant="secondary" className="text-[0.6rem]">{t}</Badge>)}
                            </div>
                        </div>
                        <div className="flex shrink-0 gap-1">
                            <Button variant="ghost" size="icon" onClick={() => openEdit(m)}><Pencil className="size-4" /></Button>
                            <Button variant="ghost" size="icon" onClick={() => remove(m)}><Trash2 className="size-4 text-destructive" /></Button>
                        </div>
                    </div>
                ))}
                {items.length === 0 && <p className="py-10 text-center text-sm text-muted-foreground">暂无随手拍</p>}
            </div>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent>
                    <DialogHeader><DialogTitle>{editing ? '编辑随手拍' : '发布随手拍'}</DialogTitle></DialogHeader>
                    <div className="flex flex-col gap-3">
                        <Textarea placeholder="想说点什么…" value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} />
                        <div className="flex gap-2">
                            <Input placeholder="图片 URL(或点右侧上传)" value={form.image} onChange={(e) => setForm({ ...form, image: e.target.value })} />
                            <input ref={fileRef} type="file" accept="image/*" hidden onChange={handleUpload} />
                            <Button type="button" variant="outline" disabled={uploading} onClick={() => fileRef.current?.click()}>
                                <Upload className="size-4" /> {uploading ? '上传中…' : '上传'}
                            </Button>
                        </div>
                        {form.image && <img src={form.image} alt="" className="h-24 w-auto rounded-md border object-cover" />}
                        <div className="grid grid-cols-2 gap-3">
                            <Input placeholder="位置" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
                            <Input placeholder="标签(逗号分隔)" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setOpen(false)}>取消</Button>
                        <Button onClick={save} disabled={saving}>{saving ? '保存中…' : '保存'}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
