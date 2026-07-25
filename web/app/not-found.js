'use client';

import { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Footer from '@/components/Footer';

const GRID = 11;
const R = 14;
const GAP = 5;

export default function NotFound() {
    const canvasRef = useRef(null);
    const roleTextRef = useRef(null);
    const instructionRef = useRef(null);
    const msgElRef = useRef(null);
    const msgTextRef = useRef(null);
    const resetBtnRef = useRef(null);
    const switchBtnRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const roleText = roleTextRef.current;
        const instruction = instructionRef.current;
        const msgEl = msgElRef.current;
        const msgText = msgTextRef.current;

        let dots, catPos, gameState, playerRole, isAiTurn, moveCount;
        let txScale = 1, txOffX = 20, txOffY = 20;
        let aiTimer = null;

        function isDark() { return document.documentElement.classList.contains('dark'); }
        function dotColor() { return isDark() ? '#334155' : '#CBD5E1'; }
        function blockedColor() { return isDark() ? '#64748B' : '#94A3B8'; }

        function pos(x, y) {
            const ox = (y % 2) * (R + GAP / 2);
            return { x: x * (R * 2 + GAP) + ox, y: y * (R * 2 + GAP) * 0.866 };
        }

        function getNb(x, y) {
            const odd = y % 2 !== 0;
            const dirs = odd
                ? [[0, -1], [1, -1], [-1, 0], [1, 0], [0, 1], [1, 1]]
                : [[-1, -1], [0, -1], [-1, 0], [1, 0], [-1, 1], [0, 1]];
            return dirs.map((d) => ({ x: x + d[0], y: y + d[1] })).filter((n) => n.x >= 0 && n.x < GRID && n.y >= 0 && n.y < GRID);
        }

        function edge(p) { return p.x === 0 || p.x === GRID - 1 || p.y === 0 || p.y === GRID - 1; }

        function bfs(start) {
            const q = [{ x: start.x, y: start.y, path: [] }];
            const v = new Set([`${start.x},${start.y}`]);
            while (q.length) {
                const { x, y, path } = q.shift();
                if (edge({ x, y })) return path;
                for (const n of getNb(x, y)) {
                    if (!dots[n.y][n.x].blocked && !v.has(`${n.x},${n.y}`)) {
                        v.add(`${n.x},${n.y}`);
                        q.push({ x: n.x, y: n.y, path: [...path, { x: n.x, y: n.y }] });
                    }
                }
            }
            return null;
        }

        function bfsDist(start) {
            const q = [{ x: start.x, y: start.y, d: 0 }];
            const v = new Set([`${start.x},${start.y}`]);
            while (q.length) {
                const { x, y, d } = q.shift();
                if (edge({ x, y })) return d;
                for (const n of getNb(x, y)) {
                    if (!dots[n.y][n.x].blocked && !v.has(`${n.x},${n.y}`)) {
                        v.add(`${n.x},${n.y}`);
                        q.push({ x: n.x, y: n.y, d: d + 1 });
                    }
                }
            }
            return null;
        }

        function updateRoleUI() {
            const dist = bfsDist(catPos);
            const distStr = dist ? ` · 距边缘 ${dist} 步` : ' · 已被围困！';
            if (playerRole === 'catcher') {
                instruction.textContent = `点击背景围住小猫，别让它跑掉！${distStr}`;
                roleText.textContent = '切换: 扮演小猫';
            } else {
                instruction.textContent = `点击相邻格子移动小猫，逃离抓捕！${distStr}`;
                roleText.textContent = '切换: 扮演抓捕者';
            }
        }

        function resize() {
            const pw = canvas.parentElement.clientWidth;
            const ph = canvas.parentElement.clientHeight;
            canvas.width = pw; canvas.height = ph;
            const cw = GRID * (R * 2 + GAP) + R;
            const ch = GRID * (R * 2 + GAP) * 0.866 + R;
            txScale = Math.min((pw - 30) / cw, (ph - 30) / ch);
            txOffX = (pw - cw * txScale) / 2;
            txOffY = (ph - ch * txScale) / 2;
            ctx.setTransform(txScale, 0, 0, txScale, txOffX, txOffY);
        }

        function draw() {
            ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.restore();
            ctx.setTransform(txScale, 0, 0, txScale, txOffX, txOffY);

            const dc = dotColor(), bc = blockedColor();
            const catCol = playerRole === 'cat' ? '#ec4899' : '#ef4444';

            for (let y = 0; y < GRID; y++) {
                for (let x = 0; x < GRID; x++) {
                    const d = dots[y][x];
                    const p = pos(x, y);
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, R, 0, Math.PI * 2);
                    ctx.fillStyle = d.blocked ? bc : dc;
                    ctx.fill();
                }
            }

            if (playerRole === 'cat' && gameState === 'playing' && !isAiTurn) {
                getNb(catPos.x, catPos.y).forEach((n) => {
                    if (!dots[n.y][n.x].blocked) {
                        const p = pos(n.x, n.y);
                        ctx.beginPath();
                        ctx.arc(p.x, p.y, R, 0, Math.PI * 2);
                        ctx.fillStyle = 'rgba(236,72,153,.35)';
                        ctx.fill();
                    }
                });
            }

            const cp = pos(catPos.x, catPos.y);
            ctx.beginPath(); ctx.arc(cp.x, cp.y, R * 0.8, 0, Math.PI * 2);
            ctx.fillStyle = catCol; ctx.fill();
            ctx.fillStyle = '#fff';
            ctx.beginPath(); ctx.arc(cp.x - 4, cp.y - 2, 2.5, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(cp.x + 4, cp.y - 2, 2.5, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(cp.x, cp.y + 2, 1.5, 0, Math.PI * 2); ctx.fill();
        }

        function getGrid(px, py) {
            const rx = (px - txOffX) / txScale;
            const ry = (py - txOffY) / txScale;
            let best = null, min = Infinity;
            for (let y = 0; y < GRID; y++) {
                for (let x = 0; x < GRID; x++) {
                    const p = pos(x, y);
                    const d = Math.sqrt((p.x - rx) ** 2 + (p.y - ry) ** 2);
                    if (d < R + 2 && d < min) { min = d; best = { x, y }; }
                }
            }
            return best;
        }

        function showMsg(text, bg) {
            msgText.textContent = text;
            msgText.style.background = bg;
            msgEl.style.opacity = '1';
            msgEl.style.pointerEvents = 'auto';
            msgText.style.transform = 'scale(1)';
        }
        function hideMsg() {
            msgEl.style.opacity = '0';
            msgEl.style.pointerEvents = 'none';
            msgText.style.transform = 'scale(0)';
        }

        function checkTrapped() {
            if (!bfs(catPos)) { end('catcher_win'); return true; }
            return false;
        }

        function end(result) {
            if (playerRole === 'catcher') {
                result === 'cat_win' ? showMsg(`小猫跑掉了！(${moveCount}步)`, '#ef4444') : showMsg(`你抓住了小猫！(${moveCount}步)`, '#10B981');
            } else {
                result === 'cat_win' ? showMsg(`你逃脱了！(${moveCount}步)`, '#10B981') : showMsg(`你被抓住了！(${moveCount}步)`, '#ef4444');
            }
            gameState = 'over';
        }

        function aiCat() {
            const path = bfs(catPos);
            if (path && path.length) {
                const bestLen = path.length;
                const candidates = [];
                for (const n of getNb(catPos.x, catPos.y)) {
                    if (dots[n.y][n.x].blocked) continue;
                    const oldCat = catPos;
                    catPos = n;
                    const p = bfs(catPos);
                    catPos = oldCat;
                    if (p && p.length === bestLen - 1) candidates.push(n);
                }
                catPos = candidates.length ? candidates[Math.floor(Math.random() * candidates.length)] : path[0];
                if (edge(catPos)) end('cat_win');
            } else {
                const nb = getNb(catPos.x, catPos.y).filter((n) => !dots[n.y][n.x].blocked);
                if (!nb.length) end('catcher_win');
                else {
                    let best = nb[0], bestOpen = -1;
                    for (const n of nb) {
                        const open = getNb(n.x, n.y).filter((m) => !dots[m.y][m.x].blocked).length;
                        if (open > bestOpen) { bestOpen = open; best = n; }
                    }
                    catPos = best;
                }
            }
            moveCount++;
            updateRoleUI();
            draw();
            if (!checkTrapped()) isAiTurn = false;
        }

        function aiBlock() {
            const path = bfs(catPos);
            let tgt = null, bestScore = -Infinity;

            const candidates = new Set();
            if (path && path.length) {
                candidates.add(`${path[0].x},${path[0].y}`);
                if (path.length > 1) candidates.add(`${path[1].x},${path[1].y}`);
            }
            getNb(catPos.x, catPos.y).filter((n) => !dots[n.y][n.x].blocked).forEach((n) => candidates.add(`${n.x},${n.y}`));

            for (const key of candidates) {
                const [cx, cy] = key.split(',').map(Number);
                if (dots[cy][cx].blocked) continue;
                if (cx === catPos.x && cy === catPos.y) continue;

                dots[cy][cx].blocked = true;
                const newDist = bfsDist(catPos);
                dots[cy][cx].blocked = false;

                let score;
                if (newDist === null) score = 999;
                else score = newDist * 10 - Math.abs(cx - GRID / 2) * 0.1;
                if (score > bestScore) { bestScore = score; tgt = { x: cx, y: cy }; }
            }

            if (!tgt) {
                const nb = getNb(catPos.x, catPos.y).filter((n) => !dots[n.y][n.x].blocked);
                if (nb.length) tgt = nb[Math.floor(Math.random() * nb.length)];
            }

            if (tgt && !dots[tgt.y][tgt.x].blocked) dots[tgt.y][tgt.x].blocked = true;
            updateRoleUI();
            draw();
            if (!checkTrapped() && !getNb(catPos.x, catPos.y).filter((n) => !dots[n.y][n.x].blocked).length) end('catcher_win');
            if (gameState === 'playing') isAiTurn = false;
        }

        function init() {
            dots = [];
            catPos = { x: Math.floor(GRID / 2), y: Math.floor(GRID / 2) };
            gameState = 'playing'; isAiTurn = false; moveCount = 0;
            hideMsg();

            for (let y = 0; y < GRID; y++) {
                const row = [];
                for (let x = 0; x < GRID; x++) {
                    let blocked = false;
                    if (Math.random() < 0.12) {
                        const dist = Math.abs(x - catPos.x) + Math.abs(y - catPos.y);
                        if (dist > 1) blocked = true;
                    }
                    row.push({ x, y, blocked });
                }
                dots.push(row);
            }

            if (!bfs(catPos)) {
                getNb(catPos.x, catPos.y).forEach((n) => { dots[n.y][n.x].blocked = false; });
                dots[catPos.y][catPos.x].blocked = false;
            }

            updateRoleUI();
            resize();
            requestAnimationFrame(draw);
        }

        function switchRole() {
            playerRole = playerRole === 'catcher' ? 'cat' : 'catcher';
            init();
        }

        function onCanvasClick(e) {
            if (gameState !== 'playing' || isAiTurn) return;
            const rect = canvas.getBoundingClientRect();
            const gp = getGrid(e.clientX - rect.left, e.clientY - rect.top);
            if (!gp) return;

            if (playerRole === 'catcher') {
                const d = dots[gp.y][gp.x];
                if (!d.blocked && (gp.x !== catPos.x || gp.y !== catPos.y)) {
                    d.blocked = true; draw();
                    if (!checkTrapped()) {
                        if (!getNb(catPos.x, catPos.y).filter((n) => !dots[n.y][n.x].blocked).length) end('catcher_win');
                        else { isAiTurn = true; aiTimer = setTimeout(aiCat, 180); }
                    }
                }
            } else if (getNb(catPos.x, catPos.y).some((n) => n.x === gp.x && n.y === gp.y) && !dots[gp.y][gp.x].blocked) {
                catPos = gp; moveCount++; updateRoleUI(); draw();
                if (edge(catPos)) end('cat_win');
                else if (!checkTrapped()) { isAiTurn = true; aiTimer = setTimeout(aiBlock, 180); }
            }
        }

        function onResize() { resize(); draw(); }

        canvas.addEventListener('click', onCanvasClick);
        window.addEventListener('resize', onResize);
        const themeObserver = new MutationObserver(() => draw());
        themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

        const resetBtn = resetBtnRef.current;
        const switchBtn = switchBtnRef.current;
        resetBtn?.addEventListener('click', init);
        switchBtn?.addEventListener('click', switchRole);

        playerRole = 'catcher';
        init();

        return () => {
            canvas.removeEventListener('click', onCanvasClick);
            window.removeEventListener('resize', onResize);
            themeObserver.disconnect();
            resetBtn?.removeEventListener('click', init);
            switchBtn?.removeEventListener('click', switchRole);
            if (aiTimer) clearTimeout(aiTimer);
        };
    }, []);

    return (
        <>
            <main className="flex flex-1 flex-col items-center justify-center px-4 py-16 text-center">
                <Badge variant="outline" className="mb-3 text-[0.62rem] font-semibold tracking-widest text-muted-foreground uppercase">
                    404 · Not Found
                </Badge>

                <h1 className="mb-1 text-8xl leading-none font-bold tracking-tight select-none sm:text-9xl">404</h1>

                <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">你寻找的页面已星间蒸发，或是从未存在过。</p>
                <p className="mt-1 mb-4 text-xs text-muted-foreground/70">来玩一局围猫游戏放松一下吧。</p>

                <div className="w-full max-w-sm rounded-2xl border bg-card p-3 pb-2">
                    <div className="mb-1.5 flex flex-wrap items-center justify-between gap-1.5">
                        <span ref={roleTextRef} className="text-xs font-medium text-muted-foreground">切换: 扮演小猫</span>
                        <div className="flex flex-wrap gap-2">
                            <Button ref={switchBtnRef} size="sm" variant="default">切换角色</Button>
                            <Button ref={resetBtnRef} size="sm" variant="outline">重新开始</Button>
                        </div>
                    </div>

                    <p ref={instructionRef} className="mb-1.5 text-center text-xs font-medium text-muted-foreground">点击背景围住小猫，别让它跑掉！</p>

                    <div className="relative aspect-square w-full touch-none rounded-lg border bg-muted select-none">
                        <canvas ref={canvasRef} className="h-full w-full cursor-pointer" />
                        <div
                            ref={msgElRef}
                            role="alert"
                            style={{ opacity: 0, pointerEvents: 'none' }}
                            className="absolute inset-0 z-10 flex items-center justify-center transition-opacity duration-300"
                        >
                            <span
                                ref={msgTextRef}
                                style={{ transform: 'scale(0)' }}
                                className="rounded-full px-6 py-2.5 text-xl font-bold text-white shadow-lg transition-transform duration-300"
                            />
                        </div>
                    </div>
                </div>
            </main>

            <Footer pageId="404" />
        </>
    );
}
