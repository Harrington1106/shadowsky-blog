// nature.js - 自然页面功能
// =================================================================
// 1. 自然景观数据模型
// =================================================================
const natureData = [
    {
        title: "森林生态系统",
        type: "生态",
        image: "img/avatar.jpg",
        description: "探索森林中的生物多样性和生态平衡，了解树木、动物和微生物之间的复杂关系。",
        details: "包含植物、动物、微生物的复杂网络"
    },
    {
        title: "海洋奥秘",
        type: "海洋",
        image: "img/avatar.jpg",
        description: "深海生物和珊瑚礁生态系统的神奇世界，探索覆盖地球71%的蓝色王国。",
        details: "覆盖地球71%的蓝色王国"
    },
    {
        title: "山脉地质",
        type: "地质",
        image: "img/avatar.jpg",
        description: "山脉形成的地质过程和独特生态系统，了解板块运动与生物适应的奇迹。",
        details: "板块运动与生物适应的奇迹"
    },
    {
        title: "湿地生态",
        type: "生态",
        image: "img/avatar.jpg",
        description: "湿地作为地球之肾的重要作用，保护水资源和维护生态平衡的关键区域。",
        details: "地球之肾，生态平衡关键"
    },
    {
        title: "草原生态",
        type: "生态",
        image: "img/avatar.jpg",
        description: "广袤草原上的生态系统，了解草食动物与肉食动物之间的平衡关系。",
        details: "草食与肉食动物的平衡"
    },
    {
        title: "极地环境",
        type: "极地",
        image: "img/avatar.jpg",
        description: "地球两极的独特生态系统，探索极地生物如何适应极端环境。",
        details: "极端环境下的生命奇迹"
    }
];

// =================================================================
// 2. 环保知识数据
// =================================================================
const ecoTips = [
    {
        tip: "♻️ 垃圾分类指南",
        content: "学习正确的垃圾分类方法，将可回收物、厨余垃圾、有害垃圾和其他垃圾分开处理，保护环境资源。"
    },
    {
        tip: "💧 水资源保护",
        content: "日常生活中的节水技巧：修复漏水、使用节水器具、合理利用雨水等，保护珍贵的水资源。"
    },
    {
        tip: "🌳 植树造林",
        content: "树木对生态平衡的重要作用：净化空气、保持水土、提供栖息地，积极参与植树活动。"
    },
    {
        tip: "🚲 绿色出行",
        content: "选择步行、骑行或公共交通，减少汽车尾气排放，为改善空气质量贡献力量。"
    },
    {
        tip: "⚡ 节能减排",
        content: "合理使用电器，选择节能产品，减少能源消耗，降低碳排放。"
    },
    {
        tip: "🛍️ 减少塑料使用",
        content: "使用可重复利用的购物袋，减少一次性塑料制品的使用，保护海洋生态。"
    }
];

// =================================================================
// 3. 核心渲染函数
// =================================================================

/**
 * 动态生成并渲染自然景观卡片
 */
function generateNatureCards() {
    const container = document.getElementById('natureCardContainer');
    if (!container) return;

    if (natureData.length === 0) {
        container.innerHTML = '<p class="no-data-msg">暂无自然内容卡片，数据正在整理中...</p>';
        return;
    }

    const cardsHTML = natureData.map(data => {
        const imageSrc = data.image || 'img/avatar.jpg';
        const title = data.title || '未知标题';
        const description = data.description || '暂无描述。';
        const details = data.details || '';

        return `
            <div class="nature-showcase-card" data-type="${data.type || '未知'}">
                <img src="${imageSrc}" alt="${title}" class="nature-card-image" onerror="this.onerror=null;this.src='img/avatar.jpg';">
                <div class="nature-card-content">
                    <h3>${title}</h3>
                    <p>${description}</p>
                    <small>${details}</small>
                </div>
            </div>
        `;
    }).join('');

    container.innerHTML = cardsHTML;
}

/**
 * 动态生成并渲染环保小贴士卡片
 */
