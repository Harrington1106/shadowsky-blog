/**
 * focus-mode.js - Immersive Focus Mode Logic
 * Handles Timer, Weather, Customization, and the Custom Context Menu for the Homepage.
 */

// --- Global State ---
let focusInterval = null;
let pomodoroInterval = null;
let pomodoroTime = 25 * 60; // 25 minutes in seconds
let isPomodoroRunning = false;

// --- Entry/Exit ---

window.enterFocusMode = function() {
    const container = document.getElementById('focus-mode-container');
    const navbar = document.getElementById('navbar');
    const footer = document.getElementById('home-footer');
    const notice = document.getElementById('home-notice');
    const content = document.querySelector('.pointer-events-auto'); // The main content wrapper

    if (!container) return;

    // Show Container
    container.classList.remove('hidden');
    // Small delay to allow display:block to apply before opacity transition
    setTimeout(() => {
        container.classList.remove('opacity-0', 'scale-95', 'pointer-events-none');
        container.classList.add('opacity-100', 'scale-100', 'pointer-events-auto');
    }, 10);

    // Hide other elements
    if (navbar) navbar.classList.add('-translate-y-full');
    if (footer) footer.classList.add('translate-y-full', 'opacity-0');
    if (notice) notice.classList.add('opacity-0');
    
    // Blur/Fade main content
    if (content) {
        content.classList.add('blur-sm', 'opacity-20', 'pointer-events-none');
    }

    // Start Clock
    updateFocusClock();
    focusInterval = setInterval(updateFocusClock, 1000);

    // Init Widgets
    initWeather();
    updatePomodoroDisplay();
    
    // Sync Theme/Palette
    if (typeof syncTheme === 'function') {
        syncTheme();
    }
}

window.exitFocusMode = function() {
    const container = document.getElementById('focus-mode-container');
    const navbar = document.getElementById('navbar');
    const footer = document.getElementById('home-footer');
    const notice = document.getElementById('home-notice');
    const content = document.querySelector('.pointer-events-auto');

    if (!container) return;

    // Hide Container
    container.classList.remove('opacity-100', 'scale-100', 'pointer-events-auto');
    container.classList.add('opacity-0', 'scale-95', 'pointer-events-none');
    
    setTimeout(() => {
        container.classList.add('hidden');
    }, 700); // Match transition duration

    // Show other elements
    if (navbar) navbar.classList.remove('-translate-y-full');
    if (footer) footer.classList.remove('translate-y-full', 'opacity-0');
    if (notice) notice.classList.remove('opacity-0');

    // Restore main content
    if (content) {
        content.classList.remove('blur-sm', 'opacity-20', 'pointer-events-none');
    }

    // Stop Clock
    if (focusInterval) clearInterval(focusInterval);
}

// --- Clock & Date ---

function updateFocusClock() {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-US', { 
        hour12: false, 
        hour: '2-digit', 
        minute: '2-digit' 
    });
    
    const dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const dateStr = now.toLocaleDateString('zh-CN', dateOptions);

    const clockEl = document.getElementById('focus-clock');
    const dateEl = document.getElementById('focus-date');

    if (clockEl) clockEl.textContent = timeStr;
    if (dateEl) dateEl.textContent = dateStr;
}

// --- Pomodoro Timer ---

window.togglePomodoro = function() {
    const btnIcon = document.querySelector('#pomo-start i');
    const btnText = document.querySelector('#pomo-start span');
    
    if (isPomodoroRunning) {
        // Pause
        clearInterval(pomodoroInterval);
        isPomodoroRunning = false;
        if (btnIcon) btnIcon.setAttribute('data-lucide', 'play');
        if (btnText) btnText.textContent = '继续';
    } else {
        // Start
        pomodoroInterval = setInterval(() => {
            pomodoroTime--;
            updatePomodoroDisplay();
            
            if (pomodoroTime <= 0) {
                clearInterval(pomodoroInterval);
                isPomodoroRunning = false;
                pomodoroTime = 25 * 60; // Reset
                if (btnIcon) btnIcon.setAttribute('data-lucide', 'play');
                if (btnText) btnText.textContent = '开始';
                
                // Play notification sound
                playNotificationSound();
                alert('专注时间结束！休息一下吧。');
            }
        }, 1000);
        isPomodoroRunning = true;
        if (btnIcon) btnIcon.setAttribute('data-lucide', 'pause');
        if (btnText) btnText.textContent = '暂停';
    }
    
    // Refresh icon
    if (window.lucide) window.lucide.createIcons();
}

