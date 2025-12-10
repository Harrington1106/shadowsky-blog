// Video Data
const defaultVideos = [
    {
        id: 1,
        title: "【🐇🐱】村井優X山下瞳月《地球最可爱》",
        thumbnail: "https://i1.hdslb.com/bfs/archive/77d329da1454c5fda5906c2ad291c784cbed9a3d.jpg",
        duration: "01:31",
        views: 1263,
        category: "music",
        type: "bilibili",
        bvid: "BV17j421Q7F1"
    },
    {
        id: 2,
        title: "【村山下】村山美羽X山下瞳月《爱了很久的朋友》",
        thumbnail: "https://i1.hdslb.com/bfs/archive/0b2bc5cefdda75b741af02a486153dd02fe95507.jpg",
        duration: "02:24",
        views: 947,
        category: "amv",
        type: "bilibili",
        bvid: "BV1TQ4y1A7MG"
    },
    {
        id: 3,
        title: "【CGT48】提姆吉兔(练手作)",
        thumbnail: "https://i2.hdslb.com/bfs/archive/77654b9db94e9b75dd817712617ce189fedbb4e1.jpg",
        duration: "01:26",
        views: 464,
        category: "life",
        type: "bilibili",
        bvid: "BV1a34y1A7Hz"
    },
    {
        id: 4,
        title: "【璃花带羽】村山美羽X石森璃花《肯定》",
        thumbnail: "https://i1.hdslb.com/bfs/archive/abef3a9dfbc7c21334b5a620775fd6d051f98435.jpg",
        duration: "01:19",
        views: 5511,
        category: "amv",
        type: "bilibili",
        bvid: "BV1Up4y1E7dV"
    },
    {
        id: 5,
        title: "【谷山】村山美羽X谷口爱季《心跳的证明》",
        thumbnail: "https://i1.hdslb.com/bfs/archive/5bc2cd6efe99d691a74bbf0b144d9efb3136206f.jpg",
        duration: "01:07",
        views: 1346,
        category: "amv",
        type: "bilibili",
        bvid: "BV15z4y1t7TS"
    },
    {
        id: 6,
        title: "【车流 月亮 烟花】记录生活",
        thumbnail: "https://i1.hdslb.com/bfs/archive/c6feed0e8addcb50e40142c71c58b7007b12a8f2.jpg",
        duration: "01:27",
        views: 182,
        category: "life",
        type: "bilibili",
        bvid: "BV1yu411b7mB"
    },
    {
        id: 7,
        title: "【村山下】村山美羽X山下瞳月《悬溺》",
        thumbnail: "https://i0.hdslb.com/bfs/archive/282ad61b5bdc0ceabab4aa78c38c3466fa489ce3.jpg",
        duration: "01:26",
        views: 4228,
        category: "amv",
        type: "bilibili",
        bvid: "BV1TN411r7yv"
    },
    {
        id: 8,
        title: "【W刘】暧昧三十三天",
        thumbnail: "https://i2.hdslb.com/bfs/archive/ee342217734d42280ba803ed1ffad17f695027d0.jpg",
        duration: "00:34",
        views: 323,
        category: "amv",
        type: "bilibili",
        bvid: "BV1yV4y1F76i"
    },
    {
        id: 9,
        title: "【北蔓】阿拉斯加海湾",
        thumbnail: "https://i1.hdslb.com/bfs/archive/4c9826f2facf89674913dc58b5910651ab7594ad.jpg",
        duration: "03:24",
        views: 482,
        category: "amv",
        type: "bilibili",
        bvid: "BV1fF411A7Wx"
    },
    {
        id: 10,
        title: "『北蔓』冯思佳×任蔓琳 《一起去风里吧》",
        thumbnail: "https://i0.hdslb.com/bfs/archive/73be317498a640f495d3d84099f8c5e3c6ab7f8b.jpg",
        duration: "03:22",
        views: 5589,
        category: "music",
        type: "bilibili",
        bvid: "BV1oL4y1F7fV"
    }
];

// Favorite Video Data
const favoriteVideos = [
    {
        id: 101,
        title: "【🐇🐱】村井優X山下瞳月《地球最可爱》",
        thumbnail: "https://i1.hdslb.com/bfs/archive/77d329da1454c5fda5906c2ad291c784cbed9a3d.jpg",
        duration: "01:31",
        views: 1263,
        category: "music",
        type: "bilibili",
        bvid: "BV17j421Q7F1"
    },
    {
        id: 102,
        title: "【村山下】村山美羽X山下瞳月《爱了很久的朋友》",
        thumbnail: "https://i1.hdslb.com/bfs/archive/0b2bc5cefdda75b741af02a486153dd02fe95507.jpg",
        duration: "02:24",
        views: 947,
        category: "amv",
        type: "bilibili",
        bvid: "BV1TQ4y1A7MG"
    },
    {
        id: 103,
        title: "【CGT48】提姆吉兔(练手作)",
        thumbnail: "https://i2.hdslb.com/bfs/archive/77654b9db94e9b75dd817712617ce189fedbb4e1.jpg",
        duration: "01:26",
        views: 464,
        category: "life",
        type: "bilibili",
        bvid: "BV1a34y1A7Hz"
    }
];

