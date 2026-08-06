'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Eye, Ban, ShieldOff, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { apiGet, apiCreate } from '@/lib/adminApi';
import AdminHeader from '@/components/admin/AdminHeader';
import AdminPage from '@/components/admin/AdminPage';

export default function StatsAdmin() {
    const [stats, setStats] = useState({ total: 0, pages: {} });
    const [excluded, setExcluded] = useState([]);
    const [blocked, setBlocked] = useState([]);
    const [loading, setLoading] = useState(true);
    const [newExcluded, setNewExcluded] = useState('');
    const [newBlocked, setNewBlocked] = useState('');

    async function loadAll() {
        try {
            const [s, e, b] = await Promise.all([apiGet('/api/stats'), apiGet('/api/excluded-ips'), apiGet('/api/blocked-ips')]);
            setStats(s); setExcluded(e); setBlocked(b);
        } catch (err) { toast.error(err.message); }
        finally { setLoading(false); }
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
        <AdminPage width="3xl">
            <AdminHeader title="访问统计" />

            <section className="mt-6">
                <Card className="mb-4 flex-row items-center gap-2 p-4">
                    <Eye className="size-5 text-muted-foreground" />
                    <div>
                        {loading
                            ? <Skeleton className="h-8 w-20" />
                            : <div className="text-2xl font-bold tabular-nums">{stats.total ?? 0}</div>}
                        <div className="text-xs text-muted-foreground">总访问量</div>
                    </div>
                </Card>
                <h2 className="mb-2 text-sm font-semibold">分页面访问</h2>
                <div className="flex flex-col gap-1.5">
                    {loading
                        ? Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-5 w-full" />)
                        : pageEntries.map(([page, count]) => (
                            <div key={page} className="flex items-center gap-3">
                                <span className="w-20 shrink-0 truncate text-xs text-muted-foreground sm:w-32" title={page}>{page}</span>
                                <div className="h-5 flex-1 overflow-hidden rounded bg-muted">
                                    <div className="h-full bg-primary/70" style={{ width: `${Math.max(2, (count / maxCount) * 100)}%` }} />
                                </div>
                                {/* 数字原来印在色条里,短条(占比小)那格宽度不够就被裁掉 —— 挪到条外,多长都读得到 */}
                                <span className="w-12 shrink-0 text-right text-xs tabular-nums text-muted-foreground">{count}</span>
                            </div>
                        ))}
                    {!loading && pageEntries.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">暂无访问数据</p>}
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
                        <Badge key={ip} variant="outline" className="gap-1.5 py-1 pr-1 pl-2.5 font-mono">
                            {ip}
                            <Button variant="ghost" size="icon" className="size-5" aria-label={`移除 ${ip}`} onClick={() => removeExcluded(ip)}>
                                <X className="size-3.5" />
                            </Button>
                        </Badge>
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
                        <Badge key={ip} variant="destructive" className="gap-1.5 py-1 pr-1 pl-2.5 font-mono">
                            {ip}
                            <Button variant="ghost" size="icon" className="size-5" aria-label={`解封 ${ip}`} onClick={() => blockIp(ip, 'remove')}>
                                <X className="size-3.5" />
                            </Button>
                        </Badge>
                    ))}
                    {blocked.length === 0 && <span className="text-xs text-muted-foreground">无</span>}
                </div>
            </section>
        </AdminPage>
    );
}
