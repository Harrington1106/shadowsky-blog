async function renderObservationTools() {
    const el = document.getElementById('obsTools');
    if (!el) return;
    el.innerHTML = '';
    const loc = window.AstroData.getLocation();
    const iss = await window.AstroData.loadISSPosition();
    const moon = window.AstroData.calcMoonPhase(new Date());
    const weather = await window.AstroData.loadWeather();
    const bortle = await window.AstroData.loadBortle();
    const events = await window.AstroData.loadAstronomyEvents();
    const cards = [];
    cards.push(`<div class="tool-card"><h3 class="card-title"><i class="fa-solid fa-moon"></i> 月相</h3><p>${moon.phase}</p><p>照明比 ${moon.illum.toFixed(2)}</p></div>`);
    cards.push(`<div class="tool-card"><h3 class="card-title"><i class="fa-solid fa-satellite"></i> ISS</h3><p>纬度 ${Number(iss.latitude).toFixed(2)}° 经度 ${Number(iss.longitude).toFixed(2)}°</p></div>`);
    cards.push(`<div class="tool-card"><h3 class="card-title"><i class="fa-solid fa-cloud-sun"></i> 天气</h3><p>${weather.temperature}°C 湿度 ${weather.humidity}% 云量 ${weather.cloudCover}%</p><p>视宁度 ${weather.seeing} 透明度 ${weather.transparency}</p></div>`);
    cards.push(`<div class="tool-card"><h3 class="card-title"><i class="fa-solid fa-earth-asia"></i> 光污染</h3><p>Bortle 等级 ${bortle.bortle}</p></div>`);
    cards.push(`<div class="tool-card"><h3 class="card-title"><i class="fa-solid fa-calendar-days"></i> 事件</h3><ul>${events.slice(0,3).map(e=>`<li>${e.name||e.type} ${e.date||e.peak||''}</li>`).join('')}</ul></div>`);
    const locCard = `
      <div class="tool-card">
        <h3 class="card-title"><i class="fa-solid fa-location-dot"></i> 位置</h3>
        <div class="controls-row">
          <label>纬度 <input id="locLat" class="input-text" type="number" step="0.01" value="${loc ? Number(loc.lat).toFixed(2) : ''}"></label>
          <label>经度 <input id="locLon" class="input-text" type="number" step="0.01" value="${loc ? Number(loc.lon).toFixed(2) : ''}"></label>
          <button id="locSave" class="btn btn-primary">保存</button>
          <button id="locDetect" class="btn btn-secondary">自动定位</button>
        </div>
        ${loc ? `<p id="locName">当前：${Number(loc.lat).toFixed(2)}°，${Number(loc.lon).toFixed(2)}°</p>` : ''}
      </div>`;
    cards.unshift(locCard);
    el.innerHTML = cards.join('');

    const saveBtn = document.getElementById('locSave');
    const detectBtn = document.getElementById('locDetect');
    const latInput = document.getElementById('locLat');
    const lonInput = document.getElementById('locLon');
    if (saveBtn && latInput && lonInput) {
      saveBtn.addEventListener('click', () => {
        const lat = parseFloat(latInput.value);
        const lon = parseFloat(lonInput.value);
        if (Number.isFinite(lat) && Number.isFinite(lon)) {
          window.AstroData.saveLocation(lat, lon);
          renderObservationTools();
        }
      });
    }
    if (detectBtn && latInput && lonInput) {
      detectBtn.addEventListener('click', () => {
        if (!navigator.geolocation) return;
        navigator.geolocation.getCurrentPosition(pos => {
          const { latitude, longitude } = pos.coords;
          window.AstroData.saveLocation(latitude, longitude);
          renderObservationTools();
        });
      });
    }

    if (loc) {
      window.AstroData.loadPlaceName(Number(loc.lat), Number(loc.lon)).then(name => {
        const ln = document.getElementById('locName');
        if (ln) ln.textContent = `当前：${name}`;
      });
    }
}

