'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { KeyRound, TriangleAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { apiGet, apiCreate } from '@/lib/adminApi';

const MIN_LENGTH = 8; // 与 lib/adminPassword.js 的 MIN_PASSWORD_LENGTH 保持一致

/** 修改管理员口令 —— 需要输入当前口令,改完存进数据库,即时生效不用重建容器 */
export default function ChangePassword() {
    const [custom, setCustom] = useState(null); // null=还没查到,false=仍在用 .env 的兜底口令
    // 拿邮件临时口令登录进来的会话:不要求旧口令(旧口令正是忘掉的那个)
    const [viaReset, setViaReset] = useState(false);
    const [form, setForm] = useState({ current: '', next: '', confirm: '' });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        apiGet('/api/auth/password')
            .then((d) => { setCustom(!!d.custom); setViaReset(!!d.viaReset); })
            .catch(() => setCustom(null));
    }, []);

    const mismatch = form.confirm.length > 0 && form.next !== form.confirm;
    const tooShort = form.next.length > 0 && form.next.length < MIN_LENGTH;
    const ready = (viaReset || form.current) && form.next.length >= MIN_LENGTH && form.next === form.confirm;

    async function submit(e) {
        e.preventDefault();
        if (!ready || saving) return;
        setSaving(true);
        try {
            await apiCreate('/api/auth/password', { current: form.current, next: form.next });
            setForm({ current: '', next: '', confirm: '' });
            setCustom(true);
            setViaReset(false);
            toast.success('口令已修改,下次登录请用新口令');
        } catch (err) {
            toast.error(err.message);
        } finally {
            setSaving(false);
        }
    }

    return (
        <Card className="p-5">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
                <KeyRound className="size-4" /> 管理员口令
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
                {custom === false
                    ? '当前用的还是服务器 .env 里的初始口令(一串随机 hex)。改一个记得住的吧 —— 新口令加密后存进数据库,立即生效,不用重建容器。'
                    : '口令加密后存在数据库里,修改后立即生效。忘记了可以走登录页的邮件找回,或 ssh 上服务器删掉那条记录回落到 .env 的初始口令。'}
            </p>

            {viaReset && (
                <div className="mt-3 flex gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-400">
                    <TriangleAlert className="mt-px size-4 shrink-0" />
                    <span>
                        你是用邮件里的临时口令登录的,它已经作废。
                        <strong>现在就设一个新口令</strong> —— 不设的话,这个浏览器的会话过期后就再也进不来了。
                        (这次不用填旧口令)
                    </span>
                </div>
            )}

            <form onSubmit={submit} className="mt-4 flex flex-col gap-3">
                {/* 给密码管理器一个用户名锚点,否则 Chrome 存不下这组新旧口令 */}
                <input type="text" name="username" autoComplete="username" value="admin" readOnly hidden />
                {/* 临时口令进来的会话不问旧口令 —— 问了也没有意义,那正是忘掉的东西 */}
                {!viaReset && (
                    <div>
                        <label className="mb-1 block text-xs text-muted-foreground">当前口令</label>
                        <Input
                            type="password"
                            name="current-password"
                            autoComplete="current-password"
                            value={form.current}
                            onChange={(e) => setForm({ ...form, current: e.target.value })}
                        />
                    </div>
                )}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                        <label className="mb-1 block text-xs text-muted-foreground">新口令</label>
                        <Input
                            type="password"
                            name="new-password"
                            autoComplete="new-password"
                            value={form.next}
                            onChange={(e) => setForm({ ...form, next: e.target.value })}
                            aria-invalid={tooShort || undefined}
                        />
                    </div>
                    <div>
                        <label className="mb-1 block text-xs text-muted-foreground">确认新口令</label>
                        <Input
                            type="password"
                            name="confirm-password"
                            autoComplete="new-password"
                            value={form.confirm}
                            onChange={(e) => setForm({ ...form, confirm: e.target.value })}
                            aria-invalid={mismatch || undefined}
                        />
                    </div>
                </div>
                {tooShort && <p className="text-xs text-destructive">新口令至少 {MIN_LENGTH} 位</p>}
                {mismatch && <p className="text-xs text-destructive">两次输入的新口令不一致</p>}
                <p className="text-xs text-muted-foreground">
                    会话是无状态 JWT,改口令不会踢掉其他设备上已登录的浏览器(最长 7 天后自然过期)。
                    要立刻踢掉所有设备,得换服务器 .env 的 AUTH_SECRET 并重建容器。
                </p>
                <div>
                    <Button type="submit" variant="outline" disabled={!ready || saving}>
                        {saving ? '修改中…' : '修改口令'}
                    </Button>
                </div>
            </form>
        </Card>
    );
}
