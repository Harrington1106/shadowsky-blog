'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Hand } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { apiGet } from '@/lib/adminApi';
import AdminHeader from '@/components/admin/AdminHeader';

export default function GreetingsAdmin() {
    const [items, setItems] = useState([]);

    useEffect(() => { apiGet('/api/greetings').then(setItems).catch((e) => toast.error(e.message)); }, []);

    return (
        <div className="mx-auto max-w-3xl px-8 py-10">
            <AdminHeader title="打招呼记录" count={items.length} />
            <p className="mt-3 text-xs text-muted-foreground">关于页访客点击「打招呼」的记录(最多保留最近 50 条)。</p>

            <Card className="mt-6 overflow-hidden py-0">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>时间</TableHead>
                            <TableHead>IP</TableHead>
                            <TableHead>User-Agent</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {items.map((g) => (
                            <TableRow key={g.id}>
                                <TableCell className="whitespace-nowrap text-muted-foreground">{g.time ? new Date(g.time).toLocaleString('zh-CN') : '—'}</TableCell>
                                <TableCell className="whitespace-nowrap font-mono text-xs">{g.ip || '—'}</TableCell>
                                <TableCell className="max-w-md truncate text-xs text-muted-foreground" title={g.ua}>{g.ua || '—'}</TableCell>
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
                </Table>
            </Card>
        </div>
    );
}
