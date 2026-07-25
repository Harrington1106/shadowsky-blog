'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

function LoginForm() {
    const router = useRouter();
    const params = useSearchParams();
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    async function onSubmit(e) {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password }),
            });
            if (res.ok) {
                router.replace(params.get('from') || '/admin');
                router.refresh();
            } else {
                const d = await res.json().catch(() => ({}));
                setError(d.error || '登录失败');
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
                <Input
                    type="password"
                    placeholder="管理员口令"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoFocus
                    className="mb-3"
                />
                {error && <p className="mb-3 text-sm text-destructive">{error}</p>}
                <Button type="submit" className="w-full" disabled={loading || !password}>
                    {loading ? '登录中…' : '登录'}
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
