'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Plus, Trash2, Save, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { apiGet, apiUpdate } from '@/lib/adminApi';
import AdminHeader from '@/components/admin/AdminHeader';
import AdminPage from '@/components/admin/AdminPage';
import { ListSkeleton } from '@/components/admin/AdminSkeleton';

export default function SocialAdmin() {
    const [list, setList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        apiGet('/api/social')
            .then(setList)
            .catch((e) => toast.error(e.message))
            .finally(() => setLoading(false));
    }, []);

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
        <AdminPage width="2xl">
            <AdminHeader title="社交链接" count={list.length} action={<Button size="sm" onClick={add}><Plus className="size-4" /> 添加</Button>} />
            <p className="mt-3 text-xs text-muted-foreground">
                显示在关于页。icon 用 lucide 名(如 github/twitter/mail)或 simple 图标名。
                新域名要跑一次 <code className="font-mono">node scripts/mirror-icons.mjs</code> 才有本地图标,否则显示首字母块。
            </p>

            <div className="mt-6 flex flex-col gap-2">
                {loading ? <ListSkeleton rows={4} thumb={false} /> : list.map((s, i) => (
                    // 三个输入框横排只在 sm 以上成立 —— 375px 上「名称 28 + URL + 图标 28」
                    // 挤到每格看不见两个字。窄屏改成竖排,URL 单独占一行。
                    <Card key={i} className="flex-row items-start gap-2 p-2.5 sm:items-center">
                        <GripVertical className="mt-2.5 size-4 shrink-0 text-muted-foreground/50 sm:mt-0" />
                        <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center">
                            <Input placeholder="名称" value={s.name} onChange={(e) => update(i, 'name', e.target.value)} className="sm:w-28 sm:shrink-0" />
                            <Input placeholder="URL" value={s.url} onChange={(e) => update(i, 'url', e.target.value)} className="sm:flex-1" />
                            <Input placeholder="图标" value={s.icon || ''} onChange={(e) => update(i, 'icon', e.target.value)} className="sm:w-28 sm:shrink-0" />
                        </div>
                        <Button variant="ghost" size="icon" aria-label="删除" onClick={() => remove(i)}><Trash2 className="size-4 text-destructive" /></Button>
                    </Card>
                ))}
                {!loading && list.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">暂无社交链接</p>}
            </div>

            <div className="mt-5">
                <Button onClick={save} disabled={saving || loading}><Save className="size-4" /> {saving ? '保存中…' : '保存全部'}</Button>
            </div>
        </AdminPage>
    );
}
