import { NextResponse } from 'next/server';
import { SESSION_COOKIE, verifySession } from '@/lib/auth';

/**
 * 守卫 /admin/*(登录页除外):无有效会话 → 跳登录页。
 * 中间件跑在 edge,仅用 jose 校验 JWT,不碰 better-sqlite3。
 */
export async function middleware(request) {
    const { pathname } = request.nextUrl;
    if (pathname === '/admin/login') return NextResponse.next();

    const token = request.cookies.get(SESSION_COOKIE)?.value;
    const payload = await verifySession(token);
    if (!payload) {
        const url = request.nextUrl.clone();
        url.pathname = '/admin/login';
        url.searchParams.set('from', pathname);
        return NextResponse.redirect(url);
    }
    return NextResponse.next();
}

export const config = {
    matcher: ['/admin/:path*'],
};
