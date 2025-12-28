const mediaData = null; // Deprecated, data is now loaded from public/data/media.json

class MediaLoader {
    constructor(type, containerId, options = {}) {
        this.type = type; // 'anime' or 'manga'
        this.container = document.getElementById(containerId);
        this.data = [];
        this.options = options;
        this.currentFilter = 'all';

        if (this.options.filterContainerId) {
            this.setupFilters(this.options.filterContainerId);
        }

        this.init();
    }

    async init() {
        if (!this.container) return;
        await this.loadData();
        this.render();
    }

    async loadData() {
        try {
            const response = await fetch('public/data/media.json');
            if (!response.ok) throw new Error('Failed to load media data');
            const allData = await response.json();
            this.data = allData[this.type] || [];
        } catch (error) {
            console.error('Error loading media data:', error);
            // Show error state in container
            if (this.container) {
                this.container.innerHTML = `<div class="col-span-full text-center text-red-500 py-10">Failed to load data. Please try again later.</div>`;
            }
        }
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

    getStatusText(status) {
        const texts = {
            'watching': this.type === 'anime' ? '在看' : '在读',
            'reading': '在读',
            'completed': this.type === 'anime' ? '看过' : '读过',
            'plan': this.type === 'anime' ? '想看' : '想读',
            'on_hold': '搁置',
            'dropped': '抛弃'
        };
        return texts[status] || '未知';
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
        const statusText = this.getStatusText(item.status);
        
        // Use provided tag or fallback to status text
        // STRICTLY handle undefined/null/empty strings
        let displayTag = item.tag;
        if (!displayTag || displayTag === 'undefined' || displayTag.trim() === '') {
            displayTag = statusText;
        }

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
            : `<div class="text-xs text-orange-400 font-bold mb-1">${item.volume || ''}</div>
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
                    <div class="absolute top-2 right-2 ${statusColor} text-white text-xs font-bold px-2 py-1 rounded-md shadow-md z-10 max-w-[80%] truncate">${displayTag}</div>
                    ${this.type === 'anime' ? '<div class="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-black/80 to-transparent"></div>' : ''}
                    ${overlayContent}
                </div>
                <h3 class="font-bold text-gray-800 dark:text-gray-200 text-sm line-clamp-1 ${hoverText} transition-colors" title="${item.title}">${item.title}</h3>
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