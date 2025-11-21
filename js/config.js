// API 配置和常量
export const CONFIG = {
    // 天气API (示例 - 需要替换为真实API)
    WEATHER_API: {
        key: 'your_weather_api_key',
        baseURL: 'https://api.weatherapi.com/v1'
    },
    // 天文API (示例)
    ASTRONOMY_API: {
        baseURL: 'https://api.astronomyapi.com/v1'
    },
    // ISS位置API
    ISS_API: 'https://api.wheretheiss.at/v1/satellites/25544',
    // 默认设置
    DEFAULT_CITY: 'Beijing',
    UPDATE_INTERVAL: 300000, // 5分钟更新一次
    // 天文图片源
    IMAGE_SOURCES: [
        'NASA APOD',
        'Hubble Space Telescope',
        'ESO'
    ]
};

// 模拟数据 - 用于演示
export const MOCK_DATA = {
    environmental: {
        temperature: 22,
        humidity: 65,
        cloudCover: 30,
        visibility: '良好',
        moonPhase: '新月'
    },
    celestial: {
        sunrise: '06:30',
        sunset: '18:45',
        issPosition: {
            latitude: 39.9042,
            longitude: 116.4074
        }
    },
    astronomyArticles: [
        {
            id: 1,
            title: '詹姆斯·韦伯望远镜的新发现',
            description: '探索宇宙最古老星系的奥秘',
            image: 'img/webb-telescope.jpg',
            date: '2025-01-15',
            category: '望远镜'
        },
        {
            id: 2,
            title: '2025年重要天象预告',
            description: '流星雨、日食、月食观测指南',
            image: 'img/meteor-shower.jpg',
            date: '2025-01-10',
            category: '天象'
        },
        {
            id: 3,
            title: '火星探测最新进展',
            description: '毅力号火星车的科学发现',
            image: 'img/mars-rover.jpg',
            date: '2025-01-08',
            category: '行星'
        }
    ]
};