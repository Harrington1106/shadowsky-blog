// video.js - 视频页面功能
// =================================================================
// 1. 视频数据模型
// =================================================================
const myVideos = [
    {
        id: 1,
        title: "天文观测入门：如何选择你的第一台望远镜",
        thumbnail: "img/avatar.jpg",
        duration: "15:30",
        views: "2.5万",
        likes: "1.2万",
        category: "astronomy",
        bilibiliUrl: "https://www.bilibili.com/video/BV1xx411c7mD"
    },
    {
        id: 2,
        title: "Python编程实战：从零开始制作个人网站",
        thumbnail: "img/avatar.jpg",
        duration: "28:45",
        views: "3.8万",
        likes: "2.1万",
        category: "tech",
        bilibiliUrl: "https://www.bilibili.com/video/BV1xx411c7mD"
    },
    {
        id: 3,
        title: "自然摄影技巧：捕捉最美的星空与风景",
        thumbnail: "img/avatar.jpg",
        duration: "22:10",
        views: "1.9万",
        likes: "0.9万",
        category: "nature",
        bilibiliUrl: "https://www.bilibili.com/video/BV1xx411c7mD"
    },
    {
        id: 4,
        title: "科技产品开箱：最新智能设备体验分享",
        thumbnail: "img/avatar.jpg",
        duration: "18:20",
        views: "4.2万",
        likes: "2.3万",
        category: "tech",
        bilibiliUrl: "https://www.bilibili.com/video/BV1xx411c7mD"
    },
    {
        id: 5,
        title: "生活Vlog：记录一天的学习与创作",
        thumbnail: "img/avatar.jpg",
        duration: "12:35",
        views: "1.5万",
        likes: "0.8万",
        category: "life",
        bilibiliUrl: "https://www.bilibili.com/video/BV1xx411c7mD"
    },
    {
        id: 6,
        title: "GitHub使用教程：高效管理你的代码项目",
        thumbnail: "img/avatar.jpg",
        duration: "25:40",
        views: "2.8万",
        likes: "1.5万",
        category: "tutorial",
        bilibiliUrl: "https://www.bilibili.com/video/BV1xx411c7mD"
    }
];

const favoriteVideos = [
    {
        id: 101,
        title: "NASA官方：詹姆斯·韦伯望远镜最新发现",
        thumbnail: "img/avatar.jpg",
        duration: "32:15",
        views: "156万",
        likes: "45万",
        category: "astronomy",
        bilibiliUrl: "https://www.bilibili.com/video/BV1xx411c7mD"
    },
    {
        id: 102,
        title: "科技美学：iPhone发展史全面回顾",
        thumbnail: "img/avatar.jpg",
        duration: "45:20",
        views: "89万",
        likes: "32万",
        category: "tech",
        bilibiliUrl: "https://www.bilibili.com/video/BV1xx411c7mD"
    },
    {
        id: 103,
        title: "国家地理：地球最壮观的自然奇观",
        thumbnail: "img/avatar.jpg",
        duration: "38:50",
        views: "67万",
        likes: "28万",
        category: "nature",
        bilibiliUrl: "https://www.bilibili.com/video/BV1xx411c7mD"
    },
    {
        id: 104,
        title: "手工耿：自制全自动早餐机",
        thumbnail: "img/avatar.jpg",
        duration: "15:30",
        views: "234万",
        likes: "78万",
        category: "life",
        bilibiliUrl: "https://www.bilibili.com/video/BV1xx411c7mD"
    },
    {
        id: 105,
        title: "李永乐老师：相对论通俗讲解",
        thumbnail: "img/avatar.jpg",
        duration: "52:10",
        views: "145万",
        likes: "56万",
        category: "tutorial",
        bilibiliUrl: "https://www.bilibili.com/video/BV1xx411c7mD"
    },
    {
        id: 106,
        title: "影视飓风：专业视频拍摄技巧大全",
        thumbnail: "img/avatar.jpg",
        duration: "41:25",
        views: "98万",
        likes: "34万",
        category: "tutorial",
        bilibiliUrl: "https://www.bilibili.com/video/BV1xx411c7mD"
    }
];

// =================================================================
// 2. 核心渲染函数
// =================================================================

/**
 * 获取分类名称
 * @param {string} category - 视频分类键
 * @returns {string} - 对应的中文名称
 */