class VideoLoader {
    constructor(options = {}) {
        this.containerId = options.containerId || 'video-grid';
        this.container = document.getElementById(this.containerId);
        this.filterContainer = document.querySelector('.filter-container'); // Only main loader should handle filters?
        this.videos = options.videos || [...defaultVideos];
        this.currentCategory = options.initialCategory || 'all';
        this.options = options;
        
        this.categoryMap = {
            'all': '全部',
            'amv': 'AMV/MAD',
            'music': '翻唱/宅舞',
            'game': '游戏',
            'live': '现场/Live',
            'life': '生活',
            'other': '其他',
            'anime': '动漫'
        };

        this.init();
    }

    async init() {
        // Deduplicate categories by normalizing to lowercase
        this.videos.forEach(v => {
            if (v.category) v.category = v.category.toLowerCase();
        });

        this.renderVideos();
        // Only setup filters if filterContainer exists and we are the main loader (or based on options)
        if (this.filterContainer && this.containerId === 'video-grid') {
            this.setupFilters();
        }
        this.setupVideoModal();
    }

    createVideoCard(video) {
        // Unique ID for play call to avoid conflicts if multiple loaders exist
        // We can pass the loader instance or make playVideo static/global?
        // Better: make playVideo a method of the instance and use a global registry or event.
        // For simplicity, we'll keep using the global playVideo but we need to find the video in ALL lists.
        // Or we can attach the click handler directly in JS instead of HTML onclick attribute.
        
        const cardId = `video-card-${this.containerId}-${video.id}`;
        
        // Proxy Bilibili images to bypass 403
        const getProxyUrl = (url) => {
            if (url && (url.includes('hdslb.com') || url.includes('bilibili.com'))) {
                return `https://images.weserv.nl/?url=${encodeURIComponent(url)}`;
            }
            return url;
        };
        const thumbnailUrl = getProxyUrl(video.thumbnail);
        
        return `
            <div class="group cursor-pointer video-item perspective-1000" 
                 id="${cardId}"
                 data-category="${video.category}" 
                 data-id="${video.id}"
                 data-title="${video.title}"
                 data-bvid="${video.bvid}"
                 data-loader-id="${this.containerId}">
                <div class="relative aspect-video bg-gray-900 rounded-xl overflow-hidden mb-4 border border-gray-200 dark:border-gray-800 group-hover:border-pink-500 dark:group-hover:border-pink-500 transition-all duration-500 shadow-md group-hover:shadow-xl group-hover:shadow-pink-500/20 group-hover:-translate-y-1 transform">
                    <img 
                        src="${thumbnailUrl}" 
                        alt="${video.title}" 
                        class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 opacity-90 group-hover:opacity-100"
                        loading="lazy"
                        referrerpolicy="no-referrer"
                    >
                    <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60 group-hover:opacity-40 transition-opacity duration-300"></div>
                    
                    <div class="absolute bottom-3 right-3 bg-black/70 backdrop-blur-sm text-white text-xs px-2 py-1 rounded-md flex items-center border border-white/10">
                        <i data-lucide="clock" class="w-3 h-3 mr-1"></i>
                        ${video.duration}
                    </div>
                    
                    <div class="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 scale-50 group-hover:scale-100">
                        <div class="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center border border-white/40 shadow-lg">
                            <i data-lucide="play" class="w-6 h-6 text-white fill-current"></i>
                        </div>
                    </div>
                </div>
                <h3 class="font-bold text-gray-800 dark:text-gray-100 text-lg leading-tight mb-2 line-clamp-2 group-hover:text-pink-600 dark:group-hover:text-pink-400 transition-colors">${video.title}</h3>
                <div class="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
                    <div class="flex items-center space-x-3">
                        <span class="flex items-center">
                            <i data-lucide="play-circle" class="w-3.5 h-3.5 mr-1"></i>
                            ${video.views}
                        </span>
                    </div>
                </div>
            </div>
        `;
    }

