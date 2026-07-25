'use client';

import { useCallback, useRef, useState } from 'react';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';

/**
 * 统一的确认弹窗 —— 取代原生 window.confirm，保证全站用同一套 shadcn 视觉。
 *
 * 用法：
 *   const [confirm, confirmDialog] = useConfirm();
 *   ...
 *   if (!await confirm({ title: '删除「xx」?', description: '不可恢复' })) return;
 *   ...
 *   return (<>{confirmDialog}  …页面内容… </>);
 *
 * 传字符串等价于只给 title。
 */
export function useConfirm() {
    const [options, setOptions] = useState(null);
    const resolverRef = useRef(null);

    const confirm = useCallback((opts) => new Promise((resolve) => {
        resolverRef.current = resolve;
        setOptions(typeof opts === 'string' ? { title: opts } : (opts || {}));
    }), []);

    /** 关闭并把结果交还给等待中的 Promise */
    const settle = useCallback((result) => {
        setOptions(null);
        const resolve = resolverRef.current;
        resolverRef.current = null;
        resolve?.(result);
    }, []);

    const {
        title = '确认操作?',
        description = '',
        confirmText = '确认',
        cancelText = '取消',
        destructive = true,
    } = options || {};

    const confirmDialog = (
        <AlertDialog open={!!options} onOpenChange={(open) => { if (!open) settle(false); }}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{title}</AlertDialogTitle>
                    {description ? <AlertDialogDescription>{description}</AlertDialogDescription> : null}
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => settle(false)}>{cancelText}</AlertDialogCancel>
                    <AlertDialogAction
                        variant={destructive ? 'destructive' : 'default'}
                        onClick={() => settle(true)}
                    >
                        {confirmText}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );

    return [confirm, confirmDialog];
}
