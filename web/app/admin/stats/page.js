'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Eye, Ban, ShieldOff, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { apiGet, apiCreate } from '@/lib/adminApi';
import AdminHeader from '@/components/admin/AdminHeader';

export default function StatsAdmin() {
    const [stats, setStats] = useState({ total: 0, pages: {} });
    const [excluded, setExcluded] = useState([]);
    const [blocked, setBlocked] = useState([]);
    const [newExcluded, setNewExcluded] = useState('');
    const [newBlocked, setNewBlocked] = useState('');

    async function loadAll() {
        try {
            const [s, e, b] = await Promise.all([apiGet('/api/stats'), apiGet('/api/excluded-ips'), apiGet('/api/blocked-ips')]);
            setStats(s); setExcluded(e); setBlocked(b);
        } catch (err) { toast.error(err.message); }
    }
    useEffect(() => { loadAll(); }, []);

    // 排除 IP:整体替换
    async function saveExcluded(list) {
        try { await apiCreate('/api/excluded-ips', { ips: list }); setExcluded(list); }
        catch (e) { toast.error(e.message); }
    }
    function addExcluded() {
        const ip = newExcluded.trim();
        if (!ip || excluded.includes(ip)) return;
        saveExcluded([...excluded, ip]); setNewExcluded('');
    }
    function removeExcluded(ip) { saveExcluded(excluded.filter((x) => x !== ip)); }

    // 黑名单:逐条 add/remove
    async function blockIp(ip, action) {
        try {
            const res = await apiCreate('/api/blocked-ips', { ip, action });
            setBlocked(res.blocked || []);
        } catch (e) { toast.error(e.message); }
    }
    function addBlocked() {
        const ip = newBlocked.trim();
        if (!ip) return;
        blockIp(ip, 'add'); setNewBlocked('');
    }

    const pageEntries = Object.entries(stats.pages || {}).sort((a, b) => b[1] - a[1]);
    const maxCount = pageEntries[0]?.[1] || 1;

    return (
        <div className="mx-auto max-w-3xl px-8 py-10">
            <AdminHeader title="访问统计" />

            <section className="mt-6">
                <div className="mb-4 flex items-center gap-2 rounded-lg border bg-card p-4">
                    <Eye className="size-5 text-muted-foreground" />
                    <div>
                        <div className="text-2xl font-bold tabular-nums">{stats.total ?? 0}</div>
                        <div className="text-xs text-muted-foreground">总访问量</div>
                    </div>
                </div>
                <h2 className="mb-2 text-sm font-semibold">分页面访问</h2>
                <div className="flex flex-col gap-1.5">
                    {pageEntries.map(([page, count]) => (
                        <div key={page} className="flex items-center gap-3">
                            <span className="w-24 shrink-0 truncate text-xs text-muted-foreground">{page}</span>
                            <div className="h-5 flex-1 overflow-hidden rounded bg-muted">
                                <div className="flex h-full items-center justify-end bg-primary/70 px-2 text-[0.6rem] text-primary-foreground" style={{ width: `${Math.max(8, (count / maxCount) * 100)}%` }}>
                                    {count}
                                </div>
                            </div>
                        </div>
                    ))}
                    {pageEntries.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">暂无访问数据</p>}
                </div>
            </section>

            <section className="mt-8">
                <h2 className="mb-2 flex items-center gap-1.5 text-sm font-semibold"><ShieldOff className="size-4" /> 统计排除 IP</h2>
                <p className="mb-3 text-xs text-muted-foreground">这些 IP 的访问不计入统计(比如你自己)。</p>
                <div className="mb-3 flex gap-2">
                    <Input placeholder="IPv4 / IPv6" value={newExcluded} onChange={(e) => setNewExcluded(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addExcluded()} />
                    <Button onClick={addExcluded}><Plus className="size-4" /> 添加</Button>
                </div>
                <div className="flex flex-wrap gap-2">
                    {excluded.map((ip) => (
                        <span key={ip} className="inline-flex items-center gap-1.5 rounded-md border bg-muted/50 px-2.5 py-1 font-mono text-xs">
                            {ip}
                            <button onClick={() => removeExcluded(ip)} className="text-muted-foreground hover:text-destructive"><X className="size-3.5" /></button>
                        </span>
                    ))}
                    {excluded.length === 0 && <span className="text-xs text-muted-foreground">无</span>}
                </div>
            </section>

            <section className="mt-8">
                <h2 className="mb-2 flex items-center gap-1.5 text-sm font-semibold"><Ban className="size-4 text-destructive" /> IP 黑名单</h2>
                <p className="mb-3 text-xs text-muted-foreground">这些 IP 将被全站封禁(403)。</p>
                <div className="mb-3 flex gap-2">
                    <Input placeholder="IPv4 / IPv6" value={newBlocked} onChange={(e) => setNewBlocked(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addBlocked()} />
                    <Button variant="destructive" onClick={addBlocked}><Ban className="size-4" /> 封禁</Button>
                </div>
                <div className="flex flex-wrap gap-2">
                    {blocked.map((ip) => (
                        <span key={ip} className="inline-flex items-center gap-1.5 rounded-md border border-destructive/40 bg-destructive/5 px-2.5 py-1 font-mono text-xs">
                            {ip}
                            <button onClick={() => blockIp(ip, 'remove')} className="text-muted-foreground hover:text-destructive"><X className="size-3.5" /></button>
                        </span>
                    ))}
                    {blocked.length === 0 && <span className="text-xs text-muted-foreground">无</span>}
                </div>
            </section>
        </div>
    );
}
