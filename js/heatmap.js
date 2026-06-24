/**
 * Premium Heatmap Chart Component
 * "The Ocean Grid" - A high-fidelity, aesthetic contribution graph.
 */
class HeatmapChart {
    constructor(container, options = {}) {
        this.container = typeof container === 'string' ? document.getElementById(container) : container;
        if (!this.container) {
            console.error('Heatmap container not found');
            return;
        }

        this.options = Object.assign({
            // 内联颜色 — 不依赖 Tailwind CDN
            colors: {
                light: ['#e2e8f0','#99f6e4','#5eead4','#2dd4bf','#14b8a6','#0d9488','#0f766e'],
                dark:  ['rgba(255,255,255,.04)','rgba(20,184,166,.12)','rgba(20,184,166,.22)','rgba(20,184,166,.35)','rgba(45,212,191,.5)','rgba(45,212,191,.68)','rgba(94,234,212,.85)']
            },
            cellSize: 11,       // Refined size
            cellGap: 4,         // Airy
            borderRadius: '3px', // Friendly rounded corners
            year: '2026',
            startOfWeek: 1,     // Monday
            onClick: null,
            tooltipFn: null
        }, options);

        this.tooltip = null;
        this.resizeObserver = null;
        this.initStyles();
        this.initTooltip();
        this.initResizeObserver();
        this.initGlobalEvents();
    }

    initGlobalEvents() {
        // Close tooltip on interaction outside
        const closeHandler = (e) => {
            if (this.tooltip && !this.tooltip.classList.contains('opacity-0')) {
                // If click is not on a cell
                if (!e.target.closest('.heatmap-cell')) {
                    this.hideTooltip();
                }
            }
        };
        document.addEventListener('touchstart', closeHandler, { passive: true });
        document.addEventListener('click', closeHandler);
    }

    initResizeObserver() {
        if (this.resizeObserver) this.resizeObserver.disconnect();
        this.resizeObserver = new ResizeObserver(() => {
            if (this.resizeTimeout) clearTimeout(this.resizeTimeout);
            this.resizeTimeout = setTimeout(() => {
                if (this.options.year === 'rolling' && this.lastData) {
                    this.render(this.lastData, 'rolling');
                }
            }, 200);
        });
        // Observe parent to avoid self-loop (rendering changes container size -> triggers observer -> renders again)
        this.resizeObserver.observe(this.container.parentElement || this.container);
    }
    
    initStyles() {
        if (document.getElementById('heatmap-styles')) return;
        const style = document.createElement('style');
        style.id = 'heatmap-styles';
        style.textContent = `
            .heatmap-scroll-area::-webkit-scrollbar { height: 0px; } /* Hidden scrollbar for clean look */
            .heatmap-scroll-area { -ms-overflow-style: none; scrollbar-width: none; }
            
            @keyframes cell-enter {
                0% { opacity: 0; transform: scale(0.5) translateY(10px); }
                100% { opacity: 1; transform: scale(1) translateY(0); }
            }

            @keyframes legend-enter {
                from { opacity: 0; transform: translateY(5px); }
                to { opacity: 1; transform: translateY(0); }
            }
            
            .heatmap-cell {
                transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
            }
            
            .heatmap-cell:hover {
                transform: scale(1.3);
                z-index: 10;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
            }
            
            .dark .heatmap-cell:hover {
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
            }

            .heatmap-cell.dimmed {
                opacity: 0.2 !important;
                transform: scale(0.9);
            }
            
            .heatmap-label {
                font-family: 'Inter', system-ui, sans-serif;
                letter-spacing: 0.02em;
            }

            /* Tooltip Arrow */
            #heatmap-tooltip::after {
                content: '';
                position: absolute;
                top: 100%;
                left: 50%;
                margin-left: -5px;
                border-width: 5px;
                border-style: solid;
                border-color: rgba(255, 255, 255, 0.9) transparent transparent transparent;
            }
            .dark #heatmap-tooltip::after {
                border-color: rgba(15, 23, 42, 0.9) transparent transparent transparent;
            }
        `;
        document.head.appendChild(style);
    }

