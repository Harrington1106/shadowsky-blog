const mediaData = {
    anime: [
        {
            id: 1,
            title: "葬送的芙莉莲",
            cover: "https://images.unsplash.com/photo-1578632767115-351597cf2477?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80",
            status: "watching", // watching, completed, plan, on_hold, dropped
            progress: 8,
            total: 28,
            tag: "更新中"
        },
        {
            id: 2,
            title: "咒术回战 第二季",
            cover: "https://images.unsplash.com/photo-1628151015968-3a4411e03c0a?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80",
            status: "completed",
            progress: 24,
            total: 24,
            tag: "已看完"
        },
        {
            id: 3,
            title: "进击的巨人",
            cover: "https://images.unsplash.com/photo-1541562232579-512a21360020?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80",
            status: "plan",
            progress: 0,
            total: 0,
            tag: "想看"
        },
        {
            id: 4,
            title: "迷宫饭",
            cover: "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80",
            status: "watching",
            progress: 4,
            total: 24,
            tag: "更新中"
        },
        {
            id: 5,
            title: "赛博朋克：边缘行者",
            cover: "https://images.unsplash.com/photo-1519638399535-1b036603ac77?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80",
            status: "completed",
            progress: 10,
            total: 10,
            tag: "已看完"
        },
        {
            id: 6,
            title: "间谍过家家",
            cover: "https://images.unsplash.com/photo-1620608332528-66258f33642d?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80",
            status: "on_hold",
            progress: 12,
            total: 25,
            tag: "搁置"
        },
        {
            id: 7,
            title: "我推的孩子",
            cover: "https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80",
            status: "plan",
            progress: 0,
            total: 11,
            tag: "想看"
        },
        {
            id: 8,
            title: "孤独摇滚！",
            cover: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80",
            status: "completed",
            progress: 12,
            total: 12,
            tag: "已看完"
        }
    ],
    manga: [
        {
            id: 1,
            title: "海贼王",
            cover: "https://images.unsplash.com/photo-1613376023733-0a73315d9b06?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80",
            status: "reading",
            progress: "1089话",
            volume: "Vol.105",
            tag: "连载中"
        },
        {
            id: 2,
            title: "进击的巨人",
            cover: "https://images.unsplash.com/photo-1560972550-aba3456b5564?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80",
            status: "completed",
            progress: "已完结",
            volume: "Vol.34",
            tag: "已读完"
        },
        {
            id: 3,
            title: "电锯人",
            cover: "https://images.unsplash.com/photo-1601850494422-3cf14624b0b3?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80",
            status: "reading",
            progress: "58话",
            volume: "Vol.12",
            tag: "连载中"
        },
        {
            id: 4,
            title: "鬼灭之刃",
            cover: "https://images.unsplash.com/photo-1569701813229-33284b643e3c?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80",
            status: "completed",
            progress: "已完结",
            volume: "Vol.23",
            tag: "已读完"
        },
        {
            id: 5,
            title: "咒术回战",
            cover: "https://images.unsplash.com/photo-1612152605332-94bc53e5e043?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80",
            status: "reading",
            progress: "236话",
            volume: "Vol.24",
            tag: "连载中"
        },
        {
            id: 6,
            title: "葬送的芙莉莲",
            cover: "https://images.unsplash.com/photo-1532012197267-da84d127e765?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80",
            status: "reading",
            progress: "118话",
            volume: "Vol.11",
            tag: "连载中"
        }
    ]
};

class MediaLoader {
    constructor(type, containerId, options = {}) {
        this.type = type; // 'anime' or 'manga'
        this.container = document.getElementById(containerId);
        this.data = mediaData[type] || [];
        this.options = options;
        this.currentFilter = 'all';

        if (this.options.filterContainerId) {
            this.setupFilters(this.options.filterContainerId);
        }

        this.init();
    }

    init() {
        if (!this.container) return;
        this.render();
    }

    setupFilters(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const buttons = container.querySelectorAll('button');
        buttons.forEach(btn => {
            btn.addEventListener('click', () => {
                const filterType = btn.dataset.filter;
                
                // Update UI
                buttons.forEach(b => {
                    b.classList.remove('bg-pink-500', 'bg-orange-500', 'text-white', 'shadow-md', 'scale-105');
                    b.classList.add('bg-gray-100', 'text-gray-600', 'dark:bg-gray-800', 'dark:text-gray-400', 'hover:bg-gray-200', 'dark:hover:bg-gray-700');
                });
                
                const activeColor = this.type === 'anime' ? 'bg-pink-500' : 'bg-orange-500';
                btn.classList.remove('bg-gray-100', 'text-gray-600', 'dark:bg-gray-800', 'dark:text-gray-400', 'hover:bg-gray-200', 'dark:hover:bg-gray-700');
                btn.classList.add(activeColor, 'text-white', 'shadow-md', 'scale-105');
                
                this.filter(filterType);
            });
        });
    }