window.resetPomodoro = function() {
    clearInterval(pomodoroInterval);
    isPomodoroRunning = false;
    pomodoroTime = 25 * 60;
    updatePomodoroDisplay();
    
    const btnIcon = document.querySelector('#pomo-start i');
    const btnText = document.querySelector('#pomo-start span');
    if (btnIcon) btnIcon.setAttribute('data-lucide', 'play');
    if (btnText) btnText.textContent = '开始';
    
    if (window.lucide) window.lucide.createIcons();
}

function updatePomodoroDisplay() {
    const min = Math.floor(pomodoroTime / 60);
    const sec = pomodoroTime % 60;
    const display = `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
    
    const timerEl = document.getElementById('pomodoro-timer');
    if (timerEl) timerEl.textContent = display;
    
    // Also update title if running
    if (isPomodoroRunning) {
        document.title = `${display} - 专注模式`;
    } else {
        document.title = '夏日科技探索';
    }
}

function playNotificationSound() {
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        
        oscillator.type = 'sine';
        oscillator.frequency.value = 880;
        gainNode.gain.value = 0.1;
        
        oscillator.start();
        setTimeout(() => oscillator.stop(), 500);
    } catch (e) {
        console.warn('Audio play failed', e);
    }
}

// --- Weather Widget ---

function initWeather() {
    const weatherContainer = document.getElementById('weather-container');
    
    // Try to get cached weather
    const cachedWeather = localStorage.getItem('focus_weather');
    const cachedTime = localStorage.getItem('focus_weather_time');
    
    if (cachedWeather && cachedTime && (Date.now() - cachedTime < 30 * 60 * 1000)) {
        renderWeather(JSON.parse(cachedWeather));
        return;
    }

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(async (position) => {
            const { latitude, longitude } = position.coords;
            try {
                const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true`);
                const data = await res.json();
                
                const weatherData = {
                    temp: data.current_weather.temperature,
                    code: data.current_weather.weathercode,
                    desc: getWeatherDesc(data.current_weather.weathercode),
                    location: "当前位置"
                };
                
                localStorage.setItem('focus_weather', JSON.stringify(weatherData));
                localStorage.setItem('focus_weather_time', Date.now());
                
                renderWeather(weatherData);
            } catch (err) {
                console.error('Weather fetch failed', err);
                showWeatherError();
            }
        }, (err) => {
            console.warn('Geolocation denied', err);
            showWeatherError('位置权限被拒绝');
        });
    } else {
        showWeatherError('不支持定位');
    }
}

function renderWeather(data) {
    const weatherLoading = document.getElementById('weather-loading');
    const weatherContent = document.getElementById('weather-content');
    
    if (weatherLoading) weatherLoading.classList.add('hidden');
    if (weatherContent) weatherContent.classList.remove('hidden');
    
    const tempEl = document.getElementById('weather-temp');
    const descEl = document.getElementById('weather-desc');
    const locEl = document.querySelector('.location-text');

    if (tempEl) tempEl.textContent = `${Math.round(data.temp)}°`;
    if (descEl) descEl.textContent = data.desc;
    if (locEl) locEl.textContent = data.location;
    
    const iconImg = document.getElementById('weather-icon');
    if (iconImg && !iconImg.getAttribute('src')) {
        iconImg.style.display = 'none';
    }
}

function showWeatherError(msg = '天气暂不可用') {
    const weatherLoading = document.getElementById('weather-loading');
    if (weatherLoading) {
        weatherLoading.innerHTML = `<p class="text-white/50 text-sm">${msg}</p>`;
    }
}

function getWeatherDesc(code) {
    const codes = {
        0: '晴朗', 1: '多云', 2: '多云', 3: '阴',
        45: '雾', 48: '雾凇',
        51: '毛毛雨', 53: '毛毛雨', 55: '毛毛雨',
        61: '小雨', 63: '中雨', 65: '大雨',
        71: '小雪', 73: '中雪', 75: '大雪',
        80: '阵雨', 81: '阵雨', 82: '阵雨',
        95: '雷雨', 96: '雷雨伴有冰雹', 99: '雷雨伴有冰雹'
    };
    return codes[code] || '未知';
}

// --- Customization (Blobs) ---