function getCategoryName(category) {
    const categories = {
        'tech': '科技',
        'astronomy': '天文',
        'nature': '自然',
        'life': '生活',
        'tutorial': '教程'
    };
    return categories[category] || '其他';
}

/**
 * 生成视频卡片HTML
 * @param {object} video - 视频数据对象
 * @param {string} type - 视频类型 ('my' 或 'favorite')
 * @returns {string} - 视频卡片的HTML字符串
 */
function generateVideoCard(video, type = 'my') {
    const thumbnailSrc = video.thumbnail || 'img/avatar.jpg';
    return `
        <div class="video-card" data-category="${video.category}" data-type="${type}" data-url="${video.bilibiliUrl || ''}">
            <div class="video-thumbnail">
                <img src="${thumbnailSrc}" alt="${video.title}" onerror="this.onerror=null;this.src='img/avatar.jpg';">
                <div class="video-duration">${video.duration}</div>
                <div class="video-play-icon"></div>
            </div>
            <div class="video-info">
                <h3 class="video-title">${video.title}</h3>
                <div class="video-meta">
                    <div class="video-stats">
                        <span>👁️ ${video.views}</span>
                        <span>❤️ ${video.likes}</span>
                    </div>
                    <span class="video-category">${getCategoryName(video.category)}</span>
                </div>
            </div>
        </div>
    `;
}

function jsonp(u, t = 10000) {
    return new Promise((resolve, reject) => {
        const cb = '__jsonp_cb_' + Math.random().toString(36).slice(2);
        const sep = u.includes('?') ? '&' : '?';
        const url = u + sep + 'callback=' + cb;
        const s = document.createElement('script');
        let timer = setTimeout(() => { cleanup(); reject(new Error('timeout')); }, t);
        function cleanup() { try { if (s.parentNode) s.parentNode.removeChild(s); } catch {} delete window[cb]; clearTimeout(timer); }
        window[cb] = function (data) { cleanup(); resolve(data); };
        s.src = url;
        s.onerror = () => { cleanup(); reject(new Error('net')); };
        document.head.appendChild(s);
    });
}

function mapCategoryName(name) {
    if (!name) return 'tech';
    const n = String(name);
    if (/天文|星空|宇宙|航天/.test(n)) return 'astronomy';
    if (/自然|摄影|风景|旅行|地理/.test(n)) return 'nature';
    if (/生活|日常|vlog|美食|搞笑/i.test(n)) return 'life';
    if (/教程|科普|教学|课程|学习|技巧/.test(n)) return 'tutorial';
    if (/科技|数码|电子|编程|程序|IT|硬件/.test(n)) return 'tech';
    return 'tech';
}

async function loadBiliMyVideos(mid) {
    const url = `https://api.bilibili.com/x/space/arc/search?mid=${encodeURIComponent(mid)}&pn=1&ps=30&tid=0&keyword=&order=pubdate&jsonp=jsonp`;
    const data = await jsonp(url, 12000);
    const list = (data && data.data && data.data.list && data.data.list.vlist) || [];
    return list.map(v => ({
        id: v.bvid || v.aid,
        title: v.title,
        thumbnail: v.pic && v.pic.startsWith('http') ? v.pic : (v.pic ? ('https:' + v.pic) : 'img/avatar.jpg'),
        duration: v.length || '',
        views: typeof v.play === 'number' ? String(v.play) : (v.play || ''),
        likes: typeof v.video_review === 'number' ? String(v.video_review) : (v.video_review || ''),
        category: mapCategoryName(v.tname || v.tag || ''),
        bilibiliUrl: v.bvid ? `https://www.bilibili.com/video/${v.bvid}` : (v.aid ? `https://www.bilibili.com/video/av${v.aid}` : '')
    }));
}

async function loadBiliFavoriteVideos(fid) {
    const url = `https://api.bilibili.com/x/v3/fav/resource/list?media_id=${encodeURIComponent(fid)}&pn=1&ps=30&order=mtime&type=0&tid=0&jsonp=jsonp`;
    const data = await jsonp(url, 12000);
    const arr = (data && data.data && data.data.medias) || [];
    return arr.map(m => ({
        id: m.bvid || m.id,
        title: m.title,
        thumbnail: m.cover && m.cover.startsWith('http') ? m.cover : (m.cover ? ('https:' + m.cover) : 'img/avatar.jpg'),
        duration: m.duration || '',
        views: m.cnt_info && typeof m.cnt_info.play === 'number' ? String(m.cnt_info.play) : ((m.cnt_info && m.cnt_info.play) || ''),
        likes: m.cnt_info && (typeof m.cnt_info.like === 'number' ? String(m.cnt_info.like) : (m.cnt_info.collect ? String(m.cnt_info.collect) : '')),
        category: mapCategoryName(m.tname || (m.upper && m.upper.name) || ''),
        bilibiliUrl: m.bvid ? `https://www.bilibili.com/video/${m.bvid}` : (m.id ? `https://www.bilibili.com/video/av${m.id}` : '')
    }));
}


