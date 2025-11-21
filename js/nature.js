// ============================
// 导航栏功能
// ============================
function initNavigation() {
    const navToggle = document.getElementById('navToggle');
    const navbarMenu = document.getElementById('navbarMenu');

    if (navToggle && navbarMenu) {
        // 点击汉堡按钮切换菜单显示
        navToggle.addEventListener('click', function () {
            const isExpanded = this.getAttribute('aria-expanded') === 'true';
            this.setAttribute('aria-expanded', !isExpanded);
            navbarMenu.classList.toggle('active');
        });

        // 点击菜单外区域关闭菜单
        document.addEventListener('click', function (event) {
            if (!navToggle.contains(event.target) && !navbarMenu.contains(event.target)) {
                navToggle.setAttribute('aria-expanded', 'false');
                navbarMenu.classList.remove('active');
            }
        });
    }
}

// ============================
// 自然页面数据
// ============================
const natureData = [
    {
        title: "森林生态系统",
        type: "生态",
        icon: "🌳",
        description: "探索森林中的生物多样性和生态平衡",
        details: "包含植物、动物、微生物的复杂网络，维持地球氧气循环"
    },
    {
        title: "海洋奥秘",
        type: "海洋",
        icon: "🌊",
        description: "深海生物和珊瑚礁生态系统的神奇世界",
        details: "覆盖地球71%的蓝色王国，生物多样性极其丰富"
    },
    {
        title: "山脉地质",
        type: "地质",
        icon: "⛰️",
        description: "山脉形成的地质过程和独特生态系统",
        details: "板块运动与生物适应的奇迹，垂直生态分布明显"
    },
    {
        title: "湿地生态",
        type: "湿地",
        icon: "💧",
        description: "地球之肾的生态功能与生物多样性",
        details: "重要的水源涵养地和生物栖息地"
    }
];

const ecoTips = [
    {
        icon: "♻️",
        tip: "垃圾分类指南",
        content: "学习正确的垃圾分类方法，可回收物、有害垃圾、厨余垃圾和其他垃圾要分开处理，减少环境污染。"
    },
    {
        icon: "💧",
        tip: "水资源保护",
        content: "日常生活中的节水技巧：修复漏水龙头、收集雨水浇花、缩短淋浴时间，保护珍贵的水资源。"
    },
    {
        icon: "🌳",
        tip: "植树造林",
        content: "树木对生态平衡的重要作用：吸收二氧化碳、防止水土流失、为野生动物提供栖息地。"
    },
    {
        icon: "🚲",
        tip: "绿色出行",
        content: "多选择步行、骑行或公共交通，减少汽车尾气排放，改善空气质量。"
    }
];

const natureEvents = [
    { date: "每月15日", event: "满月观测最佳时机" },
    { date: "春分秋分", event: "昼夜平分自然观察" },
    { date: "夏至冬至", event: "极昼极夜现象研究" },
    { date: "雨季来临", event: "湿地生态变化观察" }
];

// ============================
// DOM 加载完成后执行
// ============================
document.addEventListener('DOMContentLoaded', function () {
    initNavigation();           // 初始化导航栏
    initWeatherData();          // 天气
    generateNatureCards();      // 自然知识卡片
    initEcoTips();              // 环保小贴士
    initNatureCalendar();       // 自然日历

    // 设置自动刷新天气数据，每5分钟更新一次
    setInterval(initWeatherData, 300000);
});

// ============================
// 天气数据获取
// ============================
async function initWeatherData() {
    try {
        const response = await fetch(
            'https://api.open-meteo.com/v1/forecast?latitude=39.9042&longitude=116.4074&current_weather=true&hourly=relativehumidity_2m'
        );
        if (response.ok) {
            const data = await response.json();
            updateWeatherDisplay(data);
        } else {
            throw new Error('天气API不可用');
        }
    } catch (error) {
        mockWeatherData();
    }
}

function updateWeatherDisplay(data) {
    const temperature = document.getElementById('temperature');
    const humidity = document.getElementById('humidity');
    const airQuality = document.getElementById('air-quality');

    if (data.current_weather) {
        temperature.textContent = `${data.current_weather.temperature}°C`;
        humidity.textContent = `${Math.round(Math.random() * 30 + 50)}%`; // 模拟湿度
        airQuality.textContent = getRandomAirQuality();
    }
}

function mockWeatherData() {
    const temperature = document.getElementById('temperature');
    const humidity = document.getElementById('humidity');
    const airQuality = document.getElementById('air-quality');

    const temp = Math.round(Math.random() * 15 + 15); // 15-30°C
    const hum = Math.round(Math.random() * 30 + 50);  // 50-80%

    temperature.textContent = `${temp}°C`;
    humidity.textContent = `${hum}%`;
    airQuality.textContent = getRandomAirQuality();
}

function getRandomAirQuality() {
    const qualities = ['优', '良', '轻度污染', '中度污染'];
    return qualities[Math.floor(Math.random() * qualities.length)];
}

// ============================
// 生成自然知识卡片
// ============================
function generateNatureCards() {
    const container = document.getElementById('natureContainer');
    if (!container) return;

    container.innerHTML = natureData.map(item => `
        <div class="nature-item">
            <div class="nature-image">${item.icon}</div>
            <div class="nature-content">
                <span class="nature-type">${item.type}</span>
                <h3 class="nature-title">${item.title}</h3>
                <p class="nature-description">${item.description}</p>
                <div class="nature-details">${item.details}</div>
            </div>
        </div>
    `).join('');

    const observer = new IntersectionObserver(entries => {
        entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); observer.unobserve(e.target); } });
    }, { threshold: 0.1 });
    document.querySelectorAll('.nature-item').forEach(el => { el.classList.add('reveal-up'); observer.observe(el); });
}

// ============================
// 初始化环保小贴士
// ============================
function initEcoTips() {
    const container = document.getElementById('ecoTipsCarousel');
    if (!container) return;

    container.innerHTML = ecoTips.map(tip => `
        <div class="eco-tip">
            <div class="eco-tip-header">
                <span class="eco-tip-icon">${tip.icon}</span>
                <h4 class="eco-tip-title">${tip.tip}</h4>
            </div>
            <p class="eco-tip-content">${tip.content}</p>
        </div>
    `).join('');
}

// ============================
// 初始化自然日历
// ============================
function initNatureCalendar() {
    const container = document.getElementById('natureCalendar');
    if (!container) return;

    container.innerHTML = natureEvents.map(event => `
        <div class="calendar-item">
            <span class="date">${event.date}</span>
            <span class="event">${event.event}</span>
        </div>
    `).join('');
}

// ============================
// 添加交互效果
// ============================
function addInteractiveEffects() {
    // 自然卡片点击效果
    document.querySelectorAll('.nature-item').forEach(item => {
        item.addEventListener('click', function () {
            this.style.transform = 'scale(0.95)';
            setTimeout(() => { this.style.transform = ''; }, 150);
        });
    });

    // 环保小贴士轮播
    let currentTip = 0;
    const ecoTips = document.querySelectorAll('.eco-tip');

    function rotateTips() {
        ecoTips.forEach(tip => tip.style.display = 'none');
        ecoTips[currentTip].style.display = 'block';
        currentTip = (currentTip + 1) % ecoTips.length;
    }

    setInterval(rotateTips, 10000); // 每10秒切换一次
}

// 在DOM完全加载后添加交互效果
document.addEventListener('DOMContentLoaded', addInteractiveEffects);