const PALETTES = {
    // Day Modes
    'water-lilies': ['rgba(107, 140, 206, 0.4)', 'rgba(143, 174, 155, 0.4)', 'rgba(243, 229, 171, 0.4)', 'rgba(74, 111, 165, 0.4)'],
    'sunrise': ['rgba(255, 154, 118, 0.4)', 'rgba(255, 199, 162, 0.4)', 'rgba(168, 170, 188, 0.4)', 'rgba(92, 110, 145, 0.4)'],
    'haystacks': ['rgba(244, 208, 63, 0.4)', 'rgba(230, 126, 34, 0.4)', 'rgba(141, 110, 99, 0.4)', 'rgba(211, 84, 0, 0.4)'],
    
    // Night Modes
    'starry-night': ['rgba(25, 25, 112, 0.5)', 'rgba(72, 61, 139, 0.5)', 'rgba(0, 0, 128, 0.5)', 'rgba(138, 43, 226, 0.3)'],
    'aurora': ['rgba(0, 77, 64, 0.5)', 'rgba(0, 105, 92, 0.5)', 'rgba(38, 166, 154, 0.3)', 'rgba(128, 203, 196, 0.2)'],
    'midnight': ['rgba(33, 33, 33, 0.8)', 'rgba(66, 66, 66, 0.6)', 'rgba(97, 97, 97, 0.4)', 'rgba(117, 117, 117, 0.2)']
};

window.applyPalette = function(name) {
    const colors = PALETTES[name];
    if (colors) {
        document.documentElement.style.setProperty('--blob-color-1', colors[0]);
        document.documentElement.style.setProperty('--blob-color-2', colors[1]);
        document.documentElement.style.setProperty('--blob-color-3', colors[2]);
        document.documentElement.style.setProperty('--blob-color-4', colors[3]);
        
        for (let i = 1; i <= 4; i++) {
            const input = document.querySelector(`input[title="流光 ${i}"]`);
            const display = input?.previousElementSibling;
            if (input && display) {
                display.style.backgroundColor = colors[i-1];
            }
        }
        
        // Save user preference for current session (optional)
        localStorage.setItem('focus_last_palette', name);
    }
}

function syncTheme() {
    const isDark = document.documentElement.classList.contains('dark');
    // If user has manually selected a palette recently, maybe we shouldn't override?
    // But "Sync" implies strict following. Let's auto-switch for best experience.
    if (isDark) {
        applyPalette('starry-night');
    } else {
        applyPalette('water-lilies');
    }
}

// Sync on load
document.addEventListener('DOMContentLoaded', () => {
    // Wait for main.js to init theme
    setTimeout(syncTheme, 100);
});

// Listen for global theme changes
window.addEventListener('themeChange', (e) => {
    syncTheme();
});

window.updateBlobColor = function(index, color) {
    document.documentElement.style.setProperty(`--blob-color-${index}`, color);
    const input = document.querySelector(`input[title="流光 ${index}"]`);
    const display = input?.previousElementSibling;
    if (display) {
        display.style.backgroundColor = color;
    }
}

window.updateAnimationSpeed = function(seconds) {
    const blobs = document.querySelectorAll('.animate-blob');
    blobs.forEach(blob => {
        blob.style.animationDuration = `${seconds}s`;
    });
    const display = document.getElementById('speed-display');
    if (display) display.textContent = `${seconds}s`;
}

// --- Context Menu (Right Click) ---

document.addEventListener('contextmenu', (e) => {
    // Only on Home Page or Focus Mode
    // Check if we are on index.html or root
    const path = window.location.pathname;
    if (path !== '/' && path !== '/index.html') return;

    e.preventDefault();
    const menu = document.getElementById('custom-context-menu');
    if (!menu) return;

    // Position
    let x = e.clientX;
    let y = e.clientY;
    
    // Boundary check
    const rect = menu.getBoundingClientRect();
    if (x + 250 > window.innerWidth) x = window.innerWidth - 260;
    if (y + 300 > window.innerHeight) y = window.innerHeight - 310;

    menu.style.left = `${x}px`;
    menu.style.top = `${y}px`;
    
    // Show
    menu.classList.remove('hidden');
    // Small delay for transition
    setTimeout(() => {
        menu.classList.remove('opacity-0', 'scale-95');
        menu.classList.add('opacity-100', 'scale-100');
    }, 10);
});

// Click elsewhere to close
document.addEventListener('click', (e) => {
    const menu = document.getElementById('custom-context-menu');
    if (menu && !menu.contains(e.target)) {
        window.hideContextMenu();
    }
});

window.hideContextMenu = function() {
    const menu = document.getElementById('custom-context-menu');
    if (menu) {
        menu.classList.add('opacity-0', 'scale-95');
        menu.classList.remove('opacity-100', 'scale-100');
        setTimeout(() => {
             if (menu.classList.contains('opacity-0')) {
                 menu.classList.add('hidden');
             }
        }, 200);
    }
}

window.toggleFullScreen = function() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(e => {
            console.warn(`Error attempting to enable full-screen mode: ${e.message} (${e.name})`);
        });
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        }
    }
}
