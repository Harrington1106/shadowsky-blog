'use client';

import { useEffect, useRef, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Lock, Eye, EyeOff, TriangleAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { JUST_LOGGED_IN_KEY } from '@/lib/adminSession';

/**
 * 只接受站内绝对路径,挡住 //evil.com 这种协议相对地址(开放重定向)。
 * middleware 也做了同样的校验 —— 两边都是外部可控输入,各自把关。
 */
function safeFrom(from) {
    return from && from.startsWith('/') && !from.startsWith('//') ? from : '/admin';
}

function LoginForm() {
    const router = useRouter();
    const params = useSearchParams();
    const [password, setPassword] = useState('');
    const [show, setShow] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    // 被限流时锁到什么时候(时间戳),用于按钮上的倒计时
    const [lockUntil, setLockUntil] = useState(0);
    const [now, setNow] = useState(() => Date.now());
    const inputRef = useRef(null);

    // 被 middleware 踢回来时的说明:带过 cookie 但验不过 = 会话过期
    const expired = params.get('expired') === '1';

    // 锁定期间每秒重算一次剩余时间;没锁就不开定时器
    useEffect(() => {
        if (!lockUntil) return;
        const t = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(t);
    }, [lockUntil]);

    const remain = lockUntil ? Math.max(0, Math.ceil((lockUntil - now) / 1000)) : 0;
    const locked = remain > 0;

    // 锁定结束后自动把焦点还给输入框,不用用户自己点
    useEffect(() => {
        if (lockUntil && !locked) {
            setLockUntil(0);
            setError('');
            inputRef.current?.focus();
        }
    }, [locked, lockUntil]);

    async function onSubmit(e) {
        e.preventDefault();
        if (locked) return;
        setError('');
        setLoading(true);
        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password }),
            });
            const d = await res.json().catch(() => ({}));
            if (res.ok) {
                // 进入后台后由 AdminShell 弹一次「欢迎回来」,只在本标签页有效
                try { sessionStorage.setItem(JUST_LOGGED_IN_KEY, '1'); } catch { /* 隐私模式下忽略 */ }
                router.replace(safeFrom(params.get('from')));
                router.refresh();
                return; // 跳转中,别把 loading 关掉造成按钮闪一下
            }
            setError(d.error || '登录失败');
            setPassword('');
            if (res.status === 429 && d.retryAfter > 0) {
                setNow(Date.now());
                setLockUntil(Date.now() + d.retryAfter * 1000);
            }
        } catch {
            setError('网络错误');
        } finally {
            setLoading(false);
        }
    }

    return (
        <main className="flex min-h-screen items-center justify-center px-4">
            <form onSubmit={onSubmit} className="w-full max-w-sm rounded-xl border bg-card p-8 shadow-sm">
                <div className="mb-6 flex flex-col items-center gap-2 text-center">
                    <div className="flex size-11 items-center justify-center rounded-full bg-accent">
                        <Lock className="size-5 text-accent-foreground" />
                    </div>
                    <h1 className="text-lg font-semibold">管理后台登录</h1>
                    <p className="text-xs text-muted-foreground">夏日科技探索 · ShadowQuake</p>
                </div>

                {expired && !error && (
                    <p className="mb-3 flex items-start gap-2 rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
                        <TriangleAlert className="mt-px size-3.5 shrink-0" />
                        登录已过期,请重新登录。
                    </p>
                )}

                <div className="relative mb-3">
                    <Input
                        ref={inputRef}
                        type={show ? 'text' : 'password'}
                        name="password"
                        autoComplete="current-password"
                        placeholder="管理员口令"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={locked}
                        autoFocus
                        className="pr-10"
                    />
                    <button
                        type="button"
                        onClick={() => setShow((v) => !v)}
                        aria-label={show ? '隐藏口令' : '显示口令'}
                        className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
                    >
                        {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                </div>

                {error && <p className="mb-3 text-sm text-destructive">{error}</p>}

                <Button type="submit" className="w-full" disabled={loading || locked || !password}>
                    {locked ? `请等待 ${remain} 秒` : loading ? '登录中…' : '登录'}
                </Button>
            </form>
        </main>
    );
}

export default function AdminLoginPage() {
    return (
        <Suspense fallback={null}>
            <LoginForm />
        </Suspense>
    );
}