    initTooltip() {
        if (document.getElementById('heatmap-tooltip')) {
            this.tooltip = document.getElementById('heatmap-tooltip');
            return;
        }

        this.tooltip = document.createElement('div');
        this.tooltip.id = 'heatmap-tooltip';
        // Glassmorphism Tooltip
        this.tooltip.className = 'fixed z-[100] px-4 py-2.5 bg-white/90 dark:bg-slate-900/90 text-slate-800 dark:text-white text-xs rounded-xl shadow-2xl shadow-blue-900/10 pointer-events-none opacity-0 transition-all duration-200 backdrop-blur-xl border border-white/20 dark:border-white/10 font-medium transform -translate-x-1/2 -translate-y-full mt-[-12px] flex flex-col items-center min-w-[100px]';
        this.tooltip.style.willChange = 'top, left, opacity';
        document.body.appendChild(this.tooltip);
    }

    showTooltip(e, content) {
        if (!this.tooltip) return;
        this.tooltip.innerHTML = content;
        this.tooltip.classList.remove('opacity-0', 'scale-95', 'translate-y-2');
        this.updateTooltipPos(e);
    }

    hideTooltip() {
        if (this.tooltip) {
            this.tooltip.classList.add('opacity-0', 'scale-95', 'translate-y-2');
        }
    }

    updateTooltipPos(e) {
        if (!this.tooltip) return;
        const rect = this.tooltip.getBoundingClientRect();
        
        // Handle both MouseEvent and TouchEvent
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;

        // Smart positioning
        let left = clientX;
        let top = clientY - 16;

        // Boundary checks
        if (left - rect.width / 2 < 10) left = rect.width / 2 + 10;
        if (left + rect.width / 2 > window.innerWidth - 10) left = window.innerWidth - rect.width / 2 - 10;
        
        // Top boundary check - flip if too close to top
        if (top - rect.height < 10) {
            top = clientY + 30; // Move below finger/cursor
            this.tooltip.classList.add('flipped'); // Could use CSS to flip arrow
        } else {
            this.tooltip.classList.remove('flipped');
        }

        this.tooltip.style.left = `${left}px`;
        this.tooltip.style.top = `${top}px`;
    }

    safeDate(dateStr) {
        if (!dateStr) return new Date();
        let date;
        // Handle YYYY-MM-DD explicitly to prevent TZ issues
        if (typeof dateStr === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
            const parts = dateStr.split('-');
            date = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        } else {
            date = new Date(dateStr);
            if (isNaN(date.getTime())) {
                date = new Date(dateStr.replace(/-/g, '/'));
            }
        }
        return isNaN(date.getTime()) ? new Date() : date;
    }

    getDateKey(date) {
        return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
    }

