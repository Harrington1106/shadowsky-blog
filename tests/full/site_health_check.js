const axios = require('axios');
const http = require('http');
const https = require('https');
const net = require('net');

const adminPort = process.env.PORT ? Number(process.env.PORT) : 3000;
const adminBase = process.env.ADMIN_BASE || `http://localhost:${adminPort}`;
const phpBase = process.env.PHP_BASE || 'https://api.shadowquake.top/api';

const httpAgent = new http.Agent({ keepAlive: true });
const httpsAgent = new https.Agent({ keepAlive: true });

const adminAxios = axios.create({ baseURL: adminBase, timeout: 12000, httpAgent, httpsAgent, validateStatus: () => true });
const phpAxios = axios.create({ baseURL: phpBase, timeout: 12000, httpAgent, httpsAgent, validateStatus: () => true });

const results = [];

function record(name, ok, detail) {
  results.push({ name, ok, detail });
  const status = ok ? 'PASS' : 'FAIL';
  console.log(`${status} ${name}${detail ? ' - ' + detail : ''}`);
}

async function isPortOpen(port) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(2000);
    socket.on('connect', () => { socket.destroy(); resolve(true); });
    socket.on('error', () => { resolve(false); });
    socket.on('timeout', () => { socket.destroy(); resolve(false); });
    socket.connect(port, '127.0.0.1');
  });
}

async function getAdminToken() {
  const envToken = process.env.ADMIN_TOKEN || '';
  if (envToken) return envToken;
  try {
    const r = await adminAxios.get('/api/debug/token');
    if (r.status === 200 && r.data && r.data.token) return r.data.token;
  } catch {}
  return '';
}

async function get(url, headers = {}) {
  try {
    const r = await adminAxios.get(url, { headers });
    return r;
  } catch (e) {
    return { status: 0, data: null, error: String(e.message || e) };
  }
}

async function post(url, data = {}, headers = {}) {
  try {
    const r = await adminAxios.post(url, data, { headers });
    return r;
  } catch (e) {
    return { status: 0, data: null, error: String(e.message || e) };
  }
}

async function put(url, data = {}, headers = {}) {
  try {
    const r = await adminAxios.put(url, data, { headers });
    return r;
  } catch (e) {
    return { status: 0, data: null, error: String(e.message || e) };
  }
}

async function del(url, headers = {}) {
  try {
    const r = await adminAxios.delete(url, { headers });
    return r;
  } catch (e) {
    return { status: 0, data: null, error: String(e.message || e) };
  }
}

async function phpGet(endpoint) {
  try {
    const r = await phpAxios.get(endpoint);
    return r;
  } catch (e) {
    return { status: 0, data: null, error: String(e.message || e) };
  }
}

function expect(cond, name, detailOk, detailFail) {
  record(name, !!cond, cond ? detailOk : detailFail);
}