async function renderHeroSummary() {
    const loc = window.AstroData.getLocation();
    if (loc) {
        window.AstroData.loadPlaceName(Number(loc.lat), Number(loc.lon)).then(name => {
            const el = document.getElementById('heroLocation');
            if (el) el.textContent = name;
        });
    } else if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(pos => {
            const { latitude, longitude } = pos.coords;
            window.AstroData.saveLocation(latitude, longitude);
            renderHeroSummary();
        });
    }
    const moon = window.AstroData.calcMoonPhase(new Date());
    const mEl = document.getElementById('heroMoon');
    if (mEl) mEl.textContent = `${moon.phase} · ${moon.illum.toFixed(2)}`;
    const weather = await window.AstroData.loadWeather();
    const wEl = document.getElementById('heroWeather');
    if (wEl) wEl.textContent = `${weather.temperature}°C · 云量${weather.cloudCover}%`;
    const bortle = await window.AstroData.loadBortle();
    const bEl = document.getElementById('heroBortle');
    if (bEl) bEl.textContent = `B${bortle.bortle}`;
}

function calcPhotoParams() {
    const setups = [
        { lens: 24, crop: 1 },
        { lens: 35, crop: 1 },
        { lens: 50, crop: 1.5 }
    ];
    return setups.map(s => {
        const t = Math.round(500 / (s.lens * s.crop));
        return `${s.lens}mm ×${s.crop} 约 ${t}s`;
    });
}

function renderKnowledge() {
    const el = document.getElementById('knowledgeGrid');
    if (!el) return;
    const photo = calcPhotoParams();
    const items = [
        { t:'视星等', d:'数值越小越亮，差5等约100倍亮度。' },
        { t:'光谱类型', d:'OBAFGKM，从高温到低温，颜色由蓝到红。' },
        { t:'距离单位', d:'常用光年与秒差距，1pc≈3.26光年。' },
        { t:'赤经赤纬', d:'天球坐标系，赤经以小时表示，赤纬以度表示。' },
        { t:'红移', d:'z 表示宇宙膨胀导致的谱线位移，与距离相关。' },
        { t:'HR 图', d:'恒星光度与温度分布，主序、巨星、白矮星。' },
        { t:'星云类型', d:'发射、反射、暗星云与行星状星云。' },
        { t:'摄影建议', d: photo.join('；') }
    ];
    el.innerHTML = items.map(i=>`<div class="knowledge-card"><h3 class="card-title">${i.t}</h3><p>${i.d}</p></div>`).join('');
}

// ===========================================
// 1. 行星数据
// ===========================================
const SOLAR_SYSTEM_DATA = [
    { name: "水星", icon: "💧", searchName: "水星", magnitude: "+0.5", type: "类地行星", distance: "0.39 AU", period: "88 天" },
    { name: "金星", icon: "✨", searchName: "金星", magnitude: "-4.5", type: "类地行星", distance: "0.72 AU", period: "225 天" },
    { name: "火星", icon: "🔴", searchName: "火星", magnitude: "-1.0", type: "类地行星", distance: "1.52 AU", period: "687 天" },
    { name: "木星", icon: "🪐", searchName: "木星", magnitude: "-2.5", type: "巨型气态", distance: "5.20 AU", period: "11.86 年" },
    { name: "土星", icon: "🔭", searchName: "土星", magnitude: "+0.3", type: "巨型气态", distance: "9.58 AU", period: "29.46 年" },
    { name: "天王星", icon: "🧊", searchName: "天王星", magnitude: "+5.7", type: "巨型冰态", distance: "19.23 AU", period: "84.02 年" },
    { name: "海王星", icon: "🌊", searchName: "海王星", magnitude: "+7.8", type: "巨型冰态", distance: "30.10 AU", period: "164.8 年" },
    { name: "冥王星", icon: "🥶", searchName: "冥王星 矮行星", magnitude: "+14.0", type: "矮行星", distance: "39.53 AU", period: "248.6 年" }
];


