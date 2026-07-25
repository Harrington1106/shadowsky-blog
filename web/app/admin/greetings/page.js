'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Hand } from 'lucide-react';
import { apiGet } from '@/lib/adminApi';
import AdminHeader from '@/components/admin/AdminHeader';

export default function GreetingsAdmin() {
    const [items, setItems] = useState([]);

    useEffect(() => { apiGet('/api/greetings').then(setItems).catch((e) => toast.error(e.message)); }, []);

    return (
        <div className="mx-auto max-w-3xl px-8 py-10">
            <AdminHeader title="打招呼记录" count={items.length} />
            <p className="mt-3 text-xs text-muted-foreground">关于页访客点击「打招呼」的记录(最多保留最近 50 条)。</p>

            <div className="mt-6 overflow-x-auto rounded-lg border">
                <table className="w-full text-sm">
                    <thead className="bg-muted/50 text-xs text-muted-foreground">
                        <tr>
                            <th className="px-4 py-2.5 text-left font-medium">时间</th>
                            <th className="px-4 py-2.5 text-left font-medium">IP</th>
                            <th className="px-4 py-2.5 text-left font-medium">User-Agent</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((g) => (
                            <tr key={g.id} className="border-t">
                                <td className="whitespace-nowrap px-4 py-2.5 text-muted-foreground">{g.time ? new Date(g.time).toLocaleString('zh-CN') : '—'}</td>
                                <td className="whitespace-nowrap px-4 py-2.5 font-mono text-xs">{g.ip || '—'}</td>
                                <td className="max-w-md truncate px-4 py-2.5 text-xs text-muted-foreground" title={g.ua}>{g.ua || '—'}</td>
                            </tr>
                        ))}
                        {items.length === 0 && (
                            <tr><td colSpan={3} className="px-4 py-12 text-center text-muted-foreground">
                                <Hand className="mx-auto mb-2 size-6 opacity-40" />还没有人打招呼
                            </td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
