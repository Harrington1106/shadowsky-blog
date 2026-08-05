import { NextResponse } from 'next/server';
import { SESSION_COOKIE, verifySession } from '@/lib/auth';

/**
 * 守卫 /admin/*:
 *   已登录访问 /admin/login → 跳回后台(或 ?from 指定的页)
 *   未登录访问其余 /admin/* → 跳登录页,带上 from;若本来带着无效 cookie,再带 expired=1 让前端提示
 * 中间件跑在 edge,仅用 jose 校验 JWT,不碰 better-sqlite3。
 */
export async function middleware(request) {
    const { pathname } = request.nextUrl;
    const token = request.cookies.get(SESSION_COOKIE)?.value;
    const payload = await verifySession(token);

    if (pathname === '/admin/login') {
        if (!payload) return NextResponse.next();
        // 已经登录了就别再看登录页。from 只接受站内绝对路径,避免开放重定向
        const from = request.nextUrl.searchParams.get('from');
        const url = request.nextUrl.clone();
        url.pathname = from && from.startsWith('/') && !from.startsWith('//') ? from : '/admin';
        url.search = '';
        return NextResponse.redirect(url);
    }

    if (!payload) {
        const url = request.nextUrl.clone();
        url.pathname = '/admin/login';
        url.search = '';
        url.searchParams.set('from', pathname);
        // 有 cookie 却验不过 = 过期或密钥换过,给用户一句解释,而不是莫名其妙被踢回来
        if (token) url.searchParams.set('expired', '1');
        return NextResponse.redirect(url);
    }
    return NextResponse.next();
}

export const config = {
    matcher: ['/admin/:path*'],
};
