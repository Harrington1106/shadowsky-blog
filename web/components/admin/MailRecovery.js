'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Mail, MailCheck, MailX, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { apiGet, apiCreate } from '@/lib/adminApi';

/**
 * 邮件找回口令的状态与自检。
 *
 * 这块最重要的东西是那个「发送测试邮件」按钮:找回流程平时零使用,
 * 等真被锁在门外那天才发现授权码半年前就过期了,这套东西就等于没有。
 * 趁还登录着验一遍,是唯一能验证它的时机。
 */
export default function MailRecovery() {
    const [state, setState] = useState(null); // null = 还在查
    const [sending, setSending] = useState(false);

    useEffect(() => {
        apiGet('/api/auth/mail').then(setState).catch(() => setState({ configured: false }));
    }, []);

    async function test() {
        setSending(true);
        try {
            const d = await apiCreate('/api/auth/mail', {});
            toast.success(`测试邮件已发到 ${d.address}`);
        } catch (e) {
            toast.error(e.message);
        } finally {
            setSending(false);
        }
    }

    return (
        <Card className="p-5">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
                <Mail className="size-4" /> 邮件找回口令
            </h2>

            {state === null ? (
                <div className="mt-3 space-y-2">
                    <Skeleton className="h-3 w-2/3" />
                    <Skeleton className="h-8 w-28" />
                </div>
            ) : state.configured ? (
                <>
                    <p className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                        <MailCheck className="size-3.5 text-emerald-600 dark:text-emerald-500" />
                        已启用,发往 <span className="font-mono">{state.address}</span>
                        <span className="opacity-60">(经 {state.host})</span>
                    </p>
                    <p className="mt-2 text-xs text-muted-foreground">
                        登录页会出现「忘记口令」。点了会发一个 15 分钟有效、只能用一次的临时口令。
                        <strong>它不会改掉你现在的口令</strong> —— 所以别人乱点也锁不住你,最多是收到一封没用的邮件。
                        频率上限:5 分钟一封、一天 5 封。
                    </p>
                    {state.pending && (
                        <p className="mt-2 text-xs text-amber-700 dark:text-amber-400">
                            当前有一个还没用掉的临时口令,用正式口令登录一次即可让它作废。
                        </p>
                    )}
                    <div className="mt-4">
                        <Button variant="outline" size="sm" onClick={test} disabled={sending}>
                            <Send className="size-4" /> {sending ? '发送中…' : '发送测试邮件'}
                        </Button>
                    </div>
                </>
            ) : (
                <>
                    <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                        <MailX className="size-3.5" /> 未配置 —— 登录页不显示「忘记口令」,忘了只能 ssh 救援。
                    </p>
                    <p className="mt-2 text-xs text-muted-foreground">
                        要启用:在服务器 <span className="font-mono">/www/wwwroot/shadowquake-v2/.env</span> 里补上这几项后重建容器。
                        密钥不放数据库是故意的 —— 收件地址一旦能在后台改,拿到会话的人把它改成自己的邮箱就能长期进来。
                    </p>
                    <pre className="mt-2 overflow-x-auto rounded-lg border bg-muted p-3 text-[11px] leading-relaxed">{`ADMIN_EMAIL=你的邮箱@example.com
SMTP_HOST=smtp.qq.com
SMTP_PORT=465
SMTP_USER=你的QQ邮箱@qq.com
SMTP_PASS=授权码（不是邮箱登录密码）`}</pre>
                    <p className="mt-2 text-xs text-muted-foreground">
                        阿里云 ECS 封了出站 25 端口,必须用 465/587 这类认证提交端口(实测 QQ、163、Gmail 的 465/587 都通)。
                    </p>
                </>
            )}
        </Card>
    );
}