// ===========================================
// 2. 星座数据
// ===========================================
const CONSTELLATION_DATA = [
    { name: "猎户座", icon: "🏹", searchName: "猎户座", season: "冬季", myth: "希腊神话中的猎人，冬季夜空最闪亮的星座之一。" },
    { name: "天蝎座", icon: "🦂", searchName: "天蝎座", season: "夏季", myth: "嫉妒之神派出的毒蝎，它的‘心’是红色巨星心宿二。" },
    { name: "大熊座", icon: "🐻", searchName: "大熊座", season: "春季", myth: "卡利斯托的化身，北斗七星即是其尾部和后腿。" },
    { name: "小熊座", icon: " Polaris", searchName: "小熊座", season: "全年", myth: "小熊是卡利斯托的儿子，尾巴上的北极星指引方向。" },
    { name: "天琴座", icon: " lyre", searchName: "天琴座", season: "夏季", myth: "希腊诗人俄耳甫斯的神奇乐器，主星织女星是夏季大三角之一。" },
    { name: "仙后座", icon: " W", searchName: "仙后座", season: "秋季", myth: "埃塞俄比亚王后，因虚荣心受到惩罚被倒挂在天上。" },
    { name: "人马座", icon: " ♐", searchName: "人马座", season: "夏季", myth: "半人马，位于银河系中心方向，盛产星云和星团。" },
    { name: "双子座", icon: " 👯", searchName: "双子座", season: "冬季", myth: "宙斯的两个儿子，卡斯托和波吕克斯。" },
    { name: "狮子座", icon: " 🦁", searchName: "狮子座", season: "春季", myth: "赫拉克勒斯杀死的涅墨亚猛狮，拥有镰刀状星群。" },
    { name: "金牛座", icon: " ♉", searchName: "金牛座", season: "冬季", myth: "宙斯化身的神牛，拥有著名的昴星团和毕星团。" },
];

// ===========================================
// 3. 渲染函数 (保持不变)
// ===========================================

function renderPlanets() {
    const container = document.getElementById('planetContainer');
    if (!container) return;
    container.innerHTML = ''; 

    SOLAR_SYSTEM_DATA.forEach(planet => {
        const dataHtml = `
            <ul class="planet-card__data">
                <li><strong>星等</strong>${planet.magnitude}</li>
                <li><strong>类型</strong>${planet.type}</li>
                <li><strong>距离</strong>${planet.distance}</li>
                <li><strong>周期</strong>${planet.period}</li>
            </ul>
        `;
        const cardHTML = `
            <div class="planet-card" data-search="${planet.searchName}" title="点击跳转百度百科">
                <h3 class="planet-card__title">${planet.icon} ${planet.name}</h3>
                ${dataHtml}
            </div>
        `;
        container.insertAdjacentHTML('beforeend', cardHTML);
    });

    document.querySelectorAll('.planet-card').forEach(card => {
        card.addEventListener('click', function() {
            const query = this.getAttribute('data-search');
            const baiduUrl = `https://baike.baidu.com/item/${encodeURIComponent(query)}`;
            window.open(baiduUrl, '_blank');
        });
    });
}

function renderConstellationGrid() {
    const container = document.getElementById('constellationGrid');
    if (!container) return;
    container.innerHTML = '';

    CONSTELLATION_DATA.forEach(star => {
        const cardHTML = `
            <div class="star-card" data-search="${star.searchName}" title="点击跳转百度百科">
                <div class="star-card__icon">${star.icon}</div>
                <div class="star-card__name">${star.name}</div>
            </div>
        `;
        container.insertAdjacentHTML('beforeend', cardHTML);
    });
    
    document.querySelectorAll('.star-card').forEach(card => {
        card.addEventListener('click', function() {
            const query = this.getAttribute('data-search');
            const baiduUrl = `https://baike.baidu.com/item/${encodeURIComponent(query)}`;
            window.open(baiduUrl, '_blank');
        });
    });
}


