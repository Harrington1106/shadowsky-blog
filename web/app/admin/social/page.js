'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Plus, Trash2, Save, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { apiGet, apiUpdate } from '@/lib/adminApi';
import AdminHeader from '@/components/admin/AdminHeader';

export default function SocialAdmin() {
    const [list, setList] = useState([]);
    const [saving, setSaving] = useState(false);

    useEffect(() => { apiGet('/api/social').then(setList).catch((e) => toast.error(e.message)); }, []);

    function update(i, key, value) {
        setList((prev) => prev.map((s, idx) => (idx === i ? { ...s, [key]: value } : s)));
    }
    function add() { setList((prev) => [...prev, { name: '', url: '', icon: '' }]); }
    function remove(i) { setList((prev) => prev.filter((_, idx) => idx !== i)); }

    async function save() {
        setSaving(true);
        try {
            const clean = list.filter((s) => s.name && s.url);
            await apiUpdate('/api/social', clean);
            toast.success('社交链接已保存');
        } catch (e) { toast.error(e.message); } finally { setSaving(false); }
    }

    return (
        <div className="mx-auto max-w-2xl px-8 py-10">
            <AdminHeader title="社交链接" count={list.length} action={<Button size="sm" onClick={add}><Plus className="size-4" /> 添加</Button>} />
            <p className="mt-3 text-xs text-muted-foreground">显示在关于页。icon 用 lucide 名(如 github/twitter/mail)或 simple 图标名。</p>

            <div className="mt-6 flex flex-col gap-2">
                {list.map((s, i) => (
                    <div key={i} className="flex items-center gap-2 rounded-lg border p-2.5">
                        <GripVertical className="size-4 shrink-0 text-muted-foreground/50" />
                        <Input placeholder="名称" value={s.name} onChange={(e) => update(i, 'name', e.target.value)} className="w-28 shrink-0" />
                        <Input placeholder="URL" value={s.url} onChange={(e) => update(i, 'url', e.target.value)} className="flex-1" />
                        <Input placeholder="图标" value={s.icon || ''} onChange={(e) => update(i, 'icon', e.target.value)} className="w-28 shrink-0" />
                        <Button variant="ghost" size="icon" onClick={() => remove(i)}><Trash2 className="size-4 text-destructive" /></Button>
                    </div>
                ))}
                {list.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">暂无社交链接</p>}
            </div>

            <div className="mt-5">
                <Button onClick={save} disabled={saving}><Save className="size-4" /> {saving ? '保存中…' : '保存全部'}</Button>
            </div>
        </div>
    );
}