    render(data, year = this.options.year) {
        this.lastData = data; // Store for resize
        this.options.year = year;
        
        this.container.innerHTML = '';
        // Clean container without heavy backgrounds
        this.container.className = "flex flex-col w-full select-none relative group items-center"; 

        // 1. Data Processing
        const counts = {};
        data.forEach(item => {
            const d = this.safeDate(item.date);
            const key = this.getDateKey(d);
            counts[key] = (counts[key] || 0) + 1;
        });

        // 2. Date Range Logic
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Normalize to midnight
        let startDate, endDate;
        
        const getDayAdjusted = (d) => {
            const day = d.getDay();
            return day === 0 ? 6 : day - 1; // Mon=0, Sun=6
        };

        // --- Responsive Logic ---
        // Detect mobile (or small container)
        const containerWidth = this.container.clientWidth || window.innerWidth;
        const isMobile = containerWidth < 640;
        
        // Adjust metrics for mobile
        let cellSize = isMobile ? 9 : this.options.cellSize;
        let cellGap = isMobile ? 3 : this.options.cellGap;
        const borderRadius = isMobile ? '2px' : this.options.borderRadius;

        if (year === 'rolling') {
            // Rolling 365 Days Logic (Aligned with Year Logic)
            // Instead of truncating weeks, we set a fixed 1-year range and let the scaler handle fit
            
            // End Date: Today
            endDate = new Date(today);
            
            // Start Date: 1 Year Ago (approx 52-53 weeks)
            startDate = new Date(today);
            startDate.setDate(today.getDate() - 365);
            
            // Adjust to start on correct day of week if needed, but simple -365 is usually fine for "rolling"
            // To be precise with the grid alignment (starts on Mon), we might want to align start date
            const startDayAdj = getDayAdjusted(startDate);
            startDate.setDate(startDate.getDate() - startDayAdj);

        } else {
            const y = parseInt(year);
            startDate = new Date(y, 0, 1);
            const startDayAdj = getDayAdjusted(startDate);
            startDate.setDate(startDate.getDate() - startDayAdj);

            // 当年：裁剪到今天，不显示未来的空日期
            if (y === today.getFullYear()) {
                endDate = new Date(today);
            } else {
                endDate = new Date(y, 11, 31);
            }
            const endDayAdj = getDayAdjusted(endDate);
            endDate.setDate(endDate.getDate() + (6 - endDayAdj));
        }

        const totalDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
        const weeks = Math.ceil(totalDays / 7);

        // Apply Dynamic Scaling to ALL views (including rolling)
        if (weeks > 0) {
            const labelWidth = isMobile ? 25 : 40;
            const availableWidth = containerWidth - labelWidth;
            const totalGridWidth = weeks * (cellSize + cellGap);
            
            // Only scale DOWN if needed, never scale up beyond default
            if (availableWidth > 0 && totalGridWidth > availableWidth) {
                const scale = availableWidth / totalGridWidth;
                const minCell = isMobile ? 6 : 7;
                const minGap = isMobile ? 2 : 3;
                cellSize = Math.max(minCell, Math.floor(cellSize * scale));
                cellGap = Math.max(minGap, Math.floor(cellGap * scale));
            }
        }

        // 3. Render Wrapper
        const wrapper = document.createElement('div');
        wrapper.className = "w-full flex flex-col";

        // --- Main Grid Area ---
        const scrollArea = document.createElement('div');
        scrollArea.className = "overflow-x-auto overflow-y-hidden relative max-w-full heatmap-scroll-area";
        
        const graphContainer = document.createElement('div');
        graphContainer.className = "flex flex-col w-fit mx-auto"; // FIXED: Use w-fit and mx-auto for centering, removed min-w-full

        // Month Labels Row（在顶部）
        const monthsRow = document.createElement('div');
        monthsRow.className = "flex text-[10px] text-slate-400 dark:text-white/25 mb-2 h-4 relative w-full font-bold uppercase tracking-widest heatmap-label opacity-60 border-b border-slate-100 dark:border-white/5 pb-1";

        // 左侧日标签与右侧网格并排容器
        const hRow = document.createElement('div');
        hRow.className = "flex"; // FIXED: Removed w-full to allow natural expansion
        hRow.style.gap = `${cellGap}px`;

        // Left Axis (Days)
        const dayLabels = document.createElement('div');
        dayLabels.className = "flex flex-col justify-start text-[10px] text-slate-300 dark:text-slate-600 font-medium heatmap-label shrink-0";
        dayLabels.style.gap = `${cellGap}px`;
        const gridHeight = (7 * cellSize) + (6 * cellGap);
        dayLabels.style.height = `${gridHeight}px`;

        const days = ['一', '', '三', '', '五', '', ''];
        days.forEach((d) => {
            const label = document.createElement('div');
            label.style.height = `${cellSize}px`;
            label.style.lineHeight = `${cellSize}px`;
            label.className = "text-right opacity-80 flex items-center justify-end";
            label.textContent = d;
            dayLabels.appendChild(label);
        });

        // The Grid（在右侧）
        const gridRow = document.createElement('div');
        gridRow.className = "flex";
        gridRow.style.gap = `${cellGap}px`;

        let currentDate = new Date(startDate);
        // Localized Month Names
        const monthNames = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
        let lastMonthIndex = -1;

        for (let w = 0; w < weeks; w++) {
            const col = document.createElement('div');
            col.className = "flex flex-col shrink-0"; // Prevent shrinking
            col.style.gap = `${cellGap}px`;

            // Month Logic
            let weekContainsFirst = false;
            let checkDate = new Date(currentDate);
            let weekMonthIndex = -1;

            for(let d=0; d<7; d++) {
                if (checkDate.getDate() === 1) {
                    weekContainsFirst = true;
                    weekMonthIndex = checkDate.getMonth();
                }
                checkDate.setDate(checkDate.getDate() + 1);
            }

            if (weekContainsFirst && weekMonthIndex !== -1 && weekMonthIndex !== lastMonthIndex) {
                this.addMonthLabel(monthsRow, monthNames[weekMonthIndex], w, cellSize, cellGap);
                lastMonthIndex = weekMonthIndex;
            } else if (w === 0) {
                this.addMonthLabel(monthsRow, monthNames[currentDate.getMonth()], 0, cellSize, cellGap);
                lastMonthIndex = currentDate.getMonth();
            }

            // Days
            for (let d = 0; d < 7; d++) {
                const key = this.getDateKey(currentDate);
                const count = counts[key] || 0;
                // Logic for "future" cells (no interaction, dimmed style)
                // BUT: If we are viewing a past year (e.g. 2025 when today is 2026), 
                // those dates are technically "past" relative to today, so they should show normally.
                // Logic: A cell is "future" ONLY if it is strictly after today.
                // If we are looking at 2025 and today is 2026-02-18, then all of 2025 is past.
                // If we are looking at 2026 and today is 2026-02-18, then 2026-03-01 is future.
                const isFuture = currentDate > today;

                const cell = document.createElement('div');
                cell.className = 'heatmap-cell relative';
                cell.style.width = `${cellSize}px`;
                cell.style.height = `${cellSize}px`;
                cell.style.borderRadius = borderRadius;
                cell.setAttribute('role', 'gridcell'); // A11y
                
                // Animation
                cell.style.animation = `cell-enter 0.6s cubic-bezier(0.2, 0.8, 0.2, 1) forwards`;
                cell.style.animationDelay = `${(w * 0.02) + (d * 0.01)}s`;
                cell.style.opacity = '0'; // Initial state for animation

                if (isFuture) {
                    cell.style.backgroundColor = 'rgba(255,255,255,.02)';
                    cell.style.opacity = '0.3';
                } else {
                    let level = 0;
                    if (count > 1) {
                        if (count >= 8) level = 6;
                        else if (count >= 6) level = 5;
                        else if (count >= 4) level = 4;
                        else if (count >= 2) level = 3;
                    }
                    if (count === 1) level = 3;

                    // 内联颜色，不再依赖 Tailwind CDN 动态类名
                    const isDark = document.documentElement.classList.contains('dark');
                    const palette = isDark ? this.options.colors.dark : this.options.colors.light;
                    cell.style.backgroundColor = palette[level] || palette[0];

                    if (key === `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`) {
                        cell.style.outline = '2px solid ' + (isDark ? '#5eead4' : '#0d9488');
                        cell.style.outlineOffset = '1px';
                    }
                    cell.setAttribute('data-level', level); // For Legend Interaction
                    
                    // Interaction
                    cell.classList.add('cursor-pointer');
                    
                    // Tooltip Content
                    const dateDisplay = currentDate.toLocaleDateString('zh-CN', {year:'numeric', month:'long', day:'numeric', weekday:'long'});
                    const tooltipText = this.options.tooltipFn 
                        ? this.options.tooltipFn(count, dateDisplay)
                        : `
                            <div class="font-bold text-sm mb-0.5">${count > 0 ? count + ' 个瞬间' : '无瞬间'}</div>
                            <div class="text-slate-400 font-normal opacity-80">${dateDisplay}</div>
                          `;
                    
                    cell.setAttribute('data-tooltip', tooltipText.replace(/"/g, '&quot;'));
                    cell.setAttribute('aria-label', `${count} moments on ${dateDisplay}`);
                    
                    // Events
                    cell.onmouseenter = (e) => this.showTooltip(e, cell.getAttribute('data-tooltip'));
                    cell.onmouseleave = () => this.hideTooltip();
                    cell.onmousemove = (e) => this.updateTooltipPos(e);
                    
                    // Touch Events for Mobile Tooltip
                    cell.addEventListener('touchstart', (e) => {
                        this.showTooltip(e, cell.getAttribute('data-tooltip'));
                    }, { passive: true });

                    const clickDate = new Date(currentDate);
                    if (this.options.onClick) {
                        cell.onclick = () => this.options.onClick(clickDate, count);
                    }
                }

                col.appendChild(cell);
                currentDate.setDate(currentDate.getDate() + 1);
            }
            gridRow.appendChild(col);
        }

        hRow.appendChild(dayLabels);
        hRow.appendChild(gridRow);
        graphContainer.appendChild(monthsRow);
        graphContainer.appendChild(hRow);
        scrollArea.appendChild(graphContainer);
        wrapper.appendChild(scrollArea);
        this.container.appendChild(wrapper);

        // Auto Scroll to End（仅保留给 rolling 模式，年份视图统一不自动滚动）
        if (year === 'rolling') {
            setTimeout(() => {
                scrollArea.scrollLeft = scrollArea.scrollWidth;
            }, 300);
        }
        
        this.renderLegend();
    }

    addMonthLabel(row, text, weekIndex, cellSize, cellGap) {
        const label = document.createElement('div');
        label.textContent = text;
        label.className = "absolute top-0 whitespace-nowrap transition-colors hover:text-blue-500 cursor-default select-none";
        const left = weekIndex * (cellSize + cellGap);
        label.style.left = `${left}px`;
        row.appendChild(label);
    }

    renderLegend() {
        return;
    }
}

if (typeof window !== 'undefined') {
    window.HeatmapChart = HeatmapChart;
}
