'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { apiGet, apiCreate, apiUpdate, apiDelete } from '@/lib/adminApi';
import AdminHeader from '@/components/admin/AdminHeader';

const EMPTY = { id: '', type: 'anime', title: '', cover: '', progress: 0, total: '', status: 'plan', tag: '' };

export default function MediaAdmin() {
    const [data, setData] = useState({ anime: [], manga: [] });
    const [tab, setTab] = useState('anime');
    const [open, setOpen] = useState(false);
    const [form, setForm] = useState(EMPTY);
    const [editing, setEditing] = useState(null);
    const [saving, setSaving] = useState(false);
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [searching, setSearching] = useState(false);

    async function load() { try { setData(await apiGet('/api/media')); } catch (e) { toast.error(e.message); } }
    useEffect(() => { load(); }, []);

    async function search() {
        if (!query.trim()) return;
        setSearching(true);
        try {
            const res = await fetch(`/api/bgm_search?q=${encodeURIComponent(query)}&type=${form.type}`);
            if (res.status === 401) { window.location.href = '/admin/login'; return; }
            const data = await res.json();
            setResults(Array.isArray(data?.data) ? data.data.slice(0, 8) : (Array.isArray(data?.list) ? data.list.slice(0, 8) : []));
        } catch (e) { toast.error('搜索失败: ' + e.message); }
        finally { setSearching(false); }
    }
    function pick(r) {
        setForm((f) => ({
            ...f,
            id: String(r.id),
            title: r.name_cn || r.name || f.title,
            cover: r.images?.large || r.images?.common || r.image || f.cover,
            total: r.eps || r.total_episodes || f.total,
        }));
        setResults([]);
        setQuery('');
    }

    function openNew() { setForm({ ...EMPTY, type: tab }); setEditing(null); setResults([]); setQuery(''); setOpen(true); }
    function openEdit(m) { setForm({ ...m, total: m.total === '?' ? '' : m.total, tag: m.tag || '' }); setEditing(m.id); setOpen(true); }

    async function save() {
        if (!form.id || !form.title) { toast.error('bgm id 和标题必填'); return; }
        setSaving(true);
        try {
            if (editing) { await apiUpdate('/api/media', form); toast.success('已更新'); }
            else { await apiCreate('/api/media', form); toast.success('已新增'); }
            setOpen(false); load();
        } catch (e) { toast.error(e.message); } finally { setSaving(false); }
    }

    async function remove(m) {
        if (!confirm(`删除「${m.title}」?`)) return;
        try { await apiDelete(`/api/media?id=${encodeURIComponent(m.id)}`); toast.success('已删除'); load(); }
        catch (e) { toast.error(e.message); }
    }

    const list = data[tab] || [];

    return (
        <div className="mx-auto max-w-5xl px-8 py-10">
            <AdminHeader title="追番 / 追漫" count={data.anime.length + data.manga.length} action={<Button size="sm" onClick={openNew}><Plus className="size-4" /> 新增</Button>} />

            <div className="mt-4 flex gap-2">
                {['anime', 'manga'].map((t) => (
                    <button key={t} onClick={() => setTab(t)} className={`rounded-md px-3 py-1.5 text-sm transition-colors ${tab === t ? 'bg-accent font-medium' : 'text-muted-foreground hover:bg-accent/50'}`}>
                        {t === 'anime' ? `追番 ${data.anime.length}` : `追漫 ${data.manga.length}`}
                    </button>
                ))}
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {list.map((m) => (
                    <div key={m.id} className="overflow-hidden rounded-lg border">
                        <div className="aspect-[2/3] bg-muted">
                            {m.cover && <img src={m.cover} alt="" className="size-full object-cover" />}
                        </div>
                        <div className="p-2.5">
                            <div className="truncate text-sm font-medium" title={m.title}>{m.title}</div>
                            <div className="mt-1 flex items-center justify-between">
                                <span className="text-xs text-muted-foreground">{m.progress}/{m.total} · {m.status}</span>
                                <div className="flex gap-0.5">
                                    <Button variant="ghost" size="icon" className="size-7" onClick={() => openEdit(m)}><Pencil className="size-3.5" /></Button>
                                    <Button variant="ghost" size="icon" className="size-7" onClick={() => remove(m)}><Trash2 className="size-3.5 text-destructive" /></Button>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
                {list.length === 0 && <p className="col-span-full py-10 text-center text-sm text-muted-foreground">暂无条目</p>}
            </div>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent>
                    <DialogHeader><DialogTitle>{editing ? '编辑条目' : '新增条目'}</DialogTitle></DialogHeader>
                    <div className="flex flex-col gap-3">
                        {!editing && (
                            <div className="rounded-lg border bg-muted/30 p-3">
                                <div className="mb-2 flex gap-2">
                                    <Input placeholder="搜索 Bangumi(番剧/漫画名)…" value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); search(); } }} />
                                    <Button type="button" variant="secondary" disabled={searching} onClick={search}><Search className="size-4" /> {searching ? '搜索中' : '搜索'}</Button>
                                </div>
                                {results.length > 0 && (
                                    <div className="flex max-h-56 flex-col gap-1 overflow-y-auto">
                                        {results.map((r) => (
                                            <button type="button" key={r.id} onClick={() => pick(r)} className="flex items-center gap-2 rounded-md p-1.5 text-left hover:bg-accent">
                                                {(r.images?.grid || r.images?.common || r.image) && <img src={r.images?.grid || r.images?.common || r.image} alt="" className="h-10 w-8 shrink-0 rounded object-cover" />}
                                                <span className="min-w-0 flex-1 truncate text-xs">{r.name_cn || r.name}</span>
                                                <span className="shrink-0 font-mono text-[0.6rem] text-muted-foreground">#{r.id}</span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                        <div className="grid grid-cols-2 gap-3">
                            <Input placeholder="Bangumi ID *" value={form.id} onChange={(e) => setForm({ ...form, id: e.target.value })} disabled={!!editing} />
                            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="rounded-md border bg-background px-3 text-sm">
                                <option value="anime">追番</option>
                                <option value="manga">追漫</option>
                            </select>
                        </div>
                        <Input placeholder="标题 *" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                        <Input placeholder="封面 URL" value={form.cover} onChange={(e) => setForm({ ...form, cover: e.target.value })} />
                        <div className="grid grid-cols-3 gap-3">
                            <Input type="number" placeholder="进度" value={form.progress} onChange={(e) => setForm({ ...form, progress: e.target.value })} />
                            <Input placeholder="总数(? 未知)" value={form.total} onChange={(e) => setForm({ ...form, total: e.target.value })} />
                            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="rounded-md border bg-background px-2 text-sm">
                                <option value="plan">想看</option>
                                <option value="watching">在看</option>
                                <option value="reading">在读</option>
                                <option value="completed">看完</option>
                                <option value="dropped">抛弃</option>
                            </select>
                        </div>
                        <Input placeholder="标签(可选)" value={form.tag} onChange={(e) => setForm({ ...form, tag: e.target.value })} />
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
