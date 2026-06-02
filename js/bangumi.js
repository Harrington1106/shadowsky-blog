/**
 * Bangumi Data Fetcher (Enhanced)
 * Fetches anime, manga, profile, and calendar data from local API proxy
 */

document.addEventListener('DOMContentLoaded', () => {
    fetchBangumiData();
});

async function fetchBangumiData() {
    const containers = {
        anime: document.getElementById('home-anime-grid'),
        manga: document.getElementById('home-manga-grid'),
        profile: document.getElementById('bangumi-profile'),
        calendar: document.getElementById('calendar-container'),
        animeCompleted: document.getElementById('home-anime-completed-grid')
    };

    try {
        let data = null;
        const endpoints = [
            'http://47.118.28.27/api/bangumi.php', // Aliyun
            'http://localhost:3000/api/bangumi.php'
        ];
        
        // 1. Try Dynamic API
        for (let i = 0; i < endpoints.length; i++) {
            try {
                const response = await fetch(endpoints[i], { headers: { 'Accept': 'application/json' } });
                if (response.ok) { 
                    data = await response.json(); 
                    console.log(`[Bangumi] Loaded from API: ${endpoints[i]}`);
                    break; 
                }
            } catch (e) {
                console.warn(`[Bangumi] API failed: ${endpoints[i]}`, e);
            }
        }

        // 2. Fallback to Static Data (media.json) if API fails
        if (!data) {
            console.warn('[Bangumi] All APIs failed, falling back to static media.json');
            try {
                const staticResponse = await fetch('public/data/media.json');
                if (staticResponse.ok) {
                    const staticData = await staticResponse.json();
                    data = transformStaticData(staticData);
                }
            } catch (e) {
                console.error('[Bangumi] Static fallback failed', e);
            }
        }

        if (!data) {
            console.error('[Bangumi] All data sources failed');
            return;
        }

        if (data.error) {
            console.error('Bangumi API Error:', data.error);
            showError(containers.anime);
            showError(containers.manga);
            return;
        }

        // 1. Render Profile
        if (data.user && containers.profile) {
            renderProfile(containers.profile, data.user);
        }

        // 2. Render Calendar (Daily Schedule)
        if (data.calendar && containers.calendar) {
            renderCalendar(containers.calendar, data.calendar);
            document.getElementById('bangumi-calendar').classList.remove('hidden');
        }

        // 3. Render Anime Watching
        if (containers.anime) {
            renderGrid(containers.anime, data.anime_watching, 'anime');
        }

        // 4. Render Anime Completed
        if (data.anime_completed && data.anime_completed.length > 0 && containers.animeCompleted) {
            renderGrid(containers.animeCompleted, data.anime_completed, 'anime', true);
            document.getElementById('anime-completed-section').classList.remove('hidden');
        }

        // 5. Render Manga Reading
        if (containers.manga) {
            renderGrid(containers.manga, data.manga_reading, 'manga');
        }

    } catch (error) {
        console.error('Error in fetchBangumiData:', error);
        return;
    }
}

// Helper to transform static media.json to API format
function transformStaticData(staticData) {
    return {
        user: {
            nickname: 'ShadowSky',
            username: 'shadowsky',
            sign: 'Data loaded from static backup',
            avatar: { large: 'public/img/avatar.jpg', medium: 'public/img/avatar.jpg' },
            url: '#'
        },
        calendar: [], // Static data doesn't have calendar
        anime_watching: (staticData.anime || []).filter(item => item.status === 'watching' || item.status === 'reading'),
        anime_completed: (staticData.anime || []).filter(item => item.status === 'completed'),
        manga_reading: (staticData.manga || []).filter(item => item.status === 'reading')
    };
}

function renderProfile(container, user) {
    const avatar = user.avatar?.large || user.avatar?.medium || 'public/img/avatar.jpg';
    const nickname = user.nickname || user.username;
    const sign = user.sign || '暂无签名';
    const url = user.url || `https://bgm.tv/user/${user.username}`;
    
    // Background using banner if available, else a gradient
    const bannerStyle = `background: linear-gradient(to right, #ec4899, #8b5cf6)`; 
    // Bangumi API doesn't always give user banner, so we stick to a nice gradient

    container.innerHTML = `
        <div class="relative rounded-2xl overflow-hidden bg-white dark:bg-gray-800 shadow-xl border border-gray-100 dark:border-gray-700">
            <div class="h-32 w-full" style="${bannerStyle}"></div>
            <div class="px-6 pb-6 relative">
                <div class="flex flex-col sm:flex-row items-center sm:items-end -mt-12 mb-4">
                    <a href="${url}" target="_blank" class="relative group">
                        <img src="${avatar}" alt="${nickname}" class="w-24 h-24 rounded-full border-4 border-white dark:border-gray-800 shadow-lg object-cover group-hover:scale-105 transition-transform">
                        <div class="absolute inset-0 rounded-full border-4 border-transparent group-hover:border-pink-500/30 transition-colors"></div>
                    </a>
                    <div class="mt-4 sm:mt-0 sm:ml-4 text-center sm:text-left flex-1">
                        <h2 class="text-2xl font-bold text-gray-900 dark:text-white flex items-center justify-center sm:justify-start gap-2">
                            ${nickname}
                            <a href="${url}" target="_blank" class="text-xs font-normal text-pink-500 bg-pink-50 dark:bg-pink-900/20 px-2 py-1 rounded-full hover:bg-pink-100 dark:hover:bg-pink-900/40 transition-colors">
                                @${user.username}
                            </a>
                        </h2>
                        <p class="text-sm text-gray-500 dark:text-gray-400 mt-1 max-w-lg line-clamp-1">${sign}</p>
                    </div>
                    <div class="mt-4 sm:mt-0 flex gap-3">
                         <a href="https://bgm.tv/user/${user.username}/collections" target="_blank" class="flex flex-col items-center px-4 py-2 rounded-lg bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                            <span class="text-xs text-gray-500 dark:text-gray-400">Bangumi</span>
                            <span class="font-bold text-gray-900 dark:text-white">主页</span>
                         </a>
                    </div>
                </div>
            </div>
        </div>
    `;
    if (window.lucide) window.lucide.createIcons();
}

