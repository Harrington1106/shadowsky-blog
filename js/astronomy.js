// astronomy.js

// ================================================================= 
// 1. 数据模型定义 (卡片内容) 
// * 使用 'img/avatar.jpg' 作为所有卡片的占位图。
// ================================================================= 
const astronomyData = [
    {
        title: "猎户座 (Orion)",
        type: "星座",
        image: "img/avatar.jpg",
        description: "冬季最显著的星座，包含参宿四、参宿七等亮星。",
        details: "最佳观测：11月至次年2月"
    },
    {
        title: "木星档案",
        type: "行星",
        image: "img/avatar.jpg",
        description: "太阳系最大的行星，可通过小型望远镜观测到其卫星。",
        details: "直径：142,984 km"
    },
    {
        title: "土星环系统",
        type: "行星",
        image: "img/avatar.jpg",
        description: "太阳系中最壮观的行星，其光环主要由冰粒和岩石碎片组成。",
        details: "可见于：望远镜或高倍双筒望远镜"
    },
    {
        title: "梅西耶 42 (M42)",
        type: "深空天体",
        image: "img/avatar.jpg",
        description: "猎户座中的一个巨大的恒星形成区域，是北半球最容易观测到的星云之一。",
        details: "距离：约 1,344 光年"
    },
    {
        title: "望远镜入门指南",
        type: "器材",
        image: "img/avatar.jpg",
        description: "如何选择您的第一台望远镜？从折射镜到反射镜的全面解析。",
        details: "推荐类型：Dobsonian (多布森)"
    },
];

// ================================================================= 
// 2. 核心卡片渲染函数 (带错误检查) 
// ================================================================= 
function generateAstroCards() {
    const container = document.getElementById('astroCardContainer');
    
    if (!container) return; 
    
    if (astronomyData.length === 0) { 
        container.innerHTML = '<p class="no-data-msg">暂无天文内容卡片，数据正在整理中...</p>'; 
        return; 
    }

    const cardsHTML = astronomyData.map(data => {
        const imageSrc = data.image || 'img/avatar.jpg'; 
        const title = data.title || '未知标题'; 
        const description = data.description || '暂无描述。'; 
        const details = data.details || ''; 

        return ` 
            <div class="astro-card" data-type="${data.type || '未知'}"> 
                <img src="${imageSrc}" alt="${title}" class="card-image" onerror="this.onerror=null;this.src='img/avatar.jpg';"> 
                <div class="card-content"> 
                    <h3>${title}</h3> 
                    <p>${description}</p> 
                    <small>${details}</small> 
                </div> 
            </div> 
        `;
    }).join(''); 
    
    container.innerHTML = cardsHTML;
}

// ================================================================= 
// 3. API 集成：ISS 位置 (wheretheiss.at API) 
// ================================================================= 
async function fetchISSLocation() { 
    const url = 'https://api.wheretheiss.at/v1/satellites/25544'; 
    const issElement = document.getElementById('issLocation'); 
    
    try { 
        const response = await fetch(url); 
        if (!response.ok) throw new Error('Network response was not ok'); 
        
        const data = await response.json(); 
        const { latitude, longitude } = data; 
        
        issElement.innerHTML = ` 
            <h3>国际空间站 (ISS) 实时位置</h3> 
            <p>纬度: <strong>${parseFloat(latitude).toFixed(4)}°</strong></p> 
            <p>经度: <strong>${parseFloat(longitude).toFixed(4)}°</strong></p> 
        `; 
    } catch (error) { 
        issElement.innerHTML = ` 
            <h3>ISS 实时位置</h3> 
            <p style="color: #ff5252;">数据加载失败，请稍后重试。</p> 
        `; 
        console.error("Error fetching ISS data:", error); 
    } 
}

// ================================================================= 
// 4. API 集成：月相数据 (本地模拟数据) 
// ================================================================= 
function mockMoonPhase() {
    const phases = ["新月", "娥眉月", "上弦月", "盈凸月", "满月", "亏凸月", "下弦月", "残月"]; 
    const phaseName = phases[Math.floor(Math.random() * phases.length)]; 
    const illumination = Math.floor(Math.random() * 100) + "%"; 
    
    const moonElement = document.getElementById('moonPhase'); 
    
    moonElement.innerHTML = ` 
        <h3>月相实时数据</h3> 
        <p>当前月相: <strong>${phaseName}</strong></p> 
        <p>月球照度: <strong>${illumination}</strong></p> 
    `;
}

// ================================================================= 
// 5. 页面初始化及交互逻辑
// =================================================================
function initAstronomyPage() {
    // 动态渲染天文知识卡片
    generateAstroCards();
    
    // 加载实时 API 数据
    fetchISSLocation(); 
    mockMoonPhase();
    
    // 每 30 秒刷新一次 ISS 位置
    setInterval(fetchISSLocation, 30000);

    // 汉堡菜单功能 
    const navToggle = document.getElementById("navToggle");
    const navMenu = document.querySelector(".navbar-menu");
    if (navToggle && navMenu) {
        navToggle.addEventListener("click", () => {
            navMenu.classList.toggle("active");
        });
    }
}

document.addEventListener('DOMContentLoaded', initAstronomyPage);