    renderVideos() {
        if (!this.container) return;
        
        if (this.videos.length === 0) {
            this.container.innerHTML = `
                <div class="col-span-full text-center py-20">
                    <div class="inline-block p-6 rounded-full bg-gray-100 dark:bg-gray-800 mb-4">
                        <i data-lucide="video-off" class="w-12 h-12 text-gray-400"></i>
                    </div>
                    <h3 class="text-xl font-bold text-gray-700 dark:text-gray-300 mb-2">暂无视频数据</h3>
                    <p class="text-gray-500 dark:text-gray-400 max-w-md mx-auto">
                        暂无视频。
                    </p>
                </div>
            `;
            if (window.lucide) window.lucide.createIcons();
            return;
        }
        
        const filteredVideos = this.currentCategory === 'all' 
            ? this.videos 
            : this.videos.filter(v => v.category === this.currentCategory);
            
        // Apply limit if specified in data attribute
        const displayVideos = this.container.dataset.limit 
            ? filteredVideos.slice(0, parseInt(this.container.dataset.limit)) 
            : filteredVideos;
            
        this.container.innerHTML = displayVideos.map(v => this.createVideoCard(v)).join('');
        
        // Add event listeners for click
        this.container.querySelectorAll('.video-item').forEach(item => {
            item.addEventListener('click', () => {
                const id = parseInt(item.dataset.id);
                this.playVideo(id);
            });
        });
        
        // Re-initialize icons for the new content
        if (window.lucide) {
            window.lucide.createIcons();
        }
        
        // Add animation class
        const cards = this.container.querySelectorAll('.video-item');
        cards.forEach((card, index) => {
            card.style.opacity = '0';
            card.style.transform = 'translateY(20px)';
            setTimeout(() => {
                card.style.transition = 'all 0.5s ease';
                card.style.opacity = '1';
                card.style.transform = 'translateY(0)';
            }, index * 100);
        });
    }