async function run() {
  console.log('=== ShadowSky 全站接口与服务器健康测试 ===');

  const portOpen = await isPortOpen(adminPort);
  expect(portOpen, `Admin 端口监听 (${adminBase})`, '', '端口未打开，请先运行 npm run admin');

  const token = await getAdminToken();
  expect(!!token, '获取管理员令牌', token ? '' : '未获取到令牌');
  const authHeader = token ? { 'x-admin-token': token } : {};

  let r;

  r = await get('/admin');
  expect(r.status === 200, 'Admin 页面可访问', `HTTP ${r.status}`, `HTTP ${r.status}`);

  r = await get('/api/auth/check', authHeader);
  if (r.status === 404) {
    r = await post('/api/auth/check', {}, authHeader);
  }
  expect(r.status === 200 && r.data && r.data.success === true, 'Admin 鉴权校验', `HTTP ${r.status}`, `HTTP ${r.status}`);

  r = await get('/api/feeds');
  expect(r.status === 200 && Array.isArray(r.data), '获取 RSS 订阅列表', '', `HTTP ${r.status}`);

  r = await post('/api/feeds', [{ url: 'https://hnrss.org/frontpage' }]);
  expect(r.status === 401, '保存 RSS 无令牌应拒绝', `HTTP ${r.status}`, `HTTP ${r.status}`);

  r = await post('/api/feeds', [{ url: 'https://hnrss.org/frontpage' }], authHeader);
  expect(r.status === 200 && r.data && r.data.success, '保存 RSS 有令牌通过', '', `HTTP ${r.status}`);

  r = await get('/api/rss-proxy?url=https://hnrss.org/frontpage', { 'User-Agent': 'Mozilla/5.0', Referer: adminBase });
  expect(r.status === 200 || r.status === 403 || r.status === 502 || r.status === 0, 'RSS 代理外部源', `HTTP ${r.status}`, `HTTP ${r.status}`);

  r = await get('/api/metadata?url=https://example.com', authHeader);
  expect(r.status === 200 || r.status === 500, '网页元数据抓取', `HTTP ${r.status}`, `HTTP ${r.status}`);

  r = await get('/api/videos');
  expect(r.status === 200 && typeof r.data === 'object', '获取视频列表', '', `HTTP ${r.status}`);

  r = await get('/api/visit.php?page=test-page');
  expect(r.status === 200 && typeof r.data === 'object', '本地访问统计记录', '', `HTTP ${r.status}`);

  r = await get('/api/stats.php');
  expect(r.status === 200 && typeof r.data === 'object', '本地访问统计聚合', '', `HTTP ${r.status}`);

  r = await get('/api/categories');
  expect(r.status === 200 && typeof r.data === 'object', '获取分类', '', `HTTP ${r.status}`);

  r = await get('/api/bookmarks');
  expect(r.status === 200 && Array.isArray(r.data), '获取书签', '', `HTTP ${r.status}`);

  r = await post('/api/bookmarks', { id: 't1', url: 'https://example.com' });
  expect(r.status === 401, '保存书签无令牌应拒绝', `HTTP ${r.status}`, `HTTP ${r.status}`);

  r = await post('/api/bookmarks', { id: 't1', url: 'https://example.com' }, authHeader);
  expect(r.status === 200 && r.data && r.data.success, '保存书签有令牌通过', '', `HTTP ${r.status}`);

  r = await put('/api/bookmarks', { id: 't1', title: 'Example' }, authHeader);
  expect(r.status === 200 || r.status === 404, '更新书签存在或返回未找到', `HTTP ${r.status}`, `HTTP ${r.status}`);

  r = await del('/api/bookmarks?id=t1', authHeader);
  expect(r.status === 200 || r.status === 404, '删除书签存在或返回未找到', `HTTP ${r.status}`, `HTTP ${r.status}`);

  r = await get('/api/snapshots');
  expect(r.status === 200 && Array.isArray(r.data), '获取动态快照', '', `HTTP ${r.status}`);

  r = await post('/api/snapshots', { content: '测试', imageUrl: 'https://example.com/image.jpg' });
  expect(r.status === 401, '保存快照无令牌应拒绝', `HTTP ${r.status}`, `HTTP ${r.status}`);

  r = await post('/api/snapshots', { content: '测试', imageUrl: 'https://example.com/image.jpg' }, authHeader);
  expect(r.status === 200 && r.data && r.data.success, '保存快照有令牌通过', '', `HTTP ${r.status}`);

  r = await get('/api/settings', authHeader);
  expect(r.status === 200 && typeof r.data === 'object', '获取设置', '', `HTTP ${r.status}`);

  r = await post('/api/settings', { ping: Date.now() });
  expect(r.status === 401, '保存设置无令牌应拒绝', `HTTP ${r.status}`, `HTTP ${r.status}`);

  r = await post('/api/settings', { ping: Date.now() }, authHeader);
  expect(r.status === 200 && r.data && r.data.success, '保存设置有令牌通过', '', `HTTP ${r.status}`);

  r = await get('/api/notice');
  expect(r.status === 200 && typeof r.data === 'object', '获取公告', '', `HTTP ${r.status}`);

  r = await post('/api/notice', { content: '<script>alert(1)</script>公告', show: true }, authHeader);
  expect(r.status === 200 && r.data && r.data.success, '保存公告有令牌通过', '', `HTTP ${r.status}`);

  r = await get('/api/stats', authHeader);
  expect(r.status === 200, '获取 Node 统计', '', `HTTP ${r.status}`);

  r = await get('/api/media');
  expect(r.status === 200 && typeof r.data === 'object', '获取媒体数据', '', `HTTP ${r.status}`);

  r = await get('/api/bgm_search?q=EVA&type=anime', authHeader);
  expect(r.status === 200 || r.status === 0, 'Bangumi 搜索', `HTTP ${r.status}`, `HTTP ${r.status}`);

  r = await get('/api/bgm_subject?id=1', authHeader);
  expect(r.status === 200 || r.status === 404, 'Bangumi Subject 代理', `HTTP ${r.status}`, `HTTP ${r.status}`);

  r = await phpGet('/visit.php?page=home');
  expect(
    r.status === 200,
    '生产 API 访问统计',
    `HTTP ${r.status}`,
    `HTTP ${r.status}${r.error ? ' - ' + r.error : ''}`
  );

  r = await phpGet('/stats.php');
  expect(
    r.status === 200,
    '生产 API 访问聚合',
    `HTTP ${r.status}`,
    `HTTP ${r.status}${r.error ? ' - ' + r.error : ''}`
  );

  const pass = results.filter(x => x.ok).length;
  const fail = results.length - pass;
  console.log(`=== 结果: ${pass} 通过 / ${fail} 失败 / 共 ${results.length}`);
  process.exitCode = fail > 0 ? 1 : 0;
}

run();