    filter(status) {
        this.currentFilter = status;
        this.render();
    }

    getStatusColor(status) {
        const colors = {
            'watching': 'bg-pink-500',
            'reading': 'bg-orange-500',
            'completed': 'bg-green-500',
            'plan': 'bg-blue-500',
            'on_hold': 'bg-yellow-500',
            'dropped': 'bg-red-500'
        };
        return colors[status] || 'bg-gray-500';
    }

    getProgressBar(item) {
        if (item.status === 'plan' || !item.total && !item.progress) return '';
        
        const percentage = item.total ? (item.progress / item.total) * 100 : 50;
        const color = this.type === 'anime' ? 'bg-pink-500' : 'bg-orange-500';
        
        return `
            <div class="w-full bg-gray-700 h-1.5 rounded-full overflow-hidden">
                <div class="${color} h-full rounded-full" style="width: ${percentage}%"></div>
            </div>
        `;
    }

    createCard(item) {
        const statusColor = this.getStatusColor(item.status);
        const progressInfo = this.type === 'anime' 
            ? (item.status === 'plan' ? '加入片单' : (item.status === 'completed' ? `全 ${item.total} 话` : `看到第 ${item.progress} 话`))
            : (item.status === 'completed' ? '已读完' : `上次读到第 ${item.progress}`);

        const hoverShadow = this.type === 'anime' ? 'group-hover:shadow-pink-500/20' : 'group-hover:shadow-orange-500/20';
        const hoverText = this.type === 'anime' ? 'group-hover:text-pink-500' : 'group-hover:text-orange-500';
        const bottomInfo = this.type === 'anime' 
            ? `<div class="flex justify-between text-[10px] text-gray-300 mt-1">
                 <span>EP.${String(item.progress).padStart(2, '0')}</span>
                 ${item.total ? `<span>EP.${item.total}</span>` : ''}
               </div>`
            : `<div class="text-xs text-orange-400 font-bold mb-1">${item.volume}</div>
               <div class="text-[10px] text-gray-300">${progressInfo}</div>`;

        // Anime specific bottom overlay content
        const overlayContent = this.type === 'anime'
            ? `<div class="absolute bottom-3 left-3 right-3">
                 ${this.getProgressBar(item)}
                 ${bottomInfo}
               </div>`
            : `<div class="absolute bottom-0 left-0 right-0 p-3 bg-black/60 backdrop-blur-sm">
                 ${bottomInfo}
               </div>`;

        return `
            <div class="group relative media-item" data-title="${item.title}">
                <div class="aspect-[2/3] rounded-xl overflow-hidden mb-3 relative shadow-lg ${hoverShadow} transition-all duration-300">
                    <img src="${item.cover}" alt="${item.title}" class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 ${this.type === 'manga' ? 'grayscale group-hover:grayscale-0' : ''}" loading="lazy">
                    <div class="absolute top-2 right-2 ${statusColor} text-white text-xs font-bold px-2 py-1 rounded-md shadow-md">${item.tag}</div>
                    ${this.type === 'anime' ? '<div class="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-black/80 to-transparent"></div>' : ''}
                    ${overlayContent}
                </div>
                <h3 class="font-bold text-gray-800 dark:text-gray-200 text-sm line-clamp-1 ${hoverText} transition-colors">${item.title}</h3>
                ${this.type === 'anime' ? `<p class="text-xs text-gray-500 mt-1">${progressInfo}</p>` : ''}
            </div>
        `;
    }

    render() {
        let displayData = this.data;

        // Apply filter
        if (this.currentFilter !== 'all') {
            displayData = displayData.filter(item => {
                // Map status to filter categories if needed, or use direct match
                // Status: watching, completed, plan, on_hold, dropped
                // Filters could be: all, watching, completed, plan
                if (this.currentFilter === 'watching') return item.status === 'watching' || item.status === 'reading';
                return item.status === this.currentFilter;
            });
        }

        if (this.options.limit) {
            displayData = displayData.slice(0, this.options.limit);
        }

        this.container.innerHTML = displayData.map(item => this.createCard(item)).join('');
        
        // Add animation
        const cards = this.container.querySelectorAll('.media-item');
        cards.forEach((card, index) => {
            card.style.opacity = '0';
            card.style.transform = 'translateY(20px)';
            setTimeout(() => {
                card.style.transition = 'all 0.5s ease';
                card.style.opacity = '1';
                card.style.transform = 'translateY(0)';
            }, index * 50);
        });
    }
}