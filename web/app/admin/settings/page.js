'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { apiGet, apiCreate } from '@/lib/adminApi';
import AdminHeader from '@/components/admin/AdminHeader';

export default function SettingsAdmin() {
    const [form, setForm] = useState({ bangumi_username: '', bangumi_token: '' });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        apiGet('/api/settings').then((s) => {
            setForm({ bangumi_username: s.bangumi_username || '', bangumi_token: s.bangumi_token || '' });
        }).catch((e) => toast.error(e.message));
    }, []);

    async function save() {
        setSaving(true);
        try { await apiCreate('/api/settings', form); toast.success('设置已保存'); }
        catch (e) { toast.error(e.message); } finally { setSaving(false); }
    }

    return (
        <div className="mx-auto max-w-2xl px-8 py-10">
            <AdminHeader title="站点设置" />
            <div className="mt-6 flex flex-col gap-5">
                <section className="rounded-lg border p-5">
                    <h2 className="text-sm font-semibold">Bangumi 同步</h2>
                    <p className="mt-1 text-xs text-muted-foreground">用于追番/追漫同步任务(bangumi-sync)。token 保存在数据库,不进 git。</p>
                    <div className="mt-4 flex flex-col gap-3">
                        <div>
                            <label className="mb-1 block text-xs text-muted-foreground">用户名</label>
                            <Input value={form.bangumi_username} onChange={(e) => setForm({ ...form, bangumi_username: e.target.value })} placeholder="Bangumi 用户名" />
                        </div>
                        <div>
                            <label className="mb-1 block text-xs text-muted-foreground">Access Token</label>
                            <Input type="password" value={form.bangumi_token} onChange={(e) => setForm({ ...form, bangumi_token: e.target.value })} placeholder="Bangumi API Token" />
                        </div>
                    </div>
                </section>
                <div>
                    <Button onClick={save} disabled={saving}>{saving ? '保存中…' : '保存设置'}</Button>
                </div>
            </div>
        </div>
    );
}
