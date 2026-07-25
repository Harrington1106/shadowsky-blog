'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, ExternalLink, Wand2, Languages } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { apiGet, apiCreate, apiUpdate, apiDelete } from '@/lib/adminApi';
import { aiGuessTitleDesc, aiTranslate, hasAiKey } from '@/lib/aiClient';
import AdminHeader from '@/components/admin/AdminHeader';

const EMPTY = { url: '', title: '', category: '', subcategory: '', tags: '', description: '' };

export default function BookmarksAdmin() {
    const [items, setItems] = useState([]);
    const [open, setOpen] = useState(false);
    const [form, setForm] = useState(EMPTY);
    const [editing, setEditing] = useState(null);
    const [saving, setSaving] = useState(false);
    const [fetching, setFetching] = useState(false);
    const [translating, setTranslating] = useState(false);

    async function load() {
        try { setItems((await apiGet('/api/bookmarks')).bookmarks); }
        catch (e) { toast.error(e.message); }
    }
    useEffect(() => { load(); }, []);

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
        if (!confirm(`删除「${b.title}」?`)) return;
        try { await apiDelete(`/api/bookmarks?id=${encodeURIComponent(b.id)}`); toast.success('已删除'); load(); }
        catch (e) { toast.error(e.message); }
    }

    return (
        <div className="mx-auto max-w-5xl px-8 py-10">
            <AdminHeader title="收藏管理" count={items.length} action={<Button size="sm" onClick={openNew}><Plus className="size-4" /> 新增</Button>} />

            <div className="mt-6 overflow-x-auto rounded-lg border">
                <table className="w-full text-sm">
                    <thead className="bg-muted/50 text-xs text-muted-foreground">
                        <tr>
                            <th className="px-4 py-2.5 text-left font-medium">标题</th>
                            <th className="px-4 py-2.5 text-left font-medium">分类</th>
                            <th className="px-4 py-2.5 text-left font-medium">标签</th>
                            <th className="px-4 py-2.5 text-right font-medium">操作</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((b) => (
                            <tr key={b.id} className="border-t">
                                <td className="max-w-xs px-4 py-2.5">
                                    <div className="truncate font-medium">{b.title}</div>
                                    <a href={b.url} target="_blank" rel="noreferrer" className="flex items-center gap-1 truncate text-xs text-muted-foreground hover:text-primary">
                                        <ExternalLink className="size-3 shrink-0" />{b.url}
                                    </a>
                                </td>
                                <td className="px-4 py-2.5 text-muted-foreground">{b.category || '—'}{b.subcategory ? ` / ${b.subcategory}` : ''}</td>
                                <td className="px-4 py-2.5">
                                    <div className="flex flex-wrap gap-1">
                                        {(b.tags || []).slice(0, 3).map((t) => <Badge key={t} variant="outline" className="text-[0.65rem]">{t}</Badge>)}
                                    </div>
                                </td>
                                <td className="px-4 py-2.5">
                                    <div className="flex justify-end gap-1">
                                        <Button variant="ghost" size="icon" onClick={() => openEdit(b)}><Pencil className="size-4" /></Button>
                                        <Button variant="ghost" size="icon" onClick={() => remove(b)}><Trash2 className="size-4 text-destructive" /></Button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {items.length === 0 && <tr><td colSpan={4} className="px-4 py-10 text-center text-muted-foreground">暂无收藏</td></tr>}
                    </tbody>
                </table>
            </div>

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
                        <div className="grid grid-cols-2 gap-3">
                            <Input placeholder="分类 slug" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
                            <Input placeholder="子分类 slug" value={form.subcategory} onChange={(e) => setForm({ ...form, subcategory: e.target.value })} />
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
        </div>
    );
}
