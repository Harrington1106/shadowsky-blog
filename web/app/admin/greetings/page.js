'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Hand } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { apiGet } from '@/lib/adminApi';
import AdminHeader from '@/components/admin/AdminHeader';
import AdminPage from '@/components/admin/AdminPage';
import { TableSkeleton } from '@/components/admin/AdminSkeleton';

export default function GreetingsAdmin() {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        apiGet('/api/greetings')
            .then(setItems)
            .catch((e) => toast.error(e.message))
            .finally(() => setLoading(false));
    }, []);

    return (
        <AdminPage width="3xl">
            <AdminHeader title="打招呼记录" count={items.length} />
            <p className="mt-3 text-xs text-muted-foreground">关于页访客点击「打招呼」的记录(最多保留最近 50 条)。</p>

            <Card className="mt-6 overflow-hidden py-0">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>时间</TableHead>
                            <TableHead>IP</TableHead>
                            {/* UA 是最长的一列,窄屏留着它整张表必横滚 —— 收起来,时间和 IP 才看得全 */}
                            <TableHead className="hidden sm:table-cell">User-Agent</TableHead>
                        </TableRow>
                    </TableHeader>
                    {loading ? <TableSkeleton rows={6} cols={3} /> : (
                        <TableBody>
                            {items.map((g) => (
                                <TableRow key={g.id}>
                                    <TableCell className="whitespace-nowrap text-muted-foreground">{g.time ? new Date(g.time).toLocaleString('zh-CN') : '—'}</TableCell>
                                    <TableCell className="whitespace-nowrap font-mono text-xs">{g.ip || '—'}</TableCell>
                                    <TableCell className="hidden max-w-md truncate text-xs text-muted-foreground sm:table-cell" title={g.ua}>{g.ua || '—'}</TableCell>
                                </TableRow>
                            ))}
                            {items.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={3} className="py-12 text-center text-muted-foreground">
                                        <Hand className="mx-auto mb-2 size-6 opacity-40" />还没有人打招呼
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    )}
                </Table>
            </Card>
        </AdminPage>
    );
}