function generateEcoTips() {
    const container = document.getElementById('ecoTipsContainer');
    if (!container) return;

    const tipsHTML = ecoTips.map(tip => `
        <div class="eco-tip-card">
            <h4>${tip.tip}</h4>
            <p>${tip.content}</p>
        </div>
    `).join('');

    container.innerHTML = tipsHTML;
}

// =================================================================
// 4. 模拟环境数据API
// =================================================================

/**
 * 模拟获取并渲染天气数据
 */
function mockWeatherData() {
    const weatherConditions = ["晴朗", "多云", "小雨", "阴天", "晴朗"];
    const condition = weatherConditions[Math.floor(Math.random() * weatherConditions.length)];
    const temperature = Math.floor(Math.random() * 15) + 15; // 15-30度
    const humidity = Math.floor(Math.random() * 30) + 50; // 50-80%
    const weatherElement = document.getElementById('weatherCard');

    if (weatherElement) {
        weatherElement.innerHTML = `
            <h3>🌤️ 当前天气</h3>
            <p>温度: <strong>${temperature}°C</strong></p>
            <p>湿度: <strong>${humidity}%</strong></p>
            <p>天气状况: <strong>${condition}</strong></p>
        `;
    }
}

/**
 * 模拟获取并渲染空气质量数据
 */
function mockAirQualityData() {
    const aqiLevels = ["优", "良", "轻度污染", "中度污染"];
    const level = aqiLevels[Math.floor(Math.random() * aqiLevels.length)];
    const aqi = Math.floor(Math.random() * 100) + 30; // 30-130
    const pm25 = Math.floor(Math.random() * 60) + 20; // 20-80
    const airElement = document.getElementById('airQualityCard');

    if (airElement) {
        airElement.innerHTML = `
            <h3>💨 空气质量</h3>
            <p>AQI指数: <strong>${aqi}</strong></p>
            <p>PM2.5: <strong>${pm25} μg/m³</strong></p>
            <p>空气质量: <strong>${level}</strong></p>
        `;
    }
}

/**
 * 模拟获取并渲染季节信息数据
 */
function mockSeasonData() {
    const seasons = ["春季", "夏季", "秋季", "冬季"];
    const season = seasons[Math.floor(Math.random() * seasons.length)];
    const solarTerms = ["春分", "清明", "谷雨", "立夏", "小满", "芒种", "夏至", "小暑", "大暑", "立秋", "处暑", "白露", "秋分", "寒露", "霜降", "立冬", "小雪", "大雪", "冬至", "小寒", "大寒"];
    const term = solarTerms[Math.floor(Math.random() * solarTerms.length)];
    const daylight = Math.floor(Math.random() * 3) + 10; // 10-13小时
    const seasonElement = document.getElementById('seasonCard');

    if (seasonElement) {
        seasonElement.innerHTML = `
            <h3>🍂 季节信息</h3>
            <p>当前季节: <strong>${season}</strong></p>
            <p>二十四节气: <strong>${term}</strong></p>
            <p>日照时长: <strong>${daylight}小时</strong></p>
        `;
    }
}

// =================================================================
// 5. 页面初始化及交互逻辑
// =================================================================

/**
 * 页面初始化主函数
 */
function initNaturePage() {
    // 动态渲染自然景观卡片
    generateNatureCards();
    // 动态渲染环保小贴士
    generateEcoTips();

    // 加载模拟环境数据
    mockWeatherData();
    mockAirQualityData();
    mockSeasonData();

    // 每2分钟刷新一次环境数据
    setInterval(() => {
        mockWeatherData();
        mockAirQualityData();
        mockSeasonData();
    }, 120000);

    // 汉堡菜单功能
    const navToggle = document.getElementById("navToggle");
    const navMenu = document.querySelector(".navbar-menu");
    if (navToggle && navMenu) {
        navToggle.addEventListener("click", () => {
            navMenu.classList.toggle("active");
        });
    }

    // 添加卡片点击效果 (简单动画反馈)
    const natureCards = document.querySelectorAll('.nature-showcase-card');
    natureCards.forEach(card => {
        card.addEventListener('click', function() {
            this.style.transform = 'scale(0.98)';
            setTimeout(() => {
                this.style.transform = '';
            }, 150);
        });
    });
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', initNaturePage);