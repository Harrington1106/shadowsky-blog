/**
 * Bangumi API Proxy - Cloudflare Worker
 * 代理 api.bgm.tv 的请求，解决国内服务器无法直连的问题
 * 
 * 部署: Cloudflare Dashboard → Workers & Pages → Create Worker → 粘贴此文件
 * 路由: bangumi.shadowquake.top → 此 Worker
 */

export default {
  async fetch(request) {
    // 目标 API 基础地址
    const TARGET_BASE = 'https://api.bgm.tv';
    
    const url = new URL(request.url);
    // 把路径和查询参数原样转发
    const targetUrl = TARGET_BASE + url.pathname + url.search;
    
    // 转发请求头（保留 Authorization, User-Agent 等）
    const headers = new Headers(request.headers);
    // 删除可能冲突的头
    headers.delete('host');
    headers.delete('cf-connecting-ip');
    headers.delete('cf-ipcountry');
    headers.delete('cf-visitor');
    headers.delete('cf-ray');
    
    const modifiedRequest = new Request(targetUrl, {
      method: request.method,
      headers: headers,
      body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : undefined,
      redirect: 'follow',
    });
    
    try {
      const response = await fetch(modifiedRequest);
      
      // 创建响应，透传状态码和头
      const responseHeaders = new Headers(response.headers);
      responseHeaders.set('Access-Control-Allow-Origin', '*');
      responseHeaders.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      responseHeaders.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
      });
    } catch (e) {
      return new Response(JSON.stringify({ error: 'Proxy error: ' + e.message }), {
        status: 502,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }
  },
};
