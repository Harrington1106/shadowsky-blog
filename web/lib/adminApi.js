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
        // 会话失效,回登录
        if (typeof window !== 'undefined') window.location.href = '/admin/login';
        throw new Error('会话已失效,请重新登录');
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error || `请求失败 (${res.status})`);
    return data;
}

export const apiCreate = (url, body) => mutate(url, 'POST', body);
export const apiUpdate = (url, body) => mutate(url, 'PUT', body);
export const apiDelete = (url) => mutate(url, 'DELETE');

export async function apiGet(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`加载失败 (${res.status})`);
    return res.json();
}
