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
        <div class="video-card" data-category="${video.category}" data-type="${type}">
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
            // 查找对应的视频数据
            const videoTitle = videoCard.querySelector('.video-title').textContent;
            const videoType = videoCard.dataset.type;
            const sourceArray = videoType === 'my' ? myVideos : favoriteVideos;
            const videoData = sourceArray.find(v => v.title === videoTitle);

            // 添加点击反馈
            videoCard.style.transform = 'scale(0.95)';
            setTimeout(() => {
                videoCard.style.transform = '';
            }, 150);

            // 跳转到B站视频页面（如果URL存在）
            if (videoData && videoData.bilibiliUrl) {
                window.open(videoData.bilibiliUrl, '_blank');
            } else {
                console.log('播放视频:', videoTitle, ' - URL未找到');
            }
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
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    // 观察视频卡片
    setTimeout(() => {
        const videoCards = document.querySelectorAll('.video-card');
        videoCards.forEach((card, index) => {
            // 确保只对未隐藏的卡片添加动画延迟
            if (card.style.display !== 'none') {
                card.style.opacity = '0';
                card.style.transform = 'translateY(30px)';
                card.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
                card.style.transitionDelay = `${index * 0.1}s`;
                observer.observe(card);
            }
        });
    }, 100);
}


/**
 * 页面初始化主函数
 */
function initVideoPage() {
    fetch('/data/videos.json').then(r=>r.ok?r.json():null).catch(()=>null).then(j=>{
        if (j) {
            if (Array.isArray(j.my)) window.myVideos = j.my;
            if (Array.isArray(j.favorite)) window.favoriteVideos = j.favorite;
        }
        renderMyVideos();
        renderFavoriteVideos();
        initFilter();
        initVideoInteractions();
        const navToggle = document.getElementById("navToggle");
        const navMenu = document.querySelector(".navbar-menu");
        if (navToggle && navMenu) {
            navToggle.addEventListener("click", () => { navMenu.classList.toggle("active"); });
        }
        initScrollAnimation();
        document.querySelectorAll('.video-card').forEach(el => el.classList.add('reveal-up'));
    });
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', initVideoPage);