/**
 * 加载新闻 (使用 RSS-to-JSON 获取中国科学院要闻)
 */
async function loadAstronomyNews() {
    const container = document.getElementById('astronomyNewsList');
    if (!container) return;
    container.innerHTML = `<div class="loading-placeholder">正在尝试加载中国科学院要闻...</div>`;

    const API_URLS = [
      "https://api.rss2json.com/v1/api.json?rss_url=https%3A%2F%2Frsshub.app%2Fcas%2Fnews",
      "https://api.rss2json.com/v1/api.json?rss_url=https%3A%2F%2Frsshub.app%2Fcas%2Fyw"
    ];

    try {
        let newsData = [];
        for (const u of API_URLS) {
          const response = await fetch(u);
          if (!response.ok) continue;
          const jsonResult = await response.json();
          if (jsonResult && Array.isArray(jsonResult.items) && jsonResult.items.length) {
            newsData = jsonResult.items;
            break;
          }
        }
        if (!newsData.length) throw new Error('RSS-to-JSON服务失败。正在尝试回退到同源文件...');

        container.innerHTML = '';
        if (newsData.length === 0) {
             container.innerHTML = `<div class="loading-placeholder">暂无最新新闻。</div>`;
             return;
        }

        newsData.slice(0, 10).forEach(news => {
            const itemHTML = `
                <div class="news-item">
                    <a href="${news.link}" target="_blank">${news.title}</a>
                    <span class="news-item__date">发布于 ${news.pubDate ? news.pubDate.substring(0, 10) : '未知日期'}</span>
                </div>
            `;
            container.insertAdjacentHTML('beforeend', itemHTML);
        });
        
    } catch (error) {
        console.error("无法获取实时新闻，尝试回退到同源文件:", error);
        
        // ** 回退机制：如果实时API失败，立即加载您自己的静态数据 **
        try {
            container.innerHTML = `<div class="loading-placeholder">实时接口失败，尝试加载您网站上的 /data/news.json 文件...</div>`;
            const staticResponse = await fetch('/data/news.json'); // 同源请求
            if (!staticResponse.ok) throw new Error('同源 JSON 文件 /data/news.json 不存在。');
            const staticNews = await staticResponse.json();

            container.innerHTML = '';
            staticNews.slice(0, 10).forEach(news => { 
                const itemHTML = `
                    <div class="news-item">
                        <a href="${news.link}" target="_blank">${news.title}</a>
                        <span class="news-item__date">发布于 ${news.date || '未知日期'} (静态)</span>
                    </div>
                `;
                container.insertAdjacentHTML('beforeend', itemHTML);
            });
            console.log("成功回退到同源静态数据。");

        } catch (staticError) {
            console.error("同源回退也失败了:", staticError);
            container.innerHTML = `<div class="loading-placeholder" style="color: red;">新闻加载最终失败：所有接口均不可用。请运行爬虫生成 /data/news.json 文件。</div>`;
        }
    }
}


async function initAstronomyPage() {
    await renderHeroSummary();
    await renderObservationTools();
    renderKnowledge();
    renderPlanets();
    renderConstellationGrid();
    loadAstronomyNews();

    const observer = new IntersectionObserver(entries => {
        entries.forEach(e => {
            if (e.isIntersecting) {
                e.target.classList.add('in');
                observer.unobserve(e.target);
            }
        });
    }, { threshold: 0.1 });
    document.querySelectorAll('.tool-card,.knowledge-card,.planet-card,.star-card').forEach(el => {
        el.classList.add('reveal-up');
        observer.observe(el);
    });
}

document.addEventListener('DOMContentLoaded', initAstronomyPage);