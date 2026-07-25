'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { apiGet, apiCreate, apiUpdate, apiDelete } from '@/lib/adminApi';
import AdminHeader from '@/components/admin/AdminHeader';

const EMPTY = { title: '', thumbnail: '', duration: '', views: 0, category: '', type: 'bilibili', bvid: '', kind: 'video' };

export default function VideosAdmin() {
    const [data, setData] = useState({ videos: [], favorites: [] });
    const [tab, setTab] = useState('videos');
    const [open, setOpen] = useState(false);
    const [form, setForm] = useState(EMPTY);
    const [editing, setEditing] = useState(null);
    const [saving, setSaving] = useState(false);

    async function load() { try { setData(await apiGet('/api/videos')); } catch (e) { toast.error(e.message); } }
    useEffect(() => { load(); }, []);

    function openNew() { setForm({ ...EMPTY, kind: tab === 'favorites' ? 'favorite' : 'video' }); setEditing(null); setOpen(true); }
    function openEdit(v) { setForm({ ...v, kind: tab === 'favorites' ? 'favorite' : 'video' }); setEditing(v.id); setOpen(true); }

    async function save() {
        if (!form.title) { toast.error('标题必填'); return; }
        setSaving(true);
        try {
            if (editing) { await apiUpdate('/api/videos', { ...form, id: editing }); toast.success('已更新'); }
            else { await apiCreate('/api/videos', form); toast.success('已新增'); }
            setOpen(false); load();
        } catch (e) { toast.error(e.message); } finally { setSaving(false); }
    }

    async function remove(v) {
        if (!confirm(`删除「${v.title}」?`)) return;
        try { await apiDelete(`/api/videos?id=${v.id}`); toast.success('已删除'); load(); }
        catch (e) { toast.error(e.message); }
    }

    const list = data[tab] || [];

    return (
        <div className="mx-auto max-w-5xl px-8 py-10">
            <AdminHeader title="视频" count={data.videos.length + data.favorites.length} action={<Button size="sm" onClick={openNew}><Plus className="size-4" /> 新增</Button>} />

            <div className="mt-4 flex gap-2">
                {[['videos', '我的剪辑'], ['favorites', '收藏视频']].map(([t, label]) => (
                    <button key={t} onClick={() => setTab(t)} className={`rounded-md px-3 py-1.5 text-sm transition-colors ${tab === t ? 'bg-accent font-medium' : 'text-muted-foreground hover:bg-accent/50'}`}>
                        {label} {data[t].length}
                    </button>
                ))}
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {list.map((v) => (
                    <div key={v.id} className="overflow-hidden rounded-lg border">
                        <div className="aspect-video bg-muted">
                            {v.thumbnail && <img src={v.thumbnail} alt="" className="size-full object-cover" />}
                        </div>
                        <div className="p-2.5">
                            <div className="line-clamp-1 text-sm font-medium" title={v.title}>{v.title}</div>
                            <div className="mt-1 flex items-center justify-between">
                                <span className="text-xs text-muted-foreground">{v.duration || '—'} · {v.views} 播放</span>
                                <div className="flex gap-0.5">
                                    <Button variant="ghost" size="icon" className="size-7" onClick={() => openEdit(v)}><Pencil className="size-3.5" /></Button>
                                    <Button variant="ghost" size="icon" className="size-7" onClick={() => remove(v)}><Trash2 className="size-3.5 text-destructive" /></Button>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
                {list.length === 0 && <p className="col-span-full py-10 text-center text-sm text-muted-foreground">暂无视频</p>}
            </div>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent>
                    <DialogHeader><DialogTitle>{editing ? '编辑视频' : '新增视频'}</DialogTitle></DialogHeader>
                    <div className="flex flex-col gap-3">
                        <Input placeholder="标题 *" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                        <Input placeholder="缩略图 URL" value={form.thumbnail} onChange={(e) => setForm({ ...form, thumbnail: e.target.value })} />
                        <div className="grid grid-cols-2 gap-3">
                            <Input placeholder="BV 号" value={form.bvid} onChange={(e) => setForm({ ...form, bvid: e.target.value })} />
                            <Input placeholder="时长 (如 01:31)" value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <Input placeholder="分类" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
                            <Input type="number" placeholder="播放量" value={form.views} onChange={(e) => setForm({ ...form, views: e.target.value })} />
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
