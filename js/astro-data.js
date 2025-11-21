(() => {
  const Cache = {
    get(key) {
      try { const v = localStorage.getItem(key); if (!v) return null; const o = JSON.parse(v); if (Date.now() > o.exp) return null; return o.val; } catch { return null; }
    },
    set(key, val, ttlMs) {
      try { localStorage.setItem(key, JSON.stringify({ val, exp: Date.now() + ttlMs })); } catch {}
    }
  };

  async function fetchCached(url, ttlMs) {
    const k = `fc_${url}`;
    const c = Cache.get(k);
    if (c) return c;
    const r = await fetch(url);
    if (!r.ok) throw new Error('net');
    const j = await r.json();
    Cache.set(k, j, ttlMs);
    return j;
  }

  function getLocation() {
    try { const v = localStorage.getItem('loc'); if (!v) return null; return JSON.parse(v); } catch { return null; }
  }

  function saveLocation(lat, lon) {
    try { localStorage.setItem('loc', JSON.stringify({ lat, lon })); } catch {}
  }

  async function loadStarCatalog(limitMag = 12) {
    const cacheKey = `stars_${limitMag}`;
    const cached = Cache.get(cacheKey);
    if (cached) return cached;
    const urls = [
      '/data/stars-hip-lite.json',
      'https://raw.githubusercontent.com/observatory-data/stars/refs/heads/main/hipparcos-lite.json'
    ];
    for (const u of urls) {
      try {
        const res = await fetch(u, { mode: 'cors' });
        if (!res.ok) continue;
        const arr = await res.json();
        const stars = arr.filter(s => s.mag <= limitMag).map(s => ({ ra: s.ra_h, dec: s.dec_deg, mag: s.mag }));
        Cache.set(cacheKey, stars, 60 * 60 * 1000);
        return stars;
      } catch {}
    }
    throw new Error('catalog_unavailable');
  }

  async function loadAstronomyEvents() {
    const cacheKey = 'astro_events';
    const cached = Cache.get(cacheKey);
    if (cached) return cached;
    const urls = [ '/data/events.json' ];
    for (const u of urls) {
      try {
        const res = await fetch(u);
        if (!res.ok) continue;
        const events = await res.json();
        Cache.set(cacheKey, events, 60 * 60 * 1000);
        return events;
      } catch {}
    }
    const fallback = [
      { type: 'meteor_shower', name: '双子座流星雨', peak: '2025-12-14', zhr: 120 },
      { type: 'eclipse', name: '月全食', date: '2025-03-14', visibility: '亚欧非' }
    ];
    Cache.set(cacheKey, fallback, 30 * 60 * 1000);
    return fallback;
  }

  function connectEventStream(url, onEvent) {
    try {
      const es = new EventSource(url);
      es.onmessage = e => { try { const d = JSON.parse(e.data); onEvent(d); } catch {} };
      es.onerror = () => {};
      return es;
    } catch { return null; }
  }

  async function loadPlaceName(lat, lon) {
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}&accept-language=zh-CN`;
      const j = await fetchCached(url, 24 * 60 * 60 * 1000);
      return j.display_name || `${lat.toFixed(2)}, ${lon.toFixed(2)}`;
    } catch {
      return `${lat.toFixed(2)}, ${lon.toFixed(2)}`;
    }
  }

  async function loadISSPosition() {
    try {
      const j = await fetchCached('https://api.wheretheiss.at/v1/satellites/25544', 10 * 60 * 1000);
      return { latitude: j.latitude, longitude: j.longitude };
    } catch {
      const j = Cache.get('iss_fallback');
      if (j) return j;
      const f = { latitude: 0, longitude: 0 };
      Cache.set('iss_fallback', f, 10 * 60 * 1000);
      return f;
    }
  }

  async function loadWeather() {
    try {
      const j = await fetchCached('/data/weather.json', 60 * 60 * 1000);
      return j;
    } catch {
      return { temperature: 20, humidity: 60, cloudCover: 30, seeing: '一般', transparency: '良好' };
    }
  }

  async function loadBortle() {
    try {
      const j = await fetchCached('/data/bortle.json', 24 * 60 * 60 * 1000);
      return j;
    } catch {
      return { bortle: 4 };
    }
  }

  function calcMoonPhase(date) {
    const lp = 2551443;
    const now = date.getTime() / 1000;
    const nm = Date.UTC(1970,0,7,20,35,0)/1000;
    const phase = ((now - nm) % lp) / lp;
    const illum = 0.5 - Math.cos(2*Math.PI*phase)/2;
    const names = ['新月','峨眉','上弦','盈凸','满月','亏凸','下弦','残月'];
    const idx = Math.floor(phase*8)%8;
    return { phase: names[idx], illum };
  }

  window.AstroData = { fetchCached, getLocation, saveLocation, loadStarCatalog, loadAstronomyEvents, connectEventStream, loadISSPosition, loadWeather, loadBortle, calcMoonPhase, loadPlaceName };
})();