function renderCalendar(container, calendarData) {
    // Bangumi Calendar returns array of { weekday: {en: 'Mon', cn: '周一', ...}, items: [...] }
    // We want to show "Today" first or just the whole week?
    // Let's show Today's items + Next few days? 
    // Or just a horizontal list of "Airing Now" sorted by time? 
    // The API structure is: [ { weekday: {...}, items: [...] }, ... ] ordered Mon-Sun.
    
    const todayIndex = new Date().getDay(); // 0 (Sun) - 6 (Sat)
    // Map JS day (0=Sun, 1=Mon) to Bangumi array index (Mon=0, ..., Sun=6)
    // JS: 0=Sun, 1=Mon...
    // Bangumi: 0=Mon, ..., 6=Sun
    let bgmIndex = todayIndex === 0 ? 6 : todayIndex - 1;
    
    // Find today's data
    const todayData = calendarData[bgmIndex];
    if (!todayData || !todayData.items) return;

    // Sort items? They are usually just a list.
    const items = todayData.items;

    container.innerHTML = items.map(item => {
        const name = item.name_cn || item.name;
        const image = item.images?.common || item.images?.grid || item.images?.medium || 'public/img/no-cover.jpg';
        const url = item.url || `https://bgm.tv/subject/${item.id}`;
        
        return `
            <a href="${url}" target="_blank" class="flex-none w-32 group" title="${name}">
                <div class="aspect-[2/3] rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 relative mb-2 shadow-sm group-hover:shadow-md transition-all">
                    <img src="${image}" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" loading="lazy">
                    <div class="absolute top-1 right-1 bg-black/60 text-white text-[10px] px-1.5 rounded backdrop-blur-sm">
                        Today
                    </div>
                </div>
                <h4 class="text-xs font-medium text-gray-700 dark:text-gray-300 line-clamp-2 group-hover:text-pink-500 transition-colors">${name}</h4>
            </a>
        `;
    }).join('');
}

function showError(container) {
    return;
}

function renderGrid(container, items, type, isCompact = false) {
    if (!items || items.length === 0) {
        container.innerHTML = `
            <div class="col-span-full flex flex-col items-center justify-center py-10 text-gray-500 dark:text-gray-400">
                <i data-lucide="coffee" class="w-8 h-8 mb-2"></i>
                <span class="text-sm">暂时没有内容</span>
            </div>
        `;
        if (window.lucide) window.lucide.createIcons();
        return;
    }

    container.innerHTML = items.map(item => {
        const subject = item.subject;
        const title = subject.name_cn || subject.name;
        const cover = subject.images?.large || subject.images?.common || subject.images?.medium || 'public/img/no-cover.jpg';
        const url = `https://bgm.tv/subject/${subject.id}`;
        
        let progress = '';
        if (type === 'anime') {
            const total = subject.eps ? ` / ${subject.eps}` : '';
            progress = `看到 ${item.ep_status}${total}`;
        } else {
            const vol = item.vol_status ? `卷${item.vol_status}` : '';
            progress = `读到 ${item.ep_status} 话`;
        }
        
        // For completed items, just show score or "Completed"
        if (isCompact) {
             progress = subject.score ? `★ ${subject.score}` : '已看完';
        }

        const scoreBadge = subject.score && !isCompact ? `<span class="absolute top-2 right-2 bg-pink-500 text-white text-[10px] px-1.5 py-0.5 rounded shadow-sm font-bold">${subject.score}</span>` : '';

        // Compact Mode (Smaller cards)
        if (isCompact) {
            return `
                <a href="${url}" target="_blank" class="group relative block" title="${title}">
                    <div class="relative aspect-[2/3] rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-800 transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-md">
                        <img src="${cover}" alt="${title}" loading="lazy" class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 opacity-90 group-hover:opacity-100 grayscale group-hover:grayscale-0">
                        <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-80"></div>
                        <div class="absolute bottom-0 left-0 right-0 p-2">
                            <div class="text-[10px] text-gray-300 truncate text-center">${progress}</div>
                        </div>
                    </div>
                </a>
            `;
        }

        // Standard Mode
        return `
            <a href="${url}" target="_blank" class="group relative block video-item" title="${title}">
                <div class="relative aspect-[2/3] rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-800 transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-lg group-hover:shadow-pink-500/20 group-hover:border-pink-500/50">
                    <img src="${cover}" alt="${title}" loading="lazy" class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110">
                    
                    <div class="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-60 group-hover:opacity-80 transition-opacity duration-300"></div>
                    
                    ${scoreBadge}

                    <div class="absolute bottom-0 left-0 right-0 p-3 transform translate-y-1 group-hover:translate-y-0 transition-transform duration-300">
                        <h3 class="text-white text-sm font-bold leading-tight line-clamp-2 mb-1 drop-shadow-md">${title}</h3>
                        <div class="flex items-center text-xs text-gray-300">
                            <span class="truncate">${progress}</span>
                        </div>
                    </div>
                </div>
            </a>
        `;
    }).join('');
    
    if (window.lucide) window.lucide.createIcons();
}
