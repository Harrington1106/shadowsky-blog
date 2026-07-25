'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { apiGet, apiUpdate } from '@/lib/adminApi';
import AdminHeader from '@/components/admin/AdminHeader';

const STYLES = ['info', 'success', 'warning', 'error'];

export default function NoticeAdmin() {
    const [form, setForm] = useState({ content: '', show: true, style: 'info' });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        apiGet('/api/notice').then((n) => {
            if (n && typeof n === 'object') setForm({ content: n.content || '', show: n.show !== false, style: n.style || 'info' });
        }).catch(() => {});
    }, []);

    async function save() {
        setSaving(true);
        try { await apiUpdate('/api/notice', form); toast.success('公告已保存'); }
        catch (e) { toast.error(e.message); } finally { setSaving(false); }
    }

    return (
        <div className="mx-auto max-w-2xl px-8 py-10">
            <AdminHeader title="站点公告" />
            <div className="mt-6 flex flex-col gap-4">
                <Textarea placeholder="公告内容(留空则不显示)" value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} className="min-h-24" />
                <div className="flex items-center gap-2">
                    <Switch id="notice-show" checked={form.show} onCheckedChange={(v) => setForm({ ...form, show: v })} />
                    <Label htmlFor="notice-show">在站点上显示</Label>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">样式:</span>
                    <ToggleGroup
                        variant="outline"
                        value={[form.style]}
                        onValueChange={(vals) => vals.length && setForm({ ...form, style: vals[0] })}
                    >
                        {STYLES.map((s) => <ToggleGroupItem key={s} value={s} className="text-xs">{s}</ToggleGroupItem>)}
                    </ToggleGroup>
                </div>
                <div>
                    <Button onClick={save} disabled={saving}>{saving ? '保存中…' : '保存公告'}</Button>
                </div>
            </div>
        </div>
    );
}