/**
 * 渲染我的视频
 */
function renderMyVideos() {
    const container = document.getElementById('myVideosContainer');
    if (!container) return;
    const videosHTML = myVideos.map(video => generateVideoCard(video, 'my')).join('');
    container.innerHTML = videosHTML;
}

/**
 * 渲染收藏视频
 */
function renderFavoriteVideos() {
    const container = document.getElementById('favoriteVideosContainer');
    if (!container) return;
    const videosHTML = favoriteVideos.map(video => generateVideoCard(video, 'favorite')).join('');
    container.innerHTML = videosHTML;
}

// =================================================================
// 3. 筛选功能
// =================================================================

/**
 * 筛选视频卡片
 * @param {string} category - 筛选的分类键
 */
function filterVideos(category) {
    const videoCards = document.querySelectorAll('.video-card');
    videoCards.forEach(card => {
        if (category === 'all' || card.dataset.category === category) {
            // 显示并应用淡入动画
            card.style.display = 'block';
            card.style.opacity = '0';
            card.style.transform = 'translateY(20px)';
            // 使用 setTimeout 确保 display: block 生效后再应用动画
            setTimeout(() => {
                card.style.opacity = '1';
                card.style.transform = 'translateY(0)';
                card.style.transition = 'all 0.3s ease';
            }, 50);
        } else {
            card.style.display = 'none';
        }
    });
}

/**
 * 初始化筛选功能
 */
function initFilter() {
    const filterTags = document.querySelectorAll('.filter-tag');
    filterTags.forEach(tag => {
        tag.addEventListener('click', function() {
            // 更新激活状态
            filterTags.forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            const category = this.dataset.category;
            filterVideos(category);
        });
    });
}

// =================================================================
// 4. 视频交互功能
// =================================================================

/**
 * 初始化视频卡片点击事件
 */
function initVideoInteractions() {
    document.addEventListener('click', function(e) {
        const videoCard = e.target.closest('.video-card');
        if (videoCard) {
            videoCard.style.transform = 'scale(0.95)';
            setTimeout(() => {
                videoCard.style.transform = '';
            }, 150);
            const url = videoCard.getAttribute('data-url') || 'https://space.bilibili.com/510141669';
            window.open(url, '_blank');
        }
    });
}

// =================================================================
// 5. 页面初始化
// =================================================================

/**
 * 初始化滚动动画
 */
function initScrollAnimation() {
    const cards = Array.from(document.querySelectorAll('.video-card'));
    cards.forEach(c => c.classList.add('reveal-up'));
    cards.forEach((c, i) => { setTimeout(() => c.classList.add('in'), i * 60); });
}


/**
 * 页面初始化主函数
 */
async function initVideoPage() {
    const mid = '510141669';
    const fid = '958747369';
    try { const my = await loadBiliMyVideos(mid); if (Array.isArray(my) && my.length) window.myVideos = my; } catch {}
    try { const fav = await loadBiliFavoriteVideos(fid); if (Array.isArray(fav) && fav.length) window.favoriteVideos = fav; } catch {}
    try {
        const r = await fetch('/data/videos.json');
        if (r.ok) {
            const j = await r.json();
            if (Array.isArray(j.my)) window.myVideos = j.my;
            if (Array.isArray(j.favorite)) window.favoriteVideos = j.favorite;
        }
    } catch {}
    renderMyVideos();
    renderFavoriteVideos();
    initFilter();
    initVideoInteractions();
    const navToggle = document.getElementById('navToggle');
    const navMenu = document.querySelector('.navbar__menu');
    if (navToggle && navMenu) {
        navToggle.addEventListener('click', () => { navMenu.classList.toggle('active'); });
    }
    initScrollAnimation();
    document.querySelectorAll('.video-card').forEach(el => el.classList.add('reveal-up'));
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', initVideoPage);

