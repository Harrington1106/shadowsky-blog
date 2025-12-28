const express = require('express');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const cheerio = require('cheerio');
const dns = require('dns').promises;
const net = require('net');
const crypto = require('crypto');
const https = require('https'); // Added for ignoring SSL errors in checks
const app = express();
const port = process.env.PORT ? Number(process.env.PORT) : 3000;
const host = process.env.HOST || '127.0.0.1';

function readEnvToken() {
  const envPath = path.join(__dirname, '../.env');
  try {
    const txt = fs.readFileSync(envPath, 'utf8');
    const line = txt.split(/\r?\n/).find(l => l.trim().startsWith('ADMIN_TOKEN='));
    if (line) return line.split('=')[1].trim();
  } catch {}
  return '';
}

function writeEnvToken(token) {
  const envPath = path.join(__dirname, '../.env');
  let lines = [];
  try { lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/); } catch {}
  const idx = lines.findIndex(l => l.trim().startsWith('ADMIN_TOKEN='));
  if (idx >= 0) lines[idx] = `ADMIN_TOKEN=${token}`;
  else lines.push(`ADMIN_TOKEN=${token}`);
  fs.writeFileSync(envPath, lines.filter(Boolean).join('\n'));
}

let ADMIN_TOKEN = process.env.ADMIN_TOKEN || readEnvToken();
if (!ADMIN_TOKEN) {
  ADMIN_TOKEN = crypto.randomBytes(24).toString('hex');
  writeEnvToken(ADMIN_TOKEN);
  console.log('[Admin] Generated ADMIN_TOKEN and wrote to .env');
}
const RSS_PROXY_ALLOWED_HOSTS = (process.env.RSS_PROXY_ALLOWED_HOSTS || '').split(',').map(s => s.trim()).filter(Boolean);