    setupFilters() {
        if (!this.filterContainer) return;

        // Get unique categories
        const categories = ['all', ...new Set(this.videos.map(v => v.category))];
        
        // Generate navigation items HTML
        this.filterContainer.innerHTML = categories.map(cat => {
            const displayName = this.categoryMap[cat] || cat.charAt(0).toUpperCase() + cat.slice(1);
            const isActive = cat === this.currentCategory;
            return `
                <button class="filter-btn relative px-1 py-2 text-sm font-medium transition-colors duration-300 group whitespace-nowrap ${isActive ? 'text-pink-600 dark:text-pink-400' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'}" data-category="${cat}">
                    ${displayName}
                    <span class="absolute bottom-0 left-0 w-full h-0.5 bg-pink-500 rounded-full transform origin-left transition-transform duration-300 ${isActive ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'}"></span>
                </button>
            `;
        }).join('');

        this.filterBtns = this.filterContainer.querySelectorAll('.filter-btn');

        // Event Listeners
        this.filterBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const target = e.target.closest('button');
                const category = target.dataset.category;
                
                // Update UI
                this.filterBtns.forEach(b => {
                    const span = b.querySelector('span');
                    
                    if (b === target) {
                        b.className = 'filter-btn relative px-1 py-2 text-sm font-medium transition-colors duration-300 group whitespace-nowrap text-pink-600 dark:text-pink-400';
                        span.classList.remove('scale-x-0', 'group-hover:scale-x-100');
                        span.classList.add('scale-x-100');
                    } else {
                        b.className = 'filter-btn relative px-1 py-2 text-sm font-medium transition-colors duration-300 group whitespace-nowrap text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200';
                        span.classList.remove('scale-x-100');
                        span.classList.add('scale-x-0', 'group-hover:scale-x-100');
                    }
                });
                
                this.currentCategory = category;
                this.renderVideos();
            });
        });
    }

    setupVideoModal() {
        // Create modal element if it doesn't exist
        if (!document.getElementById('video-modal')) {
            const modalHTML = `
                <div id="video-modal" class="fixed inset-0 z-[100] hidden flex items-center justify-center bg-black/95 backdrop-blur-md opacity-0 transition-opacity duration-300">
                    <div class="relative w-full max-w-5xl mx-4 transform scale-95 transition-transform duration-300" id="video-modal-content">
                        <button id="close-modal" class="absolute -top-12 right-0 text-white hover:text-pink-500 transition-colors flex items-center group">
                            <span class="mr-2 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">关闭</span>
                            <i data-lucide="x" class="w-8 h-8"></i>
                        </button>
                        
                        <div id="video-player-container" class="aspect-video bg-black rounded-xl overflow-hidden shadow-2xl ring-1 ring-white/10 flex items-center justify-center relative">
                            <!-- Video content will be injected here -->
                            <div class="text-center p-8">
                                <div class="w-16 h-16 border-4 border-pink-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                                <p class="text-gray-400">Loading...</p>
                            </div>
                        </div>
                        
                        <div class="mt-4">
                            <h3 id="modal-video-title" class="text-xl font-bold text-white mb-1"></h3>
                            <div class="flex items-center text-sm text-gray-400">
                                <span class="bg-pink-600 text-white text-xs px-2 py-0.5 rounded mr-3">Bilibili</span>
                                <span id="modal-video-views"></span>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            document.body.insertAdjacentHTML('beforeend', modalHTML);
        }

        this.modal = document.getElementById('video-modal');
        this.modalContent = document.getElementById('video-modal-content');
        this.playerContainer = document.getElementById('video-player-container');
        this.closeBtn = document.getElementById('close-modal');
        this.modalTitle = document.getElementById('modal-video-title');
        this.modalViews = document.getElementById('modal-video-views');

        if (this.closeBtn) {
            this.closeBtn.addEventListener('click', () => this.closeVideo());
        }

        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) this.closeVideo();
        });

        // Close on Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !this.modal.classList.contains('hidden')) {
                this.closeVideo();
            }
        });
    }

    playVideo(id) {
        const video = this.videos.find(v => v.id === id);
        if (!video) return;

        if (this.modal) {
            this.modalTitle.textContent = video.title;
            this.modalViews.textContent = `${video.views} 次播放`;
            
            this.modal.classList.remove('hidden');
            // Trigger reflow
            void this.modal.offsetWidth;
            this.modal.classList.remove('opacity-0');
            this.modalContent.classList.remove('scale-95');
            this.modalContent.classList.add('scale-100');
            document.body.style.overflow = 'hidden'; // Prevent scrolling
            
            // Inject Bilibili Player with cleaner parameters
            if (video.type === 'bilibili' && video.bvid) {
                // Use the mobile player which is more stable and less likely to be blocked (403)
                // Note: We avoid high_quality=1 as it triggers buffering or 403 Forbidden errors for guest users
                this.playerContainer.innerHTML = `
                    <iframe 
                        src="https://www.bilibili.com/blackboard/html5mobileplayer.html?bvid=${video.bvid}&page=1&as_wide=1&danmaku=0" 
                        scrolling="no" 
                        border="0" 
                        frameborder="no" 
                        framespacing="0" 
                        allowfullscreen="true" 
                        sandbox="allow-top-navigation allow-same-origin allow-forms allow-scripts allow-popups allow-presentation allow-modals"
                        referrerpolicy="no-referrer"
                        class="w-full h-full absolute top-0 left-0"
                    ></iframe>
                `;
            } else {
                // Fallback for demo
                this.playerContainer.innerHTML = `
                    <div class="text-center p-8 w-full">
                        <div class="w-20 h-20 bg-pink-600/20 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                            <i data-lucide="play" class="w-10 h-10 text-pink-500"></i>
                        </div>
                        <h3 class="text-2xl font-bold text-white mb-2">${video.title}</h3>
                        <p class="text-gray-400">视频播放演示模式</p>
                    </div>
                `;
                if (window.lucide) window.lucide.createIcons();
            }
            
            if (window.lucide) window.lucide.createIcons();
        }
    }

    closeVideo() {
        if (this.modal) {
            this.modal.classList.add('opacity-0');
            this.modalContent.classList.remove('scale-100');
            this.modalContent.classList.add('scale-95');
            
            setTimeout(() => {
                this.modal.classList.add('hidden');
                document.body.style.overflow = '';
                // Clear iframe to stop playback
                this.playerContainer.innerHTML = '';
            }, 300);
        }
    }
}

// Initialize on load
function initVideoLoader() {
    // Check if container exists
    if (document.getElementById('video-grid')) {
        // Main video loader
        if (!window.videoLoaderInstance) {
            const options = window.videoLoaderOptions || {};
            window.videoLoaderInstance = new VideoLoader({
                ...options,
                containerId: 'video-grid'
            });
        }
    }
    
    if (document.getElementById('favorite-video-grid')) {
        // Favorite video loader
        if (!window.favoriteVideoLoaderInstance) {
            window.favoriteVideoLoaderInstance = new VideoLoader({
                containerId: 'favorite-video-grid',
                videos: favoriteVideos
            });
        }
    }
}

// Handle initial load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initVideoLoader);
} else {
    initVideoLoader();
}

// Handle bfcache restore
window.addEventListener('pageshow', (event) => {
    if (event.persisted) {
        // If restored from cache, ensure everything is active
        initVideoLoader();
        
        if (window.videoLoaderInstance && window.videoLoaderInstance.modal) {
            window.videoLoaderInstance.closeVideo();
        }
        if (window.favoriteVideoLoaderInstance && window.favoriteVideoLoaderInstance.modal) {
            window.favoriteVideoLoaderInstance.closeVideo();
        }
    }
});
