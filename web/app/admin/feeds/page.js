'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Plus, Trash2, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { apiGet, apiCreate, apiDelete } from '@/lib/adminApi';
import AdminHeader from '@/components/admin/AdminHeader';

const EMPTY = { title: '', url: '', category: '' };

export default function FeedsAdmin() {
    const [items, setItems] = useState([]);
    const [open, setOpen] = useState(false);
    const [form, setForm] = useState(EMPTY);
    const [saving, setSaving] = useState(false);

    async function load() { try { setItems(await apiGet('/api/feeds')); } catch (e) { toast.error(e.message); } }
    useEffect(() => { load(); }, []);

    async function save() {
        if (!form.title || !form.url) { toast.error('名称和 URL 必填'); return; }
        setSaving(true);
        try { await apiCreate('/api/feeds', form); toast.success('已新增'); setOpen(false); setForm(EMPTY); load(); }
        catch (e) { toast.error(e.message); } finally { setSaving(false); }
    }

    async function remove(f) {
        if (!confirm(`删除订阅源「${f.title}」?`)) return;
        try { await apiDelete(`/api/feeds?id=${f.id}`); toast.success('已删除'); load(); }
        catch (e) { toast.error(e.message); }
    }

    return (
        <div className="mx-auto max-w-3xl px-8 py-10">
            <AdminHeader title="RSS 订阅源" count={items.length} action={<Button size="sm" onClick={() => { setForm(EMPTY); setOpen(true); }}><Plus className="size-4" /> 新增</Button>} />

            <div className="mt-6 flex flex-col gap-2">
                {items.map((f) => (
                    <div key={f.id} className="flex items-center gap-3 rounded-lg border p-3">
                        <div className="min-w-0 flex-1">
                            <div className="text-sm font-medium">{f.title}</div>
                            <a href={f.url} target="_blank" rel="noreferrer" className="flex items-center gap-1 truncate text-xs text-muted-foreground hover:text-primary">
                                <ExternalLink className="size-3 shrink-0" />{f.url}
                            </a>
                        </div>
                        {f.category && <span className="shrink-0 text-xs text-muted-foreground">{f.category}</span>}
                        <Button variant="ghost" size="icon" onClick={() => remove(f)}><Trash2 className="size-4 text-destructive" /></Button>
                    </div>
                ))}
                {items.length === 0 && <p className="py-10 text-center text-sm text-muted-foreground">暂无订阅源</p>}
            </div>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent>
                    <DialogHeader><DialogTitle>新增订阅源</DialogTitle></DialogHeader>
                    <div className="flex flex-col gap-3">
                        <Input placeholder="名称 *" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                        <Input placeholder="RSS/Atom URL *" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} />
                        <Input placeholder="分类" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
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