// CORS Middleware for Hybrid Deployment
app.use((req, res, next) => {
    const corsEnv = process.env.CORS_ALLOWED_ORIGINS;
    const allowedOrigins = corsEnv ? corsEnv.split(',') : [
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        'http://shadowquake.top',
        'https://shadowquake.top'
    ];
    const origin = req.headers.origin;

    if (origin && allowedOrigins.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Access-Control-Allow-Credentials', 'true');
    }

    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-admin-token, x-requested-with');

    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

app.use((req, res, next) => { next(); });

app.use(express.json({ limit: '256kb' }));
app.use(express.urlencoded({ extended: true, limit: '256kb' }));

// Paths
const settingsPath = path.join(__dirname, '../public/data/settings.json');
const bookmarksPath = path.join(__dirname, '../public/data/bookmarks.json');
const categoriesPath = path.join(__dirname, '../public/data/categories.json');
const momentsPath = path.join(__dirname, '../public/data/moments.json');
const mediaPath = path.join(__dirname, '../public/data/media.json');
const feedsPath = path.join(__dirname, '../public/data/feeds.json');
const videosPath = path.join(__dirname, '../public/data/videos.json');
const statsPath = path.join(__dirname, '../public/data/visits.json');
const noticePath = path.join(__dirname, '../public/data/notice.json');
const pageVisitsPath = path.join(__dirname, '../public/data/page_visits.json');

// Ensure directories exist
[settingsPath, bookmarksPath, categoriesPath, momentsPath, mediaPath, feedsPath, videosPath, statsPath, noticePath, pageVisitsPath].forEach(p => {
    const dir = path.dirname(p);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// Alias: serve Bangumi data before static middleware
app.get('/api/bangumi.php', async (req, res) => {
  try {
    let username = '';
    let token = '';
    if (fs.existsSync(settingsPath)) {
      try {
        const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
        username = settings.bangumi_username || '';
        token = settings.bangumi_token || '';
      } catch {}
    }
    if (!username) return res.json({ error: 'Bangumi username not configured' });

    const headers = { 'User-Agent': 'ShadowSky/Admin', 'Accept': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const base = 'https://api.bgm.tv/v0';
    const get = async (url) => {
      const r = await axios.get(url, { headers, timeout: 15000, validateStatus: () => true });
      if (r.status !== 200) return null;
      return r.data;
    };

    const userProfile = await get(`${base}/users/${username}`);
    const animeWatching = await get(`${base}/users/${username}/collections?subject_type=2&type=3&limit=12`);
    const animeCompleted = await get(`${base}/users/${username}/collections?subject_type=2&type=2&limit=6`);
    const animeWish = await get(`${base}/users/${username}/collections?subject_type=2&type=1&limit=12`);
    const mangaReading = await get(`${base}/users/${username}/collections?subject_type=1&type=3&limit=12`);
    const mangaWish = await get(`${base}/users/${username}/collections?subject_type=1&type=1&limit=12`);
    const calendar = await get(`https://api.bgm.tv/calendar`);

    const result = {
      updated_at: Math.floor(Date.now() / 1000),
      user: userProfile || {},
      anime_watching: (animeWatching && animeWatching.data) ? animeWatching.data : [],
      anime_completed: (animeCompleted && animeCompleted.data) ? animeCompleted.data : [],
      anime_wish: (animeWish && animeWish.data) ? animeWish.data : [],
      manga_reading: (mangaReading && mangaReading.data) ? mangaReading.data : [],
      manga_wish: (mangaWish && mangaWish.data) ? mangaWish.data : [],
      calendar: calendar || []
    };

    res.json(result);
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch Bangumi data' });
  }
});

// JSON alias without .php to avoid static conflicts
app.get('/api/bangumi', async (req, res) => {
    // Reuse logic (simplified for brevity, in real code should refactor)
    // For now, redirect or copy logic. Copying logic to ensure it works.
    try {
        let username = '';
        let token = '';
        if (fs.existsSync(settingsPath)) {
          try {
            const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
            username = settings.bangumi_username || '';
            token = settings.bangumi_token || '';
          } catch {}
        }
        if (!username) return res.json({ error: 'Bangumi username not configured' });
    
        const headers = { 'User-Agent': 'ShadowSky/Admin', 'Accept': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;
        const base = 'https://api.bgm.tv/v0';
        const get = async (url) => {
          const r = await axios.get(url, { headers, timeout: 15000, validateStatus: () => true });
          if (r.status !== 200) return null;
          return r.data;
        };
    
        const userProfile = await get(`${base}/users/${username}`);
        const animeWatching = await get(`${base}/users/${username}/collections?subject_type=2&type=3&limit=12`);
        const animeCompleted = await get(`${base}/users/${username}/collections?subject_type=2&type=2&limit=6`);
        const animeWish = await get(`${base}/users/${username}/collections?subject_type=2&type=1&limit=12`);
        const mangaReading = await get(`${base}/users/${username}/collections?subject_type=1&type=3&limit=12`);
        const mangaWish = await get(`${base}/users/${username}/collections?subject_type=1&type=1&limit=12`);
        const calendar = await get(`https://api.bgm.tv/calendar`);
    
        const result = {
          updated_at: Math.floor(Date.now() / 1000),
          user: userProfile || {},
          anime_watching: (animeWatching && animeWatching.data) ? animeWatching.data : [],
          anime_completed: (animeCompleted && animeCompleted.data) ? animeCompleted.data : [],
          anime_wish: (animeWish && animeWish.data) ? animeWish.data : [],
          manga_reading: (mangaReading && mangaReading.data) ? mangaReading.data : [],
          manga_wish: (mangaWish && mangaWish.data) ? mangaWish.data : [],
          calendar: calendar || []
        };
    
        res.json(result);
      } catch (e) {
        res.status(500).json({ error: 'Failed to fetch Bangumi data' });
      }
});

// API to search Bangumi subjects (proxy)
app.get('/api/bgm_search', requireAdminToken, async (req, res) => {
    const q = req.query.q;
    const typeParam = req.query.type;
    if (!q) return res.status(400).json({ error: 'Missing q' });

    let subjectType = 2;
    if (String(typeParam) === '1' || String(typeParam).toLowerCase() === 'manga') subjectType = 1;
    if (String(typeParam) === '2' || String(typeParam).toLowerCase() === 'anime') subjectType = 2;

    try {
        let token = '';
        if (fs.existsSync(settingsPath)) {
             try {
                const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
                token = settings.bangumi_token || '';
             } catch {}
        }

        const headers = { 
            'User-Agent': 'ShadowSky/Admin', 
            'Accept': 'application/json' 
        };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const url = `https://api.bgm.tv/v0/search/subjects?keyword=${encodeURIComponent(q)}&type=${subjectType}&limit=12`;
        const response = await axios.get(url, { headers, timeout: 10000, validateStatus: () => true });
        
        res.status(response.status).json(response.data);
    } catch (e) {
        console.error('Bangumi Search Error:', e.message);
        res.status(500).json({ error: e.message });
    }
});

// API to get Bangumi subject details (proxy)
app.get('/api/bgm_subject', requireAdminToken, async (req, res) => {
    const id = req.query.id;
    if (!id || !/^\d+$/.test(id)) return res.status(400).json({ error: 'Invalid subject id' });

    try {
        let token = '';
        if (fs.existsSync(settingsPath)) {
             try {
                const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
                token = settings.bangumi_token || '';
             } catch {}
        }

        const headers = { 
            'User-Agent': 'ShadowSky/Admin', 
            'Accept': 'application/json' 
        };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const url = `https://api.bgm.tv/v0/subjects/${id}`;
        const response = await axios.get(url, { headers, timeout: 10000, validateStatus: () => true });
        
        res.status(response.status).json(response.data);
    } catch (e) {
        console.error('Bangumi Subject Error:', e.message);
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/categories', (req, res) => {
    if (fs.existsSync(categoriesPath)) {
        try {
            const data = fs.readFileSync(categoriesPath, 'utf8');
            res.json(JSON.parse(data));
        } catch (e) {
            console.error('Error parsing categories.json:', e);
            res.json({});
        }
    } else {
        res.json({});
    }
});

app.post('/api/categories', requireAdminToken, (req, res) => {
    try {
        const categories = req.body;
        fs.writeFileSync(categoriesPath, JSON.stringify(categories, null, 2));
        res.json({ success: true });
    } catch (e) {
        console.error('Save categories error:', e);
        res.status(500).json({ error: 'Failed to save categories' });
    }
});

function rateLimit(windowMs, max) {
  const store = new Map();
  return (req, res, next) => {
    const now = Date.now();
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const entry = store.get(ip) || { count: 0, start: now };
    if (now - entry.start > windowMs) {
      entry.count = 0;
      entry.start = now;
    }
    entry.count += 1;
    store.set(ip, entry);
    if (entry.count > max) {
      return res.status(429).send('Too Many Requests');
    }
    next();
  };
}

function requireAdminToken(req, res, next) {
  if (!ADMIN_TOKEN) return res.status(401).json({ error: 'Admin token not configured' });
  
  let token = req.headers['x-admin-token'] || req.headers['x-adminkey'] || '';
  
  // Handle case where header is an array (duplicate headers)
  if (Array.isArray(token)) {
      token = token[0] || '';
  }
  
  let match = false;
  try {
      const bufA = Buffer.from(token);
      const bufB = Buffer.from(ADMIN_TOKEN);
      
      if (bufA.length === bufB.length) {
          match = crypto.timingSafeEqual(bufA, bufB);
      }
  } catch (e) { 
      // Buffer.from might throw if token is not a string/buffer
      // or other crypto errors
      match = false; 
  }

  if (!match) return res.status(401).json({ error: 'Unauthorized' });
  next();
}

function originAllowed(req) {
  if (RSS_PROXY_ALLOWED_HOSTS.length === 0) return true;
  const ref = req.headers.referer || req.headers.origin || '';
  try {
    const u = new URL(ref);
    const h = u.hostname.toLowerCase();
    return RSS_PROXY_ALLOWED_HOSTS.some(x => x.toLowerCase() === h);
  } catch {
    return false;
  }
}

function isPrivateIp(ip) {
  const v = net.isIP(ip);
  if (v === 4) {
    if (ip.startsWith('10.') || ip.startsWith('127.') || ip.startsWith('192.168.') || ip.startsWith('169.254.')) return true;
    if (ip.startsWith('172.')) {
      const parts = ip.split('.');
      const second = parseInt(parts[1], 10);
      if (second >= 16 && second <= 31) return true;
    }
    const parts = ip.split('.');
    const a = parseInt(parts[0], 10);
    const b = parseInt(parts[1], 10);
    if (a === 100 && b >= 64 && b <= 127) return true;
    if (a === 0) return true;
    return false;
  } else if (v === 6) {
    const norm = ip.toLowerCase();
    if (norm === '::1' || norm === '::' || norm.startsWith('fe80:') || norm.startsWith('fc') || norm.startsWith('fd')) return true;
    return false;
  }
  return true;
}

async function assertPublicAddress(urlStr) {
  let host;
  try {
    host = new URL(urlStr).hostname;
  } catch {
    throw new Error('Invalid URL');
  }
  const lh = host.toLowerCase();
  if (lh === 'localhost' || lh === '127.0.0.1' || lh === '::1') throw new Error('Invalid host');
  const addrs = await dns.lookup(host, { all: true });
  for (const a of addrs) {
    if (isPrivateIp(a.address)) throw new Error('Private address blocked');
  }
}

// API to check auth token
app.post('/api/auth/check', requireAdminToken, (req, res) => {
    res.json({ success: true, message: 'Token is valid' });
});

// Middleware to track visits
app.use((req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/admin')) {
        next();
        return;
    }
    
    // Simple stats logging
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    
    try {
        let stats = {};
        if (fs.existsSync(statsPath)) {
            stats = JSON.parse(fs.readFileSync(statsPath, 'utf8'));
        }
        
        if (!stats[today]) {
            stats[today] = { visits: 0, ip_locations: {} };
        }
        
        stats[today].visits++;
        
        const ip = req.ip || req.connection.remoteAddress || 'unknown';
        stats[today].ip_locations[ip] = (stats[today].ip_locations[ip] || 0) + 1;
        
        fs.writeFile(statsPath, JSON.stringify(stats, null, 2), () => {});
    } catch (e) {
        console.error('Stats error:', e);
    }
    next();
});

// API to track visits from external pages
app.post('/api/visit', (req, res) => {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    
    try {
        // Update daily stats
        let stats = {};
        if (fs.existsSync(statsPath)) {
            stats = JSON.parse(fs.readFileSync(statsPath, 'utf8'));
        }
        
        if (!stats[today]) {
            stats[today] = { visits: 0, ip_locations: {} };
        }
        
        stats[today].visits++;
        
        const ip = req.ip || req.connection.remoteAddress || 'unknown';
        stats[today].ip_locations[ip] = (stats[today].ip_locations[ip] || 0) + 1;
        
        fs.writeFileSync(statsPath, JSON.stringify(stats, null, 2));

        // Update page visits (if URL provided)
        const pageUrl = req.body.url;
        if (pageUrl) {
            let pageStats = {};
            if (fs.existsSync(pageVisitsPath)) {
                try { pageStats = JSON.parse(fs.readFileSync(pageVisitsPath, 'utf8')); } catch {}
            }
            
            // Normalize URL to path only
            let pathName = pageUrl;
            try {
                const u = new URL(pageUrl);
                pathName = u.pathname;
            } catch {}

            if (!pageStats[pathName]) pageStats[pathName] = 0;
            pageStats[pathName]++;
            
            fs.writeFileSync(pageVisitsPath, JSON.stringify(pageStats, null, 2));
        }

        res.json({ success: true, visits: stats[today].visits });
    } catch (e) {
        console.error('Track visit error:', e);
        res.status(500).json({ error: 'Failed to track visit' });
    }
});

// API to get stats
app.get('/api/stats', requireAdminToken, (req, res) => {
    if (fs.existsSync(statsPath)) {
        try {
            const data = fs.readFileSync(statsPath, 'utf8');
            res.json(JSON.parse(data));
        } catch (e) {
            console.error('Error parsing visits.json:', e);
            res.json({});
        }
    } else {
        res.json({});
    }
});

// API to get settings
app.get('/api/settings', requireAdminToken, (req, res) => {
    if (fs.existsSync(settingsPath)) {
        try {
            const data = fs.readFileSync(settingsPath, 'utf8');
            res.json(JSON.parse(data));
        } catch (e) {
            console.error('Error parsing settings.json:', e);
            res.json({});
        }
    } else {
        res.json({});
    }
});

// API to save settings
app.post('/api/settings', requireAdminToken, (req, res) => {
    try {
        const newSettings = req.body;
        // Merge with existing
        let current = {};
        if (fs.existsSync(settingsPath)) {
            try { current = JSON.parse(fs.readFileSync(settingsPath, 'utf8')); } catch {}
        }
        const updated = { ...current, ...newSettings };
        fs.writeFileSync(settingsPath, JSON.stringify(updated, null, 2));
        res.json({ success: true });
    } catch (e) {
        console.error('Save settings error:', e);
        res.status(500).json({ error: 'Failed to save settings' });
    }
});

// API to sync Bangumi
app.get('/api/sync_bangumi', requireAdminToken, rateLimit(60_000, 10), async (req, res) => {
    // 1. Get Configuration
    let username = '';
    let token = '';

    if (fs.existsSync(settingsPath)) {
        try {
            const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
            if (settings.bangumi_username) username = settings.bangumi_username;
            if (settings.bangumi_token) token = settings.bangumi_token;
            console.log(`[Bangumi] Syncing for user: ${username}`);
        } catch (e) {
            console.error('Error reading settings.json:', e);
        }
    }

    if (!username) {
        return res.status(400).json({ error: 'Bangumi username not configured' });
    }

    // Helper Function
    const fetchBgm = async (path) => {
        const url = `https://api.bgm.tv/v0${path}`;
        const headers = {
            'User-Agent': 'ShadowSky/1.0 (Refreshed)',
            'Accept': 'application/json'
        };
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        try {
            console.log(`[Bangumi] Fetching ${url}`);
            const response = await axios.get(url, { headers, timeout: 10000 });
            return response.data;
        } catch (e) {
            console.error(`Bangumi API Error (${path}):`, e.message);
            if (e.response) {
                console.error(`[Bangumi] Response Data:`, JSON.stringify(e.response.data));
                return { error: `HTTP ${e.response.status}`, details: e.response.data };
            }
            return { error: e.message };
        }
    };

    try {
        // 2. Fetch Data
        // Define types to fetch: 1=Wish, 2=Collect, 3=Do
        const typesToFetch = [
            { id: 3, status_anime: 'watching', status_manga: 'reading' },
            { id: 1, status_anime: 'plan', status_manga: 'plan' },
            { id: 2, status_anime: 'completed', status_manga: 'completed' },
            { id: 4, status_anime: 'on_hold', status_manga: 'on_hold' },
            { id: 5, status_anime: 'dropped', status_manga: 'dropped' }
        ];

        const fetchCollection = async (subjectType, statusKey) => {
            const results = [];
            for (const t of typesToFetch) {
                const res = await fetchBgm(`/users/${username}/collections?subject_type=${subjectType}&type=${t.id}&limit=50`);
                if (res.data && Array.isArray(res.data)) {
                    // Attach the intended status to each item for later processing
                    res.data.forEach(item => item._mapped_status = t[statusKey]);
                    results.push(...res.data);
                } else if (res.error) {
                    console.error(`Error fetching type ${t.id}:`, res.error);
                }
            }
            return results;
        };

        // Anime: subject_type=2
        const animeData = await fetchCollection(2, 'status_anime');
        
        // Manga: subject_type=1
        const mangaData = await fetchCollection(1, 'status_manga');

        // 3. Transform Data
        const newMedia = {
            anime: [],
            manga: []
        };

        // Process Anime
        newMedia.anime = animeData.map(item => {
            const subject = item.subject;
            return {
                id: String(subject.id),
                title: subject.name_cn || subject.name,
                cover: (subject.images && (subject.images.large || subject.images.common)) || '',
                progress: item.ep_status,
                total: subject.eps || '?',
                status: item._mapped_status,
                tag: ''
            };
        });

        // Process Manga
        newMedia.manga = mangaData.map(item => {
            const subject = item.subject;
            return {
                id: String(subject.id),
                title: subject.name_cn || subject.name,
                cover: (subject.images && (subject.images.large || subject.images.common)) || '',
                progress: item.ep_status,
                total: subject.eps || '?',
                status: item._mapped_status,
                tag: ''
            };
        });

        fs.writeFileSync(mediaPath, JSON.stringify(newMedia, null, 2));
        
        res.json({ success: true, count: { anime: newMedia.anime.length, manga: newMedia.manga.length } });

    } catch (e) {
        console.error('Sync Bangumi Error:', e);
        res.status(500).json({ error: 'Internal Server Error during sync' });
    }
});

// API to get feeds
app.get('/api/feeds', (req, res) => {
    if (fs.existsSync(feedsPath)) {
        try {
            const data = fs.readFileSync(feedsPath, 'utf8');
            res.json(JSON.parse(data));
        } catch (e) {
            console.error('Error parsing feeds.json:', e);
            res.json([]);
        }
    } else {
        res.json([]);
    }
});

// API to save feeds
app.post('/api/feeds', requireAdminToken, rateLimit(60_000, 30), (req, res) => {
    const feeds = req.body;
    if (!Array.isArray(feeds)) {
        return res.status(400).json({ error: 'Invalid data format' });
    }
    fs.writeFileSync(feedsPath, JSON.stringify(feeds, null, 2));
    res.json({ success: true });
});

app.get('/api/rss-proxy', rateLimit(60_000, 60), async (req, res) => {
    const url = req.query.url;
    if (!url || typeof url !== 'string') {
        return res.status(400).send('Missing url');
    }
    if (!/^https?:\/\//i.test(url)) {
        return res.status(400).send('Invalid protocol');
    }
    if (!originAllowed(req)) {
        return res.status(403).send('Forbidden');
    }
    const ua = req.headers['user-agent'] || '';
    if (!ua || ua.trim().length === 0) {
        return res.status(400).send('User-Agent required');
    }
    try {
      await assertPublicAddress(url);
    } catch (err) {
      return res.status(403).send(err.message);
    }
    const lowerHost = (() => {
        try {
            const u = new URL(url);
            return u.hostname.toLowerCase();
        } catch {
            return '';
        }
    })();
    if (lowerHost === 'localhost' || lowerHost === '127.0.0.1') {
        return res.status(400).send('Invalid host');
    }
    try {
        const response = await axios.get(url, {
            responseType: 'arraybuffer', // Support binary/text/json
            timeout: 10000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (RSS Proxy)'
            },
            maxRedirects: 5,
            maxContentLength: 5 * 1024 * 1024,
        });
        
        const contentType = response.headers['content-type'] || 'application/octet-stream';
        res.setHeader('Content-Type', contentType);
        res.send(response.data);
    } catch (e) {
        res.status(502).send(typeof e.response?.data === 'string' ? e.response.data : String(e));
    }
});

// API to fetch metadata
app.get('/api/metadata', requireAdminToken, rateLimit(60_000, 30), async (req, res) => {
    const urlStr = req.query.url;
    if (!urlStr) return res.status(400).json({ error: 'URL is required' });

    console.log(`[Metadata] Fetching: ${urlStr}`);

    try {
        // Security: SSRF Protection
        await assertPublicAddress(urlStr);

        const httpsAgent = new https.Agent({ rejectUnauthorized: false });
        const response = await axios.get(urlStr, {
            timeout: 15000,
            headers: { 
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Referer': 'https://www.google.com/'
            },
            httpsAgent,
            maxContentLength: 2 * 1024 * 1024, // Limit to 2MB
            responseType: 'text' // Force text response to prevent JSON parsing issues
        });
        
        const $ = cheerio.load(response.data);
        const title = $('title').text().trim() || $('meta[property="og:title"]').attr('content') || '';
        const description = $('meta[name="description"]').attr('content') || $('meta[property="og:description"]').attr('content') || '';
        
        console.log(`[Metadata] Success: ${title.substring(0, 50)}...`);
        res.json({ title, description });
    } catch (e) {
        console.error('Error fetching metadata:', e); // Log full error object
        // Don't return 500 for expected errors like 404 or DNS issues
        if (e.response && e.response.status) {
            return res.status(e.response.status).json({ error: `Remote server error: ${e.response.status}` });
        }
        if (e.code === 'ECONNABORTED' || e.message.includes('timeout')) {
             return res.status(504).json({ error: 'Remote server timeout' });
        }
        if (e.message === 'Invalid host' || e.message === 'Private address blocked') {
             return res.status(403).json({ error: e.message });
        }
        res.status(502).json({ error: 'Metadata retrieval failed', details: e.message });
    }
});

// API to get videos
app.get('/api/videos', (req, res) => {
    if (fs.existsSync(videosPath)) {
        try {
            const data = fs.readFileSync(videosPath, 'utf8');
            res.json(JSON.parse(data));
        } catch (e) {
            console.error('Error parsing videos.json:', e);
            res.json({ videos: [] });
        }
    } else {
        res.json({ videos: [] });
    }
});

// === PUBLIC VISIT STATS API ===
app.get('/api/visit.php', (req, res) => {
    // 1. Get Page ID
    let pageId = req.query.page || 'home';
    pageId = pageId.replace(/[^a-zA-Z0-9_\-\.\/]/g, ''); // Sanitize
    if (!pageId) pageId = 'home';

    // 2. Load Stats
    let stats = { total: 0, pages: {}, daily: {} };
    if (fs.existsSync(pageVisitsPath)) {
        try {
            stats = JSON.parse(fs.readFileSync(pageVisitsPath, 'utf8'));
        } catch (e) {
            console.error('Error reading page_visits.json:', e);
        }
    }

    // 3. Initialize structure if missing
    if (!stats.total) stats.total = 0;
    if (!stats.pages) stats.pages = {};
    if (!stats.daily) stats.daily = {};

    // 4. Update Stats
    stats.total++;
    
    if (!stats.pages[pageId]) stats.pages[pageId] = 0;
    stats.pages[pageId]++;

    const today = new Date().toISOString().split('T')[0];
    if (!stats.daily[today]) stats.daily[today] = 0;
    stats.daily[today]++;

    // 5. Save (Async)
    fs.writeFile(pageVisitsPath, JSON.stringify(stats, null, 2), (err) => {
        if (err) console.error('Error saving page_visits.json:', err);
    });

    // 6. Return Response
    res.json({
        success: true,
        data: {
            page: pageId,
            count: stats.pages[pageId],
            total_site_visits: stats.total,
            mode: 'local_node'
        }
    });
});

app.get('/api/stats.php', (req, res) => {
    // Return all stats (public read-only)
    let stats = { total: 0, pages: {}, daily: {} };
    if (fs.existsSync(pageVisitsPath)) {
        try {
            stats = JSON.parse(fs.readFileSync(pageVisitsPath, 'utf8'));
        } catch (e) {}
    }
    
    // Map to expected format
    res.json({
        success: true,
        data: {
            pages: stats.pages || {},
            total: stats.total || 0,
            stats: { // Legacy support
                pages: stats.pages || {},
                total: stats.total || 0
            }
        }
    });
});

// API to save videos
app.post('/api/videos', requireAdminToken, rateLimit(60_000, 30), (req, res) => {
    const data = req.body;
    if (typeof data !== 'object' || !Array.isArray(data.videos)) {
        return res.status(400).json({ error: 'Invalid data format' });
    }
    fs.writeFileSync(videosPath, JSON.stringify(data, null, 2));
    res.json({ success: true });
});

// Proxy Bangumi subject (Admin)
app.get('/api/bgm_subject', requireAdminToken, async (req, res) => {
    try {
        const id = String(req.query.id || '').trim();
        if (!id || !/^\d+$/.test(id)) return res.status(400).json({ error: 'Invalid subject id' });
        let token = '';
        if (fs.existsSync(settingsPath)) {
            try {
                const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
                token = settings.bangumi_token || '';
            } catch (e) {}
        }
        const url = `https://api.bgm.tv/v0/subjects/${id}`;
        const headers = { 'User-Agent': 'ShadowSky/Admin', 'Accept': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;
        const resp = await fetch(url, { headers });
        const text = await resp.text();
        if (!resp.ok) return res.status(resp.status).send(text);
        try {
            return res.json(JSON.parse(text));
        } catch {
            return res.send(text);
        }
    } catch (e) {
        console.error('bgm_subject proxy error:', e);
        res.status(500).json({ error: 'Proxy failed' });
    }
});

// Get bookmarks (with auto-ID migration)
app.get('/api/bookmarks', (req, res) => {
  if (fs.existsSync(bookmarksPath)) {
    try {
        let data = JSON.parse(fs.readFileSync(bookmarksPath, 'utf8'));
        if (!Array.isArray(data)) data = [];
        
        // Migration: Ensure IDs
        let changed = false;
        data.forEach(item => {
            if (!item.id) {
                item.id = crypto.randomUUID ? crypto.randomUUID() : Date.now().toString() + Math.random().toString(36).substring(2);
                changed = true;
            }
        });
        
        if (changed) {
            fs.writeFileSync(bookmarksPath, JSON.stringify(data, null, 2));
        }

        res.json(data);
    } catch (e) {
        console.error('Error parsing bookmarks.json:', e);
        res.json([]);
    }
  } else {
    res.json([]);
  }
});

// API to save bookmarks (POST: Create or Bulk Replace)
app.post('/api/bookmarks', requireAdminToken, rateLimit(60_000, 30), (req, res) => {
  const payload = req.body;
  
  // Case 1: Overwrite with full list (Array)
  if (Array.isArray(payload)) {
      try {
          // Ensure IDs in bulk upload
          payload.forEach(item => {
              if (!item.id) item.id = crypto.randomUUID ? crypto.randomUUID() : Date.now().toString() + Math.random().toString(36).substring(2);
          });
          fs.writeFileSync(bookmarksPath, JSON.stringify(payload, null, 2));
          return res.json({ success: true, count: payload.length });
      } catch (e) {
          console.error('Error writing bookmarks:', e);
          return res.status(500).json({ error: 'Failed to save bookmarks' });
      }
  }

  // Case 2: Append single item (Object)
  if (typeof payload === 'object' && payload !== null) {
      let bookmarks = [];
      if (fs.existsSync(bookmarksPath)) {
          try {
              bookmarks = JSON.parse(fs.readFileSync(bookmarksPath, 'utf8'));
              if (!Array.isArray(bookmarks)) bookmarks = [];
          } catch (e) {
              console.error('Error reading bookmarks for append:', e);
              bookmarks = [];
          }
      }
      
      // Ensure ID
      if (!payload.id) {
          payload.id = crypto.randomUUID ? crypto.randomUUID() : Date.now().toString() + Math.random().toString(36).substring(2);
      }
      if (!payload.addedAt) {
          payload.addedAt = new Date().toISOString();
      }

      // Prepend to top
      bookmarks.unshift(payload);
      
      try {
          fs.writeFileSync(bookmarksPath, JSON.stringify(bookmarks, null, 2));
          return res.json({ success: true, id: payload.id });
      } catch (e) {
          console.error('Error saving bookmark:', e);
          return res.status(500).json({ error: 'Failed to save bookmark' });
      }
  }
  
  res.status(400).json({ error: 'Invalid payload' });
});

// API to update a bookmark (PUT)
app.put('/api/bookmarks', requireAdminToken, rateLimit(60_000, 30), (req, res) => {
    const item = req.body;
    if (!item.id) return res.status(400).json({ error: 'Missing ID' });
    
    if (fs.existsSync(bookmarksPath)) {
        try {
            let bookmarks = JSON.parse(fs.readFileSync(bookmarksPath, 'utf8'));
            if (!Array.isArray(bookmarks)) bookmarks = [];
            
            const idx = bookmarks.findIndex(b => b.id === item.id);
            if (idx === -1) {
                return res.status(404).json({ error: 'Bookmark not found' });
            }
            
            // Update fields, preserve creation time if not provided
            bookmarks[idx] = { ...bookmarks[idx], ...item };
            
            fs.writeFileSync(bookmarksPath, JSON.stringify(bookmarks, null, 2));
            res.json({ success: true });
        } catch (e) {
            console.error('Error updating bookmark:', e);
            res.status(500).json({ error: 'Failed to update bookmark' });
        }
    } else {
        res.status(404).json({ error: 'Bookmarks file not found' });
    }
});

// API to delete a bookmark (DELETE)
app.delete('/api/bookmarks', requireAdminToken, rateLimit(60_000, 30), (req, res) => {
    const id = req.query.id;
    if (!id) return res.status(400).json({ error: 'Missing ID' });
    
    if (fs.existsSync(bookmarksPath)) {
        try {
            let bookmarks = JSON.parse(fs.readFileSync(bookmarksPath, 'utf8'));
            if (!Array.isArray(bookmarks)) bookmarks = [];
            
            const initialLen = bookmarks.length;
            bookmarks = bookmarks.filter(b => b.id !== id);
            
            if (bookmarks.length === initialLen) {
                // Try to delete by URL if ID not found (backward compatibility)
                bookmarks = bookmarks.filter(b => b.url !== id);
            }
            
            fs.writeFileSync(bookmarksPath, JSON.stringify(bookmarks, null, 2));
            res.json({ success: true });
        } catch (e) {
            console.error('Error deleting bookmark:', e);
            res.status(500).json({ error: 'Failed to delete bookmark' });
        }
    } else {
        res.json({ success: true }); // File doesn't exist, so technically deleted
    }
});

// API to batch delete bookmarks
app.post('/api/bookmarks/batch-delete', requireAdminToken, rateLimit(60_000, 30), (req, res) => {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ error: 'Invalid IDs' });
    }
    
    if (fs.existsSync(bookmarksPath)) {
        try {
            let bookmarks = JSON.parse(fs.readFileSync(bookmarksPath, 'utf8'));
            if (!Array.isArray(bookmarks)) bookmarks = [];
            
            const initialLen = bookmarks.length;
            bookmarks = bookmarks.filter(b => !ids.includes(b.id));
            const deletedCount = initialLen - bookmarks.length;
            
            fs.writeFileSync(bookmarksPath, JSON.stringify(bookmarks, null, 2));
            res.json({ success: true, deleted: deletedCount });
        } catch (e) {
            console.error('Error batch deleting bookmarks:', e);
            res.status(500).json({ error: 'Failed to delete bookmarks' });
        }
    } else {
        res.json({ success: true, deleted: 0 });
    }
});

// API to get snapshots (moments)
app.get('/api/snapshots', (req, res) => {
    if (fs.existsSync(momentsPath)) {
        try {
            const data = fs.readFileSync(momentsPath, 'utf8');
            res.json(JSON.parse(data));
        } catch (e) {
            console.error('Error parsing moments.json:', e);
            res.json([]);
        }
    } else {
        res.json([]);
    }
});

// API to save snapshot
app.post('/api/snapshots', requireAdminToken, rateLimit(60_000, 30), (req, res) => {
    const data = req.body;
    if (!data || typeof data !== 'object') {
        return res.status(400).json({ error: 'Invalid data' });
    }

    const newMoment = {
        id: 'snap-' + Date.now(),
        date: new Date().toISOString(),
        content: data.content || '',
        image: data.imageUrl || data.image || '',
        location: data.location || '',
        tags: Array.isArray(data.tags) ? data.tags : (data.tags ? data.tags.split(',') : []),
        fromAdmin: true
    };

    let moments = [];
    if (fs.existsSync(momentsPath)) {
        try {
            moments = JSON.parse(fs.readFileSync(momentsPath, 'utf8'));
            if (!Array.isArray(moments)) moments = [];
        } catch (e) {}
    }

    moments.unshift(newMoment);
    fs.writeFileSync(momentsPath, JSON.stringify(moments, null, 2));
    res.json({ success: true, data: newMoment });
});

// API to delete snapshot
app.delete('/api/snapshots', requireAdminToken, rateLimit(60_000, 30), (req, res) => {
    const id = req.query.id;
    if (!id) return res.status(400).json({ error: 'Missing ID' });

    if (fs.existsSync(momentsPath)) {
        try {
            let moments = JSON.parse(fs.readFileSync(momentsPath, 'utf8'));
            if (!Array.isArray(moments)) moments = [];
            
            const initialLen = moments.length;
            moments = moments.filter(m => m.id !== id);
            
            if (moments.length !== initialLen) {
                fs.writeFileSync(momentsPath, JSON.stringify(moments, null, 2));
            }
            res.json({ success: true });
        } catch (e) {
            res.status(500).json({ error: 'Failed to delete snapshot' });
        }
    } else {
        res.json({ success: true });
    }
});

// API to get media
app.get('/api/media', (req, res) => {
    if (fs.existsSync(mediaPath)) {
        try {
            res.json(JSON.parse(fs.readFileSync(mediaPath, 'utf8')));
        } catch (e) {
            res.json({ anime: [], manga: [] });
        }
    } else {
        res.json({ anime: [], manga: [] });
    }
});

// API to save media (manual update)
app.post('/api/media', requireAdminToken, rateLimit(60_000, 30), (req, res) => {
    const data = req.body;
    fs.writeFileSync(mediaPath, JSON.stringify(data, null, 2));
    res.json({ success: true });
});

// API to get notice
app.get('/api/notice', (req, res) => {
    if (fs.existsSync(noticePath)) {
        try {
            res.json(JSON.parse(fs.readFileSync(noticePath, 'utf8')));
        } catch (e) {
            res.json({});
        }
    } else {
        res.json({});
    }
});

// API to save notice
app.post('/api/notice', requireAdminToken, rateLimit(60_000, 30), (req, res) => {
    const data = req.body;
    fs.writeFileSync(noticePath, JSON.stringify(data, null, 2));
    res.json({ success: true });
});

// API to check bookmarks accessibility
app.post('/api/bookmarks/check', requireAdminToken, rateLimit(60_000, 100), async (req, res) => {
    if (!fs.existsSync(bookmarksPath)) {
        return res.json({ results: [] });
    }
    
    try {
        let bookmarks = [];
        if (req.body && Array.isArray(req.body.bookmarks)) {
            bookmarks = req.body.bookmarks;
        } else {
            bookmarks = JSON.parse(fs.readFileSync(bookmarksPath, 'utf8')) || [];
        }

        const results = [];
        const httpsAgent = new https.Agent({ rejectUnauthorized: false }); // Ignore SSL errors for check
        const commonHeaders = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache',
            'Referer': 'https://www.google.com/' // Fake referer to bypass some checks
        };

        const checkUrl = async (item) => {
            if (!item.url) return;
            const targetUrl = item.url;
            
            try {
                // Security: Prevent SSRF
                await assertPublicAddress(targetUrl);

                // Try HEAD first (fastest)
                let response = await axios.head(targetUrl, { 
                    timeout: 5000, 
                    validateStatus: () => true,
                    headers: commonHeaders,
                    httpsAgent,
                    maxRedirects: 3
                });

                // If HEAD fails with Method Not Allowed (405) or Forbidden (403) or Server Error, try GET
                // Note: Some sites return 403 on HEAD but 200 on GET.
                if (response.status === 405 || response.status === 403 || response.status >= 500) {
                     response = await axios.get(targetUrl, { 
                        timeout: 8000, 
                        validateStatus: () => true,
                        headers: commonHeaders, 
                        httpsAgent,
                        maxRedirects: 3,
                        maxContentLength: 512 * 1024 
                    });
                }

                // Loose success criteria: 
                // 2xx/3xx -> OK
                // 401/403 (Auth/Forbidden) -> OK (Site is alive, just protected)
                // 405 (Method Not Allowed) -> OK
                // 418 (Teapot) / 429 (Too Many Requests) -> OK
                // 404 -> Error (Not Found)
                // 5xx -> Error (Server Error)
                const isAlive = (response.status >= 200 && response.status < 400) || 
                                [401, 403, 405, 418, 429].includes(response.status);

                results.push({ 
                    id: item.id, 
                    status: isAlive ? 'ok' : 'error', 
                    code: response.status 
                });
            } catch (e) {
                let code = 'timeout';
                if (e.message === 'Invalid host' || e.message === 'Private address blocked') {
                    code = 'blocked';
                } else if (e.code === 'ENOTFOUND') {
                    code = 'dns_error';
                } else if (e.code === 'ECONNREFUSED') {
                    code = 'conn_refused';
                } else if (e.response) {
                    code = e.response.status;
                    // Treat specific HTTP errors as success (alive)
                    if ([401, 403, 405, 418, 429].includes(e.response.status)) {
                        results.push({ id: item.id, status: 'ok', code: e.response.status });
                        return;
                    }
                } else {
                    // console.error(`Check failed for ${targetUrl}:`, e.message);
                }
                
                results.push({ id: item.id, status: 'error', code: code });
            }
        };

        // Check in batches (Concurrency: 20)
        const BATCH_SIZE = 20;
        for (let i = 0; i < bookmarks.length; i += BATCH_SIZE) {
            const batch = bookmarks.slice(i, i + BATCH_SIZE);
            await Promise.all(batch.map(checkUrl));
        }

        res.json({ results });
    } catch (e) {
        console.error('Check bookmarks error:', e);
        res.status(500).json({ error: 'Check failed' });
    }
});

// Debug token discovery
app.get('/api/debug/token', (req, res) => {
    // Only allow for localhost or private network to prevent leakage if exposed
    // But since this server is intended for local admin use, we'll allow it.
    res.json({ token: ADMIN_TOKEN });
});

// Serve static files
app.use(express.static(path.join(__dirname, '..'), {
    setHeaders: (res, path) => {
        if (path.endsWith('.js')) {
            res.setHeader('Content-Type', 'application/javascript');
        }
    }
}));

// Global Error Handler
app.use((err, req, res, next) => {
    console.error('Unhandled Server Error:', err);
    res.status(500).json({ error: 'Internal Server Error', details: err.message });
});

app.listen(port, host, () => {
  console.log(`[Admin] Server running at http://${host}:${port}`);
});
