'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { apiGet, apiCreate } from '@/lib/adminApi';
import { getAiSettings, setAiSettings } from '@/lib/aiClient';
import AdminHeader from '@/components/admin/AdminHeader';
import AdminPage from '@/components/admin/AdminPage';
import ChangePassword from '@/components/admin/ChangePassword';
import MailRecovery from '@/components/admin/MailRecovery';

export default function SettingsAdmin() {
    const [form, setForm] = useState({ bangumi_username: '', bangumi_token: '' });
    const [ai, setAi] = useState({ apiKey: '', baseUrl: '', model: '' });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        apiGet('/api/settings').then((s) => {
            setForm({ bangumi_username: s.bangumi_username || '', bangumi_token: s.bangumi_token || '' });
        }).catch((e) => toast.error(e.message)).finally(() => setLoading(false));
        const a = getAiSettings();
        setAi({ apiKey: a.apiKey || '', baseUrl: a.baseUrl || '', model: a.model || '' });
    }, []);

    async function save() {
        setSaving(true);
        try { await apiCreate('/api/settings', form); toast.success('设置已保存'); }
        catch (e) { toast.error(e.message); } finally { setSaving(false); }
    }

    function saveAi() {
        setAiSettings(ai);
        toast.success('AI 设置已保存(存于本浏览器)');
    }

    return (
        <AdminPage width="2xl">
            <AdminHeader title="站点设置" />
            <div className="mt-6 flex flex-col gap-5">
                <Card className="p-5">
                    <h2 className="text-sm font-semibold">Bangumi 同步</h2>
                    <p className="mt-1 text-xs text-muted-foreground">用于追番/追漫同步任务(bangumi-sync)。token 保存在数据库,不进 git。</p>
                    <div className="mt-4 flex flex-col gap-3">
                        <div>
                            <Label htmlFor="bgm-user" className="mb-1 text-xs text-muted-foreground">用户名</Label>
                            <Input id="bgm-user" value={form.bangumi_username} disabled={loading} onChange={(e) => setForm({ ...form, bangumi_username: e.target.value })} placeholder="Bangumi 用户名" />
                        </div>
                        <div>
                            <Label htmlFor="bgm-token" className="mb-1 text-xs text-muted-foreground">Access Token</Label>
                            <Input id="bgm-token" type="password" value={form.bangumi_token} disabled={loading} onChange={(e) => setForm({ ...form, bangumi_token: e.target.value })} placeholder="Bangumi API Token" />
                        </div>
                        {/* 保存按钮原来放在卡片外面,看起来像「保存整页」,其实只写 Bangumi 这两项 —— 收进卡片里 */}
                        <div><Button onClick={save} disabled={saving || loading}>{saving ? '保存中…' : '保存 Bangumi 设置'}</Button></div>
                    </div>
                </Card>

                <Card className="p-5">
                    <h2 className="text-sm font-semibold">AI 翻译 / 推测</h2>
                    <p className="mt-1 text-xs text-muted-foreground">用于书签「自动获取/翻译简介」等。DeepSeek/OpenAI 兼容接口,密钥只存在本浏览器(localStorage),不上传服务器。</p>
                    <div className="mt-4 flex flex-col gap-3">
                        <div>
                            <Label htmlFor="ai-key" className="mb-1 text-xs text-muted-foreground">API Key</Label>
                            <Input id="ai-key" type="password" value={ai.apiKey} onChange={(e) => setAi({ ...ai, apiKey: e.target.value })} placeholder="sk-..." />
                        </div>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <div>
                                <Label htmlFor="ai-base" className="mb-1 text-xs text-muted-foreground">Base URL</Label>
                                <Input id="ai-base" value={ai.baseUrl} onChange={(e) => setAi({ ...ai, baseUrl: e.target.value })} placeholder="https://api.deepseek.com/v1" />
                            </div>
                            <div>
                                <Label htmlFor="ai-model" className="mb-1 text-xs text-muted-foreground">模型</Label>
                                <Input id="ai-model" value={ai.model} onChange={(e) => setAi({ ...ai, model: e.target.value })} placeholder="deepseek-chat" />
                            </div>
                        </div>
                        <div><Button variant="outline" onClick={saveAi}>保存 AI 设置</Button></div>
                    </div>
                </Card>

                <ChangePassword />
                <MailRecovery />
            </div>
        </AdminPage>
    );
}
