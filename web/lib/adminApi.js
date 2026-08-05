/**
 * 后台鉴权请求助手 —— 同源 fetch 自动带 cookie。
 * 出错抛异常(供页面 toast)。
 */
async function mutate(url, method, body) {
    const res = await fetch(url, {
        method,
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
        body: body ? JSON.stringify(body) : undefined,
    });
    if (res.status === 401) {
        bounceToLogin();
        throw new Error('会话已失效,请重新登录');
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error || `请求失败 (${res.status})`);
    return data;
}

/** 会话失效 → 回登录页,带上 from 与 expired,让登录页说清楚为什么被踢回来 */
function bounceToLogin() {
    if (typeof window === 'undefined') return;
    const from = encodeURIComponent(window.location.pathname);
    window.location.href = `/admin/login?from=${from}&expired=1`;
}

export const apiCreate = (url, body) => mutate(url, 'POST', body);
export const apiUpdate = (url, body) => mutate(url, 'PUT', body);
export const apiDelete = (url) => mutate(url, 'DELETE');

export async function apiGet(url) {
    const res = await fetch(url);
    // 读接口原来只抛「加载失败 (401)」,页面上是一句看不懂的报错,人还留在后台页里
    if (res.status === 401) {
        bounceToLogin();
        throw new Error('会话已失效,请重新登录');
    }
    if (!res.ok) throw new Error(`加载失败 (${res.status})`);
    return res.json();
}